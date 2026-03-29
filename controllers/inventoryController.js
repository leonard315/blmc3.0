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
import { InventoryItem, InventoryTransaction, InventoryBatch } from "../models/index.js";
import { Op } from "sequelize";

// FIFO Helper Functions
const getOldestBatch = async (itemId) => {
  return await InventoryBatch.findOne({
    where: {
      itemId,
      remainingQuantity: { [Op.gt]: 0 }
    },
    order: [['receivedDate', 'ASC']]
  });
};

const consumeFromBatch = async (batchId, quantity) => {
  const batch = await InventoryBatch.findByPk(batchId);
  if (!batch) throw new Error("Batch not found");
  
  if (batch.remainingQuantity < quantity) {
    throw new Error("Insufficient stock in batch");
  }
  
  batch.remainingQuantity -= parseFloat(quantity);
  await batch.save();
  
  return batch;
};

export const inventoryList = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      order: [['name', 'ASC']]
    });
    
    // Mark low stock items
    const itemsWithAlerts = (items || []).map(item => ({
      ...item.toJSON(),
      isLowStock: parseFloat(item.currentStock || 0) < parseFloat(item.reorderPoint || 0)
    }));
    
    res.render("admin/inventory", {
      title: "Inventory Management",
      items: itemsWithAlerts,
      showCounter: req.query.counter === '1' || req.query.view === 'counter'
    });
  } catch (error) {
    req.flash("error_msg", "Error loading inventory: " + error.message);
    res.render("admin/inventory", {
      title: "Inventory Management",
      items: []
    });
  }
};

export const inventoryItemsApi = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({ order: [['name','ASC']] });
    const payload = items.map(i => ({ id: i.id, name: i.name, category: i.category, unit: i.unit, currentStock: i.currentStock, unitPrice: i.unitPrice }));
    res.json({ success: true, items: payload });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const counterPage = async (req, res) => {
  try {
    const { Member } = await import('../models/index.js');
    const items = await InventoryItem.findAll({ order: [['name','ASC']] });
    const members = await Member.findAll({ where: { status: 'active' }, order: [['firstName','ASC']], attributes: ['memberId', 'firstName', 'lastName', 'email'] });
    const itemsWithAlerts = (items || []).map(item => ({ ...item.toJSON(), isLowStock: parseFloat(item.currentStock || 0) < parseFloat(item.reorderPoint || 0) }));
    res.render('admin/counter', { title: 'Counter Ordering', items: itemsWithAlerts, members: members || [] });
  } catch (error) {
    req.flash('error_msg', 'Error loading counter page: ' + error.message);
    res.render('admin/counter', { title: 'Counter Ordering', items: [], members: [] });
  }
};

export const createInventoryItem = async (req, res) => {
  try {
    const { name, category, unit, reorderPoint, unitPrice, isPerishable, expiryTracking } = req.body;
    
    await InventoryItem.create({
      name,
      category,
      unit,
      currentStock: 0,
      reorderPoint: parseFloat(reorderPoint) || 0,
      unitPrice: parseFloat(unitPrice),
      isPerishable: isPerishable === 'true',
      expiryTracking: expiryTracking === 'true'
    });
    
    req.flash("success_msg", "Inventory item created successfully");
    res.redirect("/admin/inventory");
  } catch (error) {
    req.flash("error_msg", "Error creating item: " + error.message);
    res.redirect("/admin/inventory");
  }
};

export const purchaseInventory = async (req, res) => {
  try {
    const { itemId, quantity, unitPrice, batchNumber, expiryDate } = req.body;
    
    const item = await InventoryItem.findByPk(itemId);
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/admin/inventory");
    }
    
    // Create transaction
    await InventoryTransaction.create({
      itemId: parseInt(itemId),
      transactionType: 'purchase',
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(unitPrice),
      batchNumber: batchNumber || null,
      expiryDate: expiryDate || null,
      processedBy: req.session.userId
    });
    
    // Create batch for FIFO tracking
    if (item.isPerishable || batchNumber) {
      await InventoryBatch.create({
        itemId: parseInt(itemId),
        batchNumber: batchNumber || `BATCH-${Date.now()}`,
        quantity: parseFloat(quantity),
        remainingQuantity: parseFloat(quantity),
        receivedDate: new Date(),
        expiryDate: expiryDate || null,
        unitPrice: parseFloat(unitPrice)
      });
    }
    
    // Update stock
    item.currentStock = parseFloat(item.currentStock) + parseFloat(quantity);
    await item.save();
    
    req.flash("success_msg", "Inventory purchase recorded successfully");
    res.redirect("/admin/inventory");
  } catch (error) {
    req.flash("error_msg", "Error recording purchase: " + error.message);
    res.redirect("/admin/inventory");
  }
};

export const distributeInventory = async (req, res) => {
  try {
    const { itemId, memberId, quantity } = req.body;
    
    const item = await InventoryItem.findByPk(itemId);
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/admin/inventory");
    }
    
    const qty = parseFloat(quantity);
    if (item.currentStock < qty) {
      req.flash("error_msg", "Insufficient stock");
      return res.redirect("/admin/inventory");
    }
    
    // Use FIFO for perishable items
    if (item.isPerishable) {
      let remaining = qty;
      while (remaining > 0) {
        const batch = await getOldestBatch(itemId);
        if (!batch) throw new Error("No batches available");
        
        const consumeQty = Math.min(remaining, batch.remainingQuantity);
        await consumeFromBatch(batch.id, consumeQty);
        remaining -= consumeQty;
      }
    }
    
    // Create transaction
    await InventoryTransaction.create({
      itemId: parseInt(itemId),
      transactionType: 'distribution',
      quantity: qty,
      unitPrice: item.unitPrice,
      relatedMemberId: memberId,
      processedBy: req.session.userId
    });
    
    // Update stock
    item.currentStock -= qty;
    await item.save();
    
    // Deduct from member ledger
    const { FinancialLedger, Member } = await import("../models/index.js");
    const totalAmount = qty * item.unitPrice;
    const member = await Member.findOne({ where: { memberId: memberId } });
    
    if (member) {
      member.loanBalance = parseFloat(member.loanBalance || 0) + totalAmount;
      await member.save();
      
      await FinancialLedger.create({
        memberId,
        entryType: 'debit',
        amount: totalAmount,
        balance: member.loanBalance,
        category: 'supply',
        description: `Supply distribution: ${item.name} x${qty}`
      });
    }
    
    req.flash("success_msg", "Inventory distributed successfully");
    res.redirect("/admin/inventory");
  } catch (error) {
    req.flash("error_msg", "Error distributing inventory: " + error.message);
    res.redirect("/admin/inventory");
  }
};

