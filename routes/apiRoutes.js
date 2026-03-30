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
import express from "express";
import { Member, ProductionLog, BiosecurityCheck, FinancialLedger, Transaction, Notification, NotificationRead } from "../models/index.js";
import { createInquiry, getInquiryDetail, updateInquiryStatus, updateInquiryStep } from "../controllers/inquiryController.js";
import { inventoryItemsApi } from "../controllers/inventoryController.js";
import { getPosInventory, searchMembers } from "../controllers/salesController.js";
import { sendSenderVerification, confirmSenderVerification } from "../controllers/mailerController.js";
import { Op } from "sequelize";
import multer from "multer";
import path from "path";
import fs from 'fs';

const router = express.Router();

// configure uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'-')); }
});
const upload = multer({ storage });

// Middleware to authenticate API requests (using member ID from session or token)
const authenticateMember = async (req, res, next) => {
  const memberId = req.headers['x-member-id'] || req.body.memberId || req.session?.memberId;
  
  if (!memberId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const member = await Member.findOne({ where: { memberId } });
  if (!member || member.status !== 'active') {
    return res.status(403).json({ error: "Invalid or inactive member" });
  }
  
  req.memberId = memberId;
  next();
};

// Production Log API - supports offline sync
router.post("/production-log", authenticateMember, async (req, res) => {
  try {
    const { logDate, feedIntake, mortalityRate, mortalityCount, eggYield, harvestYield, notes, syncId } = req.body;
    
    const log = await ProductionLog.create({
      memberId: req.memberId,
      logDate: logDate ? new Date(logDate) : new Date(),
      feedIntake: feedIntake ? parseFloat(feedIntake) : null,
      mortalityRate: mortalityRate ? parseFloat(mortalityRate) : null,
      mortalityCount: mortalityCount ? parseInt(mortalityCount) : null,
      eggYield: eggYield ? parseInt(eggYield) : null,
      harvestYield: harvestYield ? parseFloat(harvestYield) : null,
      notes,
      synced: true
    });
    
    res.json({ success: true, log, syncId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch sync for offline logs
router.post("/production-log/batch", authenticateMember, async (req, res) => {
  try {
    const { logs } = req.body; // Array of log objects
    
    const syncedLogs = [];
    for (const logData of logs) {
      const log = await ProductionLog.create({
        memberId: req.memberId,
        logDate: logData.logDate ? new Date(logData.logDate) : new Date(),
        feedIntake: logData.feedIntake ? parseFloat(logData.feedIntake) : null,
        mortalityRate: logData.mortalityRate ? parseFloat(logData.mortalityRate) : null,
        mortalityCount: logData.mortalityCount ? parseInt(logData.mortalityCount) : null,
        eggYield: logData.eggYield ? parseInt(logData.eggYield) : null,
        harvestYield: logData.harvestYield ? parseFloat(logData.harvestYield) : null,
        notes: logData.notes,
        synced: true
      });
      syncedLogs.push(log);
    }
    
    res.json({ success: true, count: syncedLogs.length, logs: syncedLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Biosecurity Check API
router.post("/biosecurity-check", authenticateMember, async (req, res) => {
  try {
    const { checkDate, temperature, sanitationStatus, visualHealthCheck, issues, actionsTaken, syncId } = req.body;
    
    const check = await BiosecurityCheck.create({
      memberId: req.memberId,
      checkDate: checkDate ? new Date(checkDate) : new Date(),
      temperature: temperature ? parseFloat(temperature) : null,
      sanitationStatus,
      visualHealthCheck,
      issues,
      actionsTaken,
      synced: true
    });
    
    res.json({ success: true, check, syncId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get member ledger
router.get("/ledger", authenticateMember, async (req, res) => {
  try {
    const ledger = await FinancialLedger.findAll({
      where: { memberId: req.memberId },
      order: [['ledgerDate', 'DESC']]
    });
    
    res.json({ success: true, ledger });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get remittances
router.get("/remittances", authenticateMember, async (req, res) => {
  try {
    const remittances = await Transaction.findAll({
      where: {
        memberId: req.memberId,
        transactionType: 'remittance'
      },
      order: [['transactionDate', 'DESC']]
    });
    
    res.json({ success: true, remittances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications
router.get("/notifications", authenticateMember, async (req, res) => {
  try {
    const { sequelize } = await import("../models/notificationModel.js");
    const notifications = await Notification.findAll({
      where: {
        published: true,
        [Op.or]: [
          { targetAudience: 'all' },
          { targetAudience: 'members' },
          sequelize.literal(`targetAudience = 'specific' AND JSON_CONTAINS(specificMemberIds, '"${req.memberId}"')`)
        ]
      },
      order: [['publishedAt', 'DESC']],
      limit: 50
    });
    
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public API to get inventory items (for admin counter modal)
router.get('/inventory/items', async (req, res) => {
  return inventoryItemsApi(req, res);
});

// POS inventory catalog (in-stock items only)
router.get('/inventory/pos-items', getPosInventory);

// POS member search
router.get('/members/search', searchMembers);

// POS all active members
router.get('/members/all', async (req, res) => {
  try {
    const { Member } = await import('../models/index.js');
    const members = await Member.findAll({
      where: { status: 'active' },
      attributes: ['memberId', 'firstName', 'lastName', 'loanBalance', 'shareBalance', 'patronageRefundAccrued'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    res.json(members);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Live member detail by memberId
router.get('/members/detail/:memberId', async (req, res) => {
  try {
    const { Member } = await import('../models/index.js');
    const member = await Member.findOne({
      where: { memberId: req.params.memberId },
      attributes: ['memberId', 'firstName', 'lastName', 'loanBalance', 'shareBalance', 'patronageRefundAccrued']
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get member profile
router.get("/profile", authenticateMember, async (req, res) => {
  try {
    const member = await Member.findOne({ 
      where: { memberId: req.memberId },
      attributes: { exclude: ['password'] }
    });
    
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public inquiry submission (allows picture upload)
router.post('/inquiry', upload.single('picture'), createInquiry);

// Simple system-connected chat endpoint (rule-based assistant)
router.post('/chat', authenticateMember, async (req, res) => {
  try {
    const message = (req.body.message || '').toString().trim();
    if (!message) return res.status(400).json({ error: 'Message required' });

    const member = await Member.findOne({ where: { memberId: req.memberId } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const msg = message.toLowerCase();
    const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    // Greeting
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return res.json({ 
        success: true, 
        reply: `Hello ${member.firstName}! 👋 I'm your BLMC Assistant. I can help you with:\n• Check balances\n• View production logs\n• Check pending requests\n• View notifications\n\nWhat would you like to know?` 
      });
    }

    // Balance inquiry
    if (msg.includes('balance') || msg.includes('balances') || msg.includes('share') || msg.includes('loan') || msg.includes('money')) {
      const share = formatter.format(member.shareBalance || 0);
      const loan = formatter.format(member.loanBalance || 0);
      const refund = formatter.format(member.patronageRefundAccrued || 0);
      return res.json({ 
        success: true, 
        reply: `💰 Your Financial Summary:\n\n📊 Share Balance: ${share}\n💳 Loan Balance: ${loan}\n🎁 Patronage Refund: ${refund}\n\nNeed more details? Visit your Ledger page!` 
      });
    }

    // Production logs
    if (msg.includes('production') || msg.includes('log') || msg.includes('egg') || msg.includes('feed')) {
      const latest = await ProductionLog.findOne({ 
        where: { memberId: req.memberId }, 
        order: [['logDate', 'DESC']] 
      });
      
      if (latest) {
        const date = new Date(latest.logDate).toLocaleDateString('en-PH');
        return res.json({ 
          success: true, 
          reply: `📝 Latest Production Log (${date}):\n\n🥚 Eggs: ${latest.eggYield || 'N/A'}\n🌾 Feed: ${latest.feedIntake || 'N/A'}kg\n💀 Mortality: ${latest.mortalityCount || 0}\n📋 Notes: ${latest.notes || 'None'}\n\nView full history in Production History page!` 
        });
      }
      return res.json({ 
        success: true, 
        reply: '📝 No production logs found yet. Start logging your daily production to track your progress!' 
      });
    }

    // Pending requests
    if (msg.includes('request') || msg.includes('pending') || msg.includes('reserve') || msg.includes('order')) {
      const { SupplyRequest } = await import("../models/supplyRequestModel.js");
      const pending = await SupplyRequest.count({ 
        where: { 
          memberId: req.memberId, 
          status: 'pending' 
        } 
      });
      
      return res.json({ 
        success: true, 
        reply: `📦 You have ${pending} pending supply ${pending === 1 ? 'request' : 'requests'}.\n\n${pending > 0 ? 'Check the Reserves page for details!' : 'Need supplies? Visit the Supply Request page to place an order.'}` 
      });
    }

    // Notifications
    if (msg.includes('notification') || msg.includes('news') || msg.includes('announcement')) {
      const unread = await NotificationRead.count({
        where: { 
          memberId: req.memberId,
          readAt: null 
        }
      });
      
      return res.json({ 
        success: true, 
        reply: `🔔 You have ${unread} unread ${unread === 1 ? 'notification' : 'notifications'}.\n\nCheck the Notifications page to stay updated!` 
      });
    }

    // Help
    if (msg.includes('help') || msg.includes('what can you do') || msg.includes('commands')) {
      return res.json({ 
        success: true, 
        reply: `🤖 I can help you with:\n\n💰 "Check my balance" - View financial summary\n📝 "Show production logs" - Latest production data\n📦 "Pending requests" - Check supply orders\n🔔 "Notifications" - Unread messages\n👋 "Hello" - Greet me!\n\nJust ask naturally, I'll understand!` 
      });
    }

    // Contact/support
    if (msg.includes('contact') || msg.includes('support') || msg.includes('help me') || msg.includes('problem')) {
      return res.json({ 
        success: true, 
        reply: `📞 Need assistance?\n\nContact BLMC Admin:\n📧 Email: admin@blmc.local\n📱 Visit the office during business hours\n\nFor technical issues, use the Feedback page to report problems.` 
      });
    }

    // Thank you
    if (msg.includes('thank') || msg.includes('thanks')) {
      return res.json({ 
        success: true, 
        reply: `You're welcome, ${member.firstName}! 😊 Happy to help anytime!` 
      });
    }

    // Default fallback
    return res.json({ 
      success: true, 
      reply: `🤔 I'm not sure about that. Try asking:\n\n• "What's my balance?"\n• "Show my production logs"\n• "Any pending requests?"\n• "Help" - See all commands\n\nOr type naturally and I'll do my best to help!` 
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Sorry, I encountered an error. Please try again.' });
  }
});

// Get inquiry details by ID (for admin to view full data)
router.get('/inquiry/:id', getInquiryDetail);

// Update inquiry status (accept/reject)
router.post('/inquiry/:id/status', updateInquiryStatus);

// Advance inquiry membership step
router.post('/inquiry/:id/step', updateInquiryStep);

// Verify Gmail sender: send verification code to the Gmail address
router.post('/verify-sender', async (req, res) => {
  return sendSenderVerification(req, res);
});

// Confirm Gmail sender verification with code
router.post('/verify-sender/confirm', async (req, res) => {
  return confirmSenderVerification(req, res);
});

// Dashboard stats API for real-time updates
router.get('/dashboard/stats', async (req, res) => {
  try {
    const { InventoryItem, SupplyRequest, Sale } = await import("../models/index.js");
    const { sequelize } = await import("../models/salesModel.js");
    
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'active' } });
    
    const allItems = await InventoryItem.findAll();
    const lowStockItems = allItems.filter(item => 
      parseFloat(item.currentStock) < parseFloat(item.reorderPoint)
    );
    
    const totalRequests = await SupplyRequest.count();
    const pendingRequests = await SupplyRequest.count({ where: { receiptSent: false } });
    
    const recentTransactions = await Transaction.findAll({
      limit: 10,
      order: [['transactionDate', 'DESC']]
    });
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth()+1, 1);
    const firstOfYear = new Date(today.getFullYear(), 0, 1);

    const dailySales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: today, [Op.lt]: tomorrow } }
    }) || 0;
    
    const currentMonthSales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: firstOfMonth, [Op.lt]: nextMonth } }
    }) || 0;
    
    const annualSales = await Sale.sum('total', {
      where: { orderDate: { [Op.gte]: firstOfYear } }
    }) || 0;
    
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

    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        requests: totalRequests,
        pendingRequests,
        dailySales,
        monthlySales: currentMonthSales,
        annualSales,
        lowStockCount: lowStockItems.length
      },
      chartData: {
        monthlySales: monthlySalesData,
        monthlyRequests: monthlyRequestsData
      },
      lowStockItems: lowStockItems.map(item => ({
        name: item.name,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint
      })),
      recentTransactions: recentTransactions.map(t => ({
        transactionType: t.transactionType,
        amount: t.amount,
        transactionDate: t.transactionDate
      }))
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

