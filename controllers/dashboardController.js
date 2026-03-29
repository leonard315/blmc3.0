/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
import { Member, InventoryItem, Transaction, SupplyRequest, Inquiry } from "../models/index.js";
import { Op } from "sequelize";

export const adminDashboard = async (req, res) => {
  try {
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'active' } });
    const pendingMembers = await Member.count({ where: { status: 'pending' } });
    const delinquentMembers = await Member.count({ where: { status: 'delinquent' } });
    
    // Low stock items
    const allItems = await InventoryItem.findAll();
    const lowStockItems = allItems.filter(item => 
      parseFloat(item.currentStock) < parseFloat(item.reorderPoint)
    );
    
    // Requests: total count
    const totalRequests = await SupplyRequest.count();
    // Pending: requests where receipt not sent
    const pendingRequests = await SupplyRequest.count({ where: { receiptSent: false } });
    
    // Recent transactions
    const recentTransactions = await Transaction.findAll({
      limit: 10,
      order: [['transactionDate', 'DESC']]
    });
    
    // Sales aggregation
    const { Sale } = await import('../models/index.js');
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth()+1, 1);
    const firstOfYear = new Date(today.getFullYear(), 0, 1);

    // Daily sales: sum for today, resets every day
    const dailySales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: today, [Op.lt]: tomorrow } }
    }) || 0;
    
    // Monthly sales for current month
    const currentMonthSales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: firstOfMonth, [Op.lt]: nextMonth } }
    }) || 0;
    
    // Annual sales for current year
    const annualSales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: firstOfYear } }
    }) || 0;
    
    // Monthly sales: group by month for the current year (for chart)
    const { sequelize } = await import('../models/salesModel.js');
    const monthlySalesRaw = await Sale.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('orderDate')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total']
      ],
      where: { orderDate: { [Op.gte]: firstOfYear, [Op.lt]: tomorrow } },
      group: [sequelize.fn('MONTH', sequelize.col('orderDate'))],
      order: [[sequelize.fn('MONTH', sequelize.col('orderDate')), 'ASC']],
      raw: true
    });
    
    const monthlySalesData = Array(12).fill(0);
    monthlySalesRaw.forEach(row => {
      const m = Number(row.month);
      if (m >= 1 && m <= 12) monthlySalesData[m-1] = Number(row.total);
    });

    // Monthly requests: group by month for the current year (for chart)
    const monthlyRequestsRaw = await SupplyRequest.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: { [Op.gte]: firstOfYear } },
      group: [sequelize.fn('MONTH', sequelize.col('createdAt'))],
      order: [[sequelize.fn('MONTH', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    const monthlyRequestsData = Array(12).fill(0);
    monthlyRequestsRaw.forEach(row => {
      const m = Number(row.month);
      if (m >= 1 && m <= 12) monthlyRequestsData[m-1] = Number(row.count);
    });

    // Pending applicants (inquiries not yet approved/rejected)
    const pendingApplicants = await Inquiry.count({
      where: { status: 'pending' }
    });

    const revenue = await Sale.sum('total') || 0;

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats: {
        totalMembers,
        activeMembers,
        pendingMembers,
        delinquentMembers,
        requests: totalRequests,
        pendingRequests,
        pendingApplicants,
        dailySales,
        monthlySales: currentMonthSales,
        annualSales,
        revenue,
        lowStockCount: lowStockItems.length,
        currentYear: today.getFullYear()
      },
      chartData: {
        monthlySales: JSON.stringify(monthlySalesData),
        monthlyRequests: JSON.stringify(monthlyRequestsData)
      },
      lowStockItems,
      recentTransactions
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash("error_msg", "Error loading dashboard: " + error.message);
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats: { pendingApplicants: 0, currentYear: new Date().getFullYear() },
      chartData: {
        monthlySales: JSON.stringify(Array(12).fill(0)),
        monthlyRequests: JSON.stringify(Array(12).fill(0))
      },
      lowStockItems: [],
      recentTransactions: []
    });
  }
};

export const memberDashboard = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const member = await Member.findOne({ where: { memberId } });
    
    if (!member) {
      req.flash("error_msg", "Member not found");
      return res.redirect("/member/login");
    }
    
    // Get member's recent production logs
    const { ProductionLog } = await import("../models/index.js");
    const recentLogs = await ProductionLog.findAll({
      where: { memberId },
      limit: 5,
      order: [['logDate', 'DESC']]
    });
    
    // Get total supply requests for member (since status is removed)
    const myPendingRequests = await SupplyRequest.count({
      where: { memberId }
    });
    
    // Get unread notifications
    const { Notification, NotificationRead } = await import("../models/index.js");
    const { sequelize } = await import("../models/notificationModel.js");
    
    // MySQL JSON query - get notifications for this member
    const allNotifications = await Notification.findAll({
      where: {
        published: true,
        [Op.or]: [
          { targetAudience: 'all' },
          { targetAudience: 'members' },
          sequelize.literal(`targetAudience = 'specific' AND JSON_CONTAINS(specificMemberIds, '"${memberId}"')`)
        ]
      }
    });
    const readNotifications = await NotificationRead.findAll({
      where: { memberId }
    });
    const readIds = readNotifications.map(r => r.notificationId);
    const unreadCount = allNotifications.filter(n => !readIds.includes(n.id)).length;
    
    // If member is fully verified/active, ensure shareBalance is 10000 for display
    let memberForView = { ...member.toJSON() };
    if ((memberForView.status === 'active' || memberForView.verified) && (!memberForView.shareBalance || memberForView.shareBalance < 10000)) {
      memberForView.shareBalance = 10000;
    }

    // Auto-compute patronage refund: 5% of annual purchases (not share balance)
    // Only update if not already set by POS patronage computation
    if (!memberForView.patronageRefundAccrued || parseFloat(memberForView.patronageRefundAccrued) === 0) {
      const { FinancialLedger } = await import("../models/index.js");
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearEnd = new Date(new Date().getFullYear() + 1, 0, 1);
      const supplyEntries = await FinancialLedger.findAll({
        where: { memberId, category: 'supply', entryType: 'debit', ledgerDate: { [Op.between]: [yearStart, yearEnd] } },
        attributes: ['amount']
      });
      const annualPurchases = supplyEntries.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      const computedPatronage = annualPurchases * 0.05;
      memberForView.patronageRefundAccrued = computedPatronage;
    }

    res.render("member/dashboard", {
      title: "Member Dashboard",
      member: memberForView,
      recentLogs,
      myPendingRequests,
      unreadNotifications: unreadCount
    });
  } catch (error) {
    req.flash("error_msg", "Error loading dashboard: " + error.message);
    res.redirect("/member/login");
  }
};

