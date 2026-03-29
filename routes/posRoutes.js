import express from "express";
import bcrypt from "bcrypt";
import { User, Sale } from "../models/index.js";
import { Op } from "sequelize";
import { createPosSale } from "../controllers/salesController.js";

const router = express.Router();

// ── POS Auth Middleware ──
const isPosUser = async (req, res, next) => {
  if (!req.session.posUserId) return res.redirect("/pos/login");
  try {
    const user = await User.findByPk(req.session.posUserId);
    if (!user || !['admin', 'staff', 'pos'].includes(user.role)) {
      return res.redirect("/pos/login");
    }
    req.posUser = user;
    next();
  } catch {
    res.redirect("/pos/login");
  }
};

// ── Login ──
router.get("/login", (req, res) => {
  if (req.session.posUserId) return res.redirect("/pos/dashboard");
  res.render("pos/login", { title: "POS Login" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) { req.flash("error_msg", "Account not found"); return res.redirect("/pos/login"); }
    const match = await bcrypt.compare(password, user.password);
    if (!match) { req.flash("error_msg", "Incorrect password"); return res.redirect("/pos/login"); }
    if (!user.isActive) { req.flash("error_msg", "Account is inactive"); return res.redirect("/pos/login"); }
    if (!['admin', 'staff', 'pos'].includes(user.role)) {
      req.flash("error_msg", "Access denied. POS access requires admin or staff role.");
      return res.redirect("/pos/login");
    }
    req.session.posUserId = user.id;
    res.redirect("/pos/dashboard");
  } catch (e) {
    req.flash("error_msg", "Login error: " + e.message);
    res.redirect("/pos/login");
  }
});

router.get("/logout", (req, res) => {
  req.session.posUserId = null;
  res.redirect("/pos/login");
});

// ── Dashboard ──
router.get("/dashboard", isPosUser, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySalesRows, monthlySalesRows, recentSales] = await Promise.all([
      Sale.findAll({ where: { saleType: 'pos', orderDate: { [Op.between]: [today, tomorrow] } }, attributes: ['total'] }),
      Sale.findAll({ where: { saleType: 'pos', orderDate: { [Op.gte]: monthStart } }, attributes: ['total'] }),
      Sale.findAll({ where: { saleType: 'pos' }, order: [['orderDate', 'DESC']], limit: 20 })
    ]);

    const todaySales = todaySalesRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const monthlySales = monthlySalesRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

    res.render("pos/dashboard", {
      title: "POS Dashboard",
      todaySales,
      todayTransactions: todaySalesRows.length,
      monthlySales,
      recentSales: recentSales.map(s => s.toJSON())
    });
  } catch (e) {
    res.render("pos/dashboard", { title: "POS Dashboard", todaySales: 0, todayTransactions: 0, monthlySales: 0, recentSales: [] });
  }
});

// ── New Sale ──
router.get("/sale", isPosUser, (req, res) => {
  res.render("pos/sale", { title: "New Sale" });
});

router.post("/sale", isPosUser, async (req, res) => {
  // Reuse the same atomic sale logic, redirect back to POS sale page
  req.session.userId = req.session.posUserId;
  const origRedirect = res.redirect.bind(res);
  res.redirect = (url) => origRedirect(url.replace('/admin/pos', '/pos/sale'));
  await createPosSale(req, res);
});

// ── Patronage Refund ──
router.get("/patronage", isPosUser, async (req, res) => {
  try {
    const { Member, FinancialLedger } = await import('../models/index.js');
    const { Op } = await import('sequelize');
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const members = await Member.findAll({ where: { status: 'active' }, order: [['firstName','ASC']] });

    const membersWithData = await Promise.all(members.map(async m => {
      // Sum supply ledger debits (credit sales) for this member in the year
      const { Op } = await import('sequelize');
      const ledgerEntries = await FinancialLedger.findAll({
        where: {
          memberId: m.memberId,
          category: 'supply',
          entryType: 'debit',
          ledgerDate: { [Op.between]: [yearStart, yearEnd] }
        },
        attributes: ['amount']
      });
      const annualPurchases = ledgerEntries.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      const patronageEarned = annualPurchases * 0.05;
      return { ...m.toJSON(), annualPurchases, patronageEarned };
    }));

    res.render("pos/patronage", { title: "Patronage Refund", members: membersWithData, currentYear: year, computed: false });
  } catch (e) {
    res.render("pos/patronage", { title: "Patronage Refund", members: [], currentYear: new Date().getFullYear(), computed: false });
  }
});

router.post("/patronage/compute", isPosUser, async (req, res) => {
  try {
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const { Member, Sale, FinancialLedger, Notification } = await import('../models/index.js');
    const { Op } = await import('sequelize');

    const members = await Member.findAll({ where: { status: 'active' } });
    let totalPurchases = 0, totalRefund = 0;

    for (const member of members) {
      const ledgerEntries = await FinancialLedger.findAll({
        where: {
          memberId: member.memberId,
          category: 'supply',
          entryType: 'debit',
          ledgerDate: { [Op.between]: [yearStart, yearEnd] }
        },
        attributes: ['amount']
      });
      const annualPurchases = ledgerEntries.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      const patronage = annualPurchases * 0.05;
      if (patronage <= 0) continue;

      totalPurchases += annualPurchases;
      totalRefund += patronage;

      member.patronageRefundAccrued = parseFloat(member.patronageRefundAccrued || 0) + patronage;
      await member.save();

      await FinancialLedger.create({
        memberId: member.memberId,
        entryType: 'credit',
        amount: patronage,
        balance: member.patronageRefundAccrued,
        category: 'patronage_refund',
        description: `Patronage refund ${year}: 5% of ₱${annualPurchases.toFixed(2)} purchases`,
        ledgerDate: new Date()
      });

      await Notification.create({
        title: `Patronage Refund ${year} — ₱${patronage.toFixed(2)}`,
        content: `Patronage Refund Receipt\n─────────────────\nMember: ${member.firstName} ${member.lastName}\nYear: ${year}\nAnnual Purchases: ₱${annualPurchases.toFixed(2)}\nRefund Rate: 5%\nRefund Amount: ₱${patronage.toFixed(2)}\nTotal Accrued: ₱${member.patronageRefundAccrued.toFixed(2)}\nDate: ${new Date().toLocaleString('en-PH')}`,
        type: 'announcement',
        targetAudience: 'specific',
        specificMemberIds: [member.memberId],
        priority: 'medium',
        published: true,
        publishedAt: new Date()
      });
    }

    req.flash('success_msg', `Patronage refund computed for ${year}. Total distributed: ₱${totalRefund.toFixed(2)} across ${members.length} members.`);
    res.redirect('/pos/patronage');
  } catch (e) {
    req.flash('error_msg', 'Error computing patronage: ' + e.message);
    res.redirect('/pos/patronage');
  }
});

// ── Share Balance ──
router.get("/share-balance", isPosUser, async (req, res) => {
  try {
    const { FinancialLedger } = await import('../models/index.js');
    const recentTx = await FinancialLedger.findAll({
      where: { category: 'share' },
      order: [['ledgerDate', 'DESC']],
      limit: 30
    });
    res.render("pos/share-balance", { title: "Share Balance", recentTx: recentTx.map(t => t.toJSON()) });
  } catch (e) {
    res.render("pos/share-balance", { title: "Share Balance", recentTx: [] });
  }
});

router.post("/share-balance/transact", isPosUser, async (req, res) => {
  try {
    const { memberId, txType, amount, notes } = req.body;
    const amt = parseFloat(amount);
    if (!memberId || !amt || amt <= 0) {
      req.flash('error_msg', 'Invalid transaction data.');
      return res.redirect('/pos/share-balance');
    }

    const { Member, FinancialLedger, Notification } = await import('../models/index.js');
    const member = await Member.findOne({ where: { memberId } });
    if (!member) { req.flash('error_msg', 'Member not found.'); return res.redirect('/pos/share-balance'); }

    if (txType === 'withdraw' && parseFloat(member.shareBalance) < amt) {
      req.flash('error_msg', 'Insufficient share balance.');
      return res.redirect('/pos/share-balance');
    }

    const prevBalance = parseFloat(member.shareBalance || 0);
    const newBalance = txType === 'deposit' ? prevBalance + amt : prevBalance - amt;

    member.shareBalance = newBalance;
    await member.save();

    await FinancialLedger.create({
      memberId,
      entryType: txType === 'deposit' ? 'credit' : 'debit',
      amount: amt,
      balance: newBalance,
      category: 'share',
      description: notes || (txType === 'deposit' ? 'Share capital deposit' : 'Share capital withdrawal'),
      ledgerDate: new Date()
    });

    // Notification with receipt
    const typeLabel = txType === 'deposit' ? 'Deposit' : 'Withdrawal';
    const receiptText = `Share Balance ${typeLabel} Receipt\n─────────────────\nMember: ${member.firstName} ${member.lastName}\nMember ID: ${memberId}\nTransaction: ${typeLabel}\nAmount: ₱${amt.toFixed(2)}\nPrevious Balance: ₱${prevBalance.toFixed(2)}\nNew Balance: ₱${newBalance.toFixed(2)}\n${notes ? 'Notes: ' + notes + '\n' : ''}Date: ${new Date().toLocaleString('en-PH')}`;

    await Notification.create({
      title: `Share Balance ${typeLabel} — ₱${amt.toFixed(2)}`,
      content: receiptText,
      type: 'announcement',
      targetAudience: 'specific',
      specificMemberIds: [memberId],
      priority: 'medium',
      published: true,
      publishedAt: new Date()
    });

    req.flash('success_msg', `Share balance ${typeLabel.toLowerCase()} of ₱${amt.toFixed(2)} processed for ${member.firstName} ${member.lastName}. New balance: ₱${newBalance.toFixed(2)}`);
    res.redirect('/pos/share-balance');
  } catch (e) {
    req.flash('error_msg', 'Error processing transaction: ' + e.message);
    res.redirect('/pos/share-balance');
  }
});

// ── Edit Product ──
router.post("/products/edit", isPosUser, async (req, res) => {
  try {
    const { id, name, category, unit, unitPrice, currentStock } = req.body;
    const { InventoryItem } = await import('../models/index.js');
    const item = await InventoryItem.findByPk(id);
    if (!item) { req.flash('error_msg', 'Product not found.'); return res.redirect('/pos/sale'); }
    await item.update({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      unitPrice: parseFloat(unitPrice) || 0,
      currentStock: parseFloat(currentStock) || 0
    });
    req.flash('success_msg', `Product "${name}" updated.`);
  } catch (e) {
    req.flash('error_msg', 'Error updating product: ' + e.message);
  }
  res.redirect('/pos/sale');
});

// ── Add Product ──
router.post("/products/add", isPosUser, async (req, res) => {
  try {
    const { name, category, unit, unitPrice, currentStock } = req.body;
    const { InventoryItem } = await import('../models/index.js');
    await InventoryItem.create({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      unitPrice: parseFloat(unitPrice) || 0,
      currentStock: parseFloat(currentStock) || 0,
      reorderPoint: 0
    });
    req.flash('success_msg', `Product "${name}" added successfully.`);
  } catch (e) {
    req.flash('error_msg', 'Error adding product: ' + e.message);
  }
  res.redirect('/pos/sale');
});

// ── Sales History ──
router.get("/sales-history", isPosUser, async (req, res) => {
  try {
    const sales = await Sale.findAll({
      where: { saleType: 'pos' },
      order: [['orderDate', 'DESC']],
      limit: 200
    });
    const salesData = sales.map(s => {
      const d = s.toJSON();
      const items = Array.isArray(d.items) ? d.items : (typeof d.items === 'string' ? JSON.parse(d.items || '[]') : []);
      d.itemCount = items.length;
      return d;
    });
    res.render("pos/sales-history", { title: "Sales History", sales: salesData });
  } catch (e) {
    res.render("pos/sales-history", { title: "Sales History", sales: [] });
  }
});

export default router;
