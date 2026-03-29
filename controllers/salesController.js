/*
    MIT License

    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
    */
import { Sale, InventoryItem, Transaction, Member, FinancialLedger, Notification } from "../models/index.js";
import { sequelize } from "../models/transactionModel.js";
import { Op } from "sequelize";

export const posPage = (req, res) => {
  res.render("admin/pos", { title: "Point of Sale" });
};

// GET /api/inventory/pos-items
export const getPosInventory = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: { currentStock: { [Op.gt]: 0 } },
      attributes: ['id', 'name', 'category', 'unit', 'currentStock', 'unitPrice'],
      order: [['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/members/search?q=
export const searchMembers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const members = await Member.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName: { [Op.like]: `%${q}%` } },
          { memberId: { [Op.like]: `%${q}%` } }
        ]
      },
      attributes: ['memberId', 'firstName', 'lastName', 'loanBalance'],
      limit: 10
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /admin/pos/sale — atomic POS transaction
export const createPosSale = async (req, res) => {
  try {
    const { items, paymentMethod, memberId, customerName, discount, notes } = req.body;

    let itemsArray;
    try { itemsArray = typeof items === 'string' ? JSON.parse(items) : items; } catch { itemsArray = []; }

    if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
      req.flash('error_msg', 'Cart is empty. Please add items before checking out.');
      return res.redirect('/admin/pos');
    }

    if (!['cash', 'credit'].includes(paymentMethod)) {
      req.flash('error_msg', 'Invalid payment method.');
      return res.redirect('/admin/pos');
    }

    if (paymentMethod === 'credit' && !memberId) {
      req.flash('error_msg', 'Credit payment requires a member account to be selected.');
      return res.redirect('/admin/pos');
    }

    let resolvedItemsRef = [];

    await sequelize.transaction(async (t) => {
      let subtotal = 0;
      const resolvedItems = [];
      resolvedItemsRef = resolvedItems;

      for (const item of itemsArray) {
        const inv = await InventoryItem.findByPk(item.itemId, { transaction: t });
        if (!inv) throw new Error(`Item "${item.name || item.itemId}" not found in inventory.`);
        const qty = parseFloat(item.quantity);
        if (qty > parseFloat(inv.currentStock)) {
          throw new Error(`Insufficient stock for "${inv.name}". Available: ${inv.currentStock}, Requested: ${qty}`);
        }
        const lineTotal = qty * parseFloat(inv.unitPrice);
        subtotal += lineTotal;
        resolvedItems.push({ inv, qty, lineTotal, name: inv.name, unit: inv.unit });
      }
      // Snapshot for post-transaction use
      resolvedItemsRef = resolvedItems.map(r => ({ name: r.name, qty: r.qty, unit: r.unit, lineTotal: r.lineTotal }));

      const discountAmount = Math.max(0, parseFloat(discount) || 0);
      if (discountAmount > subtotal) throw new Error('Discount cannot exceed the subtotal.');
      const total = subtotal - discountAmount;

      let member = null;
      if (memberId) {
        member = await Member.findOne({ where: { memberId }, transaction: t });
        if (!member) throw new Error(`Member "${memberId}" not found.`);
      }

      const customerType = member ? 'member' : 'walk_in';
      const displayName = member
        ? `${member.firstName} ${member.lastName}`
        : (customerName || 'Walk-in Customer');

      await Sale.create({
        saleType: 'pos',
        customerName: displayName,
        customerType,
        items: itemsArray,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
        orderStatus: 'fulfilled',
        notes: notes || null,
        processedBy: req.session.userId || 1
      }, { transaction: t });

      for (const { inv, qty, lineTotal, name } of resolvedItems) {
        inv.currentStock = parseFloat(inv.currentStock) - qty;
        await inv.save({ transaction: t });

        await Transaction.create({
          transactionType: 'sale',
          amount: lineTotal,
          description: `POS Sale: ${name}`,
          productType: 'other',
          quantity: qty,
          unitPrice: parseFloat(inv.unitPrice),
          paymentMethod,
          processedBy: req.session.userId || 1
        }, { transaction: t });
      }

      if (member) {
        const itemDesc = resolvedItems.map(r => r.name).join(', ');
        if (paymentMethod === 'credit') {
          member.loanBalance = parseFloat(member.loanBalance || 0) + total;
          await member.save({ transaction: t });
          await FinancialLedger.create({
            memberId: member.memberId,
            entryType: 'debit',
            amount: total,
            balance: member.loanBalance,
            category: 'supply',
            description: `POS credit sale: ${itemDesc}`,
            ledgerDate: new Date()
          }, { transaction: t });
        } else {
          await FinancialLedger.create({
            memberId: member.memberId,
            entryType: 'credit',
            amount: total,
            balance: parseFloat(member.loanBalance || 0),
            category: 'supply',
            description: `POS cash sale: ${itemDesc}`,
            ledgerDate: new Date()
          }, { transaction: t });
        }
      }

      const balanceNote = (member && paymentMethod === 'credit')
        ? ` | New loan balance: ₱${member.loanBalance.toFixed(2)}`
        : '';
      req.flash('success_msg', `Sale completed. Total: ₱${total.toFixed(2)} — ${displayName}${balanceNote}`);
    });

    // Send in-app notification to member after transaction commits
    if (req.body.memberId) {
      try {
        const { memberId, paymentMethod: pm } = req.body;
        const notifMember = await Member.findOne({ where: { memberId } });
        if (notifMember) {
          const itemLines = resolvedItemsRef.map(r => `• ${r.name} (${r.qty} ${r.unit}) — ₱${r.lineTotal.toFixed(2)}`).join('\n');
          const discountAmount = Math.max(0, parseFloat(req.body.discount) || 0);
          const subtotalVal = resolvedItemsRef.reduce((s, r) => s + r.lineTotal, 0);
          const totalVal = subtotalVal - discountAmount;
          const payLabel = pm === 'credit' ? 'Credit (added to loan balance)' : 'Cash';
          const receiptContent = `POS Sale Receipt\n─────────────────\n${itemLines}\n─────────────────\nSubtotal: ₱${subtotalVal.toFixed(2)}${discountAmount > 0 ? `\nDiscount: -₱${discountAmount.toFixed(2)}` : ''}\nTotal: ₱${totalVal.toFixed(2)}\nPayment: ${payLabel}\nDate: ${new Date().toLocaleString('en-PH')}`;

          await Notification.create({
            title: `POS Sale Receipt — ₱${totalVal.toFixed(2)}`,
            content: receiptContent,
            type: 'announcement',
            targetAudience: 'specific',
            specificMemberIds: [memberId],
            priority: 'medium',
            published: true,
            publishedAt: new Date()
          });
        }
      } catch (notifErr) {
        console.error('Notification error (non-fatal):', notifErr.message);
      }
    }

    res.redirect('/admin/pos');
  } catch (error) {
    req.flash('error_msg', 'Error processing sale: ' + error.message);
    res.redirect('/admin/pos');
  }
};

// Alias used by adminRoutes POST /admin/pos
export const processPOS = createPosSale;

export const processCounterCheckout = async (req, res) => {
  try {
    const { items, paymentMethod, customerName, discount } = req.body;

    const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;
    let subtotal = 0;

    for (const item of itemsArray) {
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      if (!inventoryItem) {
        req.flash("error_msg", `Item ${item.itemId} not found`);
        return res.redirect("/admin/counter");
      }
      if (inventoryItem.currentStock < item.quantity) {
        req.flash("error_msg", `Insufficient stock for ${inventoryItem.name}`);
        return res.redirect("/admin/counter");
      }
      subtotal += parseFloat(item.quantity) * parseFloat(item.unitPrice);
    }

    const discountAmount = parseFloat(discount) || 0;
    const total = subtotal - discountAmount;

    let memberRecord = null;
    if (customerName && customerName.trim()) {
      memberRecord = await Member.findOne({ where: { memberId: customerName } });
    }

    const customerType = memberRecord ? 'member' : 'walk_in';
    const displayName = memberRecord
      ? `${memberRecord.firstName} ${memberRecord.lastName}`
      : (customerName || 'Walk-in Customer');

    await Sale.create({
      saleType: 'counter',
      customerName: displayName,
      customerType,
      items: itemsArray,
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod,
      paymentStatus: memberRecord ? 'partial' : 'paid',
      orderStatus: 'fulfilled',
      processedBy: req.session.userId
    });

    for (const item of itemsArray) {
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      inventoryItem.currentStock -= parseFloat(item.quantity);
      await inventoryItem.save();

      await Transaction.create({
        transactionType: 'sale',
        amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        description: `Counter Sale: ${inventoryItem.name}`,
        productType: 'other',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        paymentMethod,
        processedBy: req.session.userId
      });
    }

    if (memberRecord) {
      memberRecord.loanBalance = parseFloat(memberRecord.loanBalance || 0) + total;
      await memberRecord.save();

      await FinancialLedger.create({
        memberId: memberRecord.memberId,
        entryType: 'debit',
        amount: total,
        balance: memberRecord.loanBalance,
        category: 'supply',
        description: `Counter sale: ${itemsArray.map(i => `${i.quantity}x item ${i.itemId}`).join(', ')}`
      });
    }

    req.flash("success_msg", `Counter sale processed. Total: ₱${total.toFixed(2)} ${memberRecord ? '→ ' + memberRecord.memberId : '(Walk-in)'}`);
    res.redirect("/admin/counter");
  } catch (error) {
    req.flash("error_msg", "Error processing counter sale: " + error.message);
    res.redirect("/admin/counter");
  }
};

export const bulkOrderList = async (req, res) => {
  try {
    const orders = await Sale.findAll({
      where: { saleType: 'bulk_order' },
      order: [['orderDate', 'DESC']]
    });
    res.render("admin/bulk-orders", { title: "Bulk Orders", orders: orders || [] });
  } catch (error) {
    req.flash("error_msg", "Error loading bulk orders: " + error.message);
    res.render("admin/bulk-orders", { title: "Bulk Orders", orders: [] });
  }
};

export const createBulkOrder = async (req, res) => {
  try {
    const { customerName, items, paymentMethod, notes } = req.body;
    const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;
    let subtotal = 0;

    for (const item of itemsArray) {
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      if (!inventoryItem) {
        req.flash("error_msg", `Item ${item.itemId} not found`);
        return res.redirect("/admin/bulk-orders/new");
      }
      subtotal += parseFloat(item.quantity) * parseFloat(item.unitPrice);
    }

    await Sale.create({
      saleType: 'bulk_order',
      customerName,
      customerType: 'institutional',
      items: itemsArray,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      processedBy: req.session.userId,
      notes
    });

    req.flash("success_msg", "Bulk order created successfully");
    res.redirect("/admin/bulk-orders");
  } catch (error) {
    req.flash("error_msg", "Error creating bulk order: " + error.message);
    res.redirect("/admin/bulk-orders/new");
  }
};

export const fulfillBulkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findByPk(id);

    if (!sale) {
      req.flash("error_msg", "Order not found");
      return res.redirect("/admin/bulk-orders");
    }

    for (const item of sale.items) {
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      if (!inventoryItem || inventoryItem.currentStock < item.quantity) {
        req.flash("error_msg", `Insufficient stock for order`);
        return res.redirect("/admin/bulk-orders");
      }
    }

    for (const item of sale.items) {
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      inventoryItem.currentStock -= parseFloat(item.quantity);
      await inventoryItem.save();

      await Transaction.create({
        transactionType: 'sale',
        amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        description: `Bulk Order: ${inventoryItem.name}`,
        productType: 'other',
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        paymentMethod: sale.paymentMethod,
        processedBy: req.session.userId
      });
    }

    sale.orderStatus = 'fulfilled';
    sale.fulfilledAt = new Date();
    await sale.save();

    req.flash("success_msg", "Bulk order fulfilled successfully");
    res.redirect("/admin/bulk-orders");
  } catch (error) {
    req.flash("error_msg", "Error fulfilling order: " + error.message);
    res.redirect("/admin/bulk-orders");
  }
};
