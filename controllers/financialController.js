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
import { Transaction, FinancialLedger, Member, Asset } from "../models/index.js";
import { Op } from "sequelize";

export const financialReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.transactionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const transactions = await Transaction.findAll({
      where,
      order: [['transactionDate', 'DESC']],
      limit: 100
    });
    
    // Calculate totals from actual transactions
    const revenueTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: { [Op.in]: ['sale', 'remittance'] }
      }
    });
    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenseTransactions = await Transaction.findAll({
      where: {
        ...where,
        transactionType: { [Op.in]: ['distribution', 'payment'] }
      }
    });
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    res.render("admin/financial-reports", {
      title: "Financial Reports",
      transactions: transactions || [],
      startDate: startDate || '',
      endDate: endDate || '',
      totals: {
        revenue: totalRevenue || 0,
        expenses: totalExpenses || 0,
        net: (totalRevenue || 0) - (totalExpenses || 0)
      }
    });
  } catch (error) {
    req.flash("error_msg", "Error loading financial reports: " + error.message);
    res.render("admin/financial-reports", {
      title: "Financial Reports",
      transactions: [],
      startDate: '',
      endDate: '',
      totals: { revenue: 0, expenses: 0, net: 0 }
    });
  }
};

export const balanceSheet = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    // Fixed Assets from asset table
    const assets = await Asset.findAll({ where: { status: 'active' } });
    const totalFixedAssets = (assets || []).reduce((sum, asset) =>
      sum + parseFloat(asset.currentValue || 0), 0
    );

    // Cash = total sales revenue (from Sale model)
    const { Sale } = await import('../models/index.js');
    const salesCash = await Sale.sum('total', {
      where: { orderDate: { [Op.lte]: reportDate } }
    }) || 0;

    // Also add transaction-based revenue as fallback
    const revenueTransactions = await Transaction.findAll({
      where: {
        transactionType: { [Op.in]: ['sale', 'remittance'] },
        transactionDate: { [Op.lte]: reportDate }
      }
    });
    const txCash = (revenueTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const cashBalance = salesCash + txCash;

    // Liabilities (loans)
    const members = await Member.findAll();
    const totalLoans = (members || []).reduce((sum, m) => sum + parseFloat(m.loanBalance || 0), 0);

    // Equity (share capital)
    const totalShares = (members || []).reduce((sum, m) => sum + parseFloat(m.shareBalance || 0), 0);
    
    res.render("admin/balance-sheet", {
      title: "Balance Sheet",
      reportDate,
      assets: {
        cash: cashBalance || 0,
        fixed: totalFixedAssets || 0,
        total: (cashBalance || 0) + (totalFixedAssets || 0)
      },
      liabilities: {
        loans: totalLoans || 0,
        total: totalLoans || 0
      },
      equity: {
        shares: totalShares || 0,
        total: totalShares || 0
      }
    });
  } catch (error) {
    req.flash("error_msg", "Error generating balance sheet: " + error.message);
    const reportDate = new Date();
    res.render("admin/balance-sheet", {
      title: "Balance Sheet",
      reportDate,
      assets: { cash: 0, fixed: 0, total: 0 },
      liabilities: { loans: 0, total: 0 },
      equity: { shares: 0, total: 0 }
    });
  }
};

export const calculateDividends = async (req, res) => {
  try {
    const { year, dividendRate, patronageRate } = req.body;
    
    // Get total net profit for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const revenueTransactions = await Transaction.findAll({
      where: {
        transactionType: { [Op.in]: ['sale', 'remittance'] },
        transactionDate: { [Op.between]: [startDate, endDate] }
      }
    });
    const revenue = (revenueTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const expenseTransactions = await Transaction.findAll({
      where: {
        transactionType: { [Op.in]: ['distribution', 'payment'] },
        transactionDate: { [Op.between]: [startDate, endDate] }
      }
    });
    const expenses = (expenseTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const netProfit = revenue - expenses;
    const dividendAmount = (netProfit * parseFloat(dividendRate)) / 100;
    const patronageAmount = (netProfit * parseFloat(patronageRate)) / 100;
    
    // Get all active members with their share balance and transaction volume
    const members = await Member.findAll({
      where: { status: 'active' }
    });
    
    // Calculate total shares for proportional distribution
    const totalShares = (members || []).reduce((sum, m) => sum + parseFloat(m.shareBalance || 0), 0) || 1;
    
    const memberDividends = await Promise.all((members || []).map(async member => {
      const shareBalance = parseFloat(member.shareBalance || 0);
      const shareRatio = totalShares > 0 ? shareBalance / totalShares : 0;
      const memberDividend = dividendAmount * shareRatio;

      // Patronage refund: fixed 5% of share balance per year
      const memberPatronage = shareBalance * 0.05;

      // Persist the computed patronage refund back to the member record
      await member.update({ patronageRefundAccrued: memberPatronage });

      return {
        member,
        shareRatio,
        dividend: memberDividend || 0,
        patronage: memberPatronage || 0,
        total: (memberDividend || 0) + (memberPatronage || 0)
      };
    }));
    
    res.render("admin/dividends", {
      title: "Dividend & Patronage Calculation",
      year: year || new Date().getFullYear(),
      netProfit: netProfit || 0,
      dividendRate: parseFloat(dividendRate) || 0,
      patronageRate: parseFloat(patronageRate) || 0,
      memberDividends: memberDividends || []
    });
  } catch (error) {
    req.flash("error_msg", "Error calculating dividends: " + error.message);
    res.redirect("/admin/financial");
  }
};

export const assetList = async (req, res) => {
  try {
    const assets = await Asset.findAll({
      order: [['name', 'ASC']]
    });
    
    res.render("admin/assets", {
      title: "Asset Management",
      assets: assets || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading assets: " + error.message);
    res.render("admin/assets", {
      title: "Asset Management",
      assets: []
    });
  }
};

export const createAsset = async (req, res) => {
  try {
    const { name, type, description, purchaseDate, purchasePrice, currentValue } = req.body;
    
    await Asset.create({
      name,
      type,
      description,
      purchaseDate: purchaseDate || null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      currentValue: currentValue ? parseFloat(currentValue) : null,
      status: 'active'
    });
    
    req.flash("success_msg", "Asset created successfully");
    res.redirect("/admin/assets");
  } catch (error) {
    req.flash("error_msg", "Error creating asset: " + error.message);
    res.redirect("/admin/assets");
  }
};

