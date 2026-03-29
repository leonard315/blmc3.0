// Admin: send receipt to member for a supply request (no status change)
export const sendRequestReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await SupplyRequest.findByPk(id);
    if (!request) {
      req.flash('error_msg', 'Supply request not found');
      return res.redirect('/admin/requests');
    }
    let items = request.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    const totalAmount = Number(request.totalAmount) || 0;
    const receiptText = `Supply Request Receipt\nMember ID: ${request.memberId}\nTotal Amount: ₱${totalAmount.toFixed(2)}\nItems:\n${Array.isArray(items) ? items.map(i => `- ${i.itemName}: ${i.quantity} ${i.unit} (₱${Number(i.price||0).toFixed(2)})`).join('\n') : ''}`;
    // Update receiptSent field and add ledger entries
    try {
      request.receiptSent = true;
      await request.save();

      // Add a FinancialLedger entry for each item in the request
      const { FinancialLedger, Sale } = await import('../models/index.js');
      const ledgerDate = new Date();
      let saleItems = [];
      let subtotal = 0;
      for (const item of items) {
        await FinancialLedger.create({
          memberId: request.memberId,
          entryType: 'debit',
          amount: item.price,
          balance: 0,
          category: 'supply',
          description: `${item.itemName} (${item.quantity} ${item.unit})`,
          ledgerDate,
          productName: item.itemName,
          quantity: item.quantity,
          totalAmount: item.price
        });
        saleItems.push({ itemId: item.itemId || null, itemName: item.itemName, quantity: item.quantity, unitPrice: item.price });
        subtotal += Number(item.price) || 0;
      }
      // Create Sale record for dashboard sales stats
      await Sale.create({
        saleType: 'bulk_order',
        customerName: request.memberName || '',
        customerType: 'member',
        items: saleItems,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        orderStatus: 'fulfilled',
        orderDate: ledgerDate,
        fulfilledAt: ledgerDate,
        processedBy: req.user ? req.user.id : null,
        notes: `Auto-generated from supply request receipt.`
      });
      req.flash('success_msg', 'Receipt marked as sent for this request, ledger and sales updated.');
    } catch (err) {
      console.error('Error updating receiptSent, ledger, or sales:', err);
      req.flash('error_msg', 'Could not update receipt status, ledger, or sales.');
    }
    res.redirect('/admin/requests');
  } catch (err) {
    console.error('Error during sending receipt:', err);
    req.flash('error_msg', 'Could not send receipt.');
    res.redirect('/admin/requests');
  }
};
import { SupplyRequest, Member, InventoryItem } from "../models/index.js";
import nodemailer from "nodemailer";

// Admin: list all supply requests
export const adminRequestList = async (req, res) => {
  try {
    const requests = await SupplyRequest.findAll({ order: [['requestDate', 'DESC']] });

    // Fetch member info for display
    const memberIds = [...new Set(requests.map(r => r.memberId))];
    const members = await Member.findAll({ where: { memberId: memberIds } });
    const memberMap = {};
    members.forEach(m => memberMap[m.memberId] = m);

    const parsed = requests.map(r => {
      const obj = r.toJSON();
      if (obj.items && typeof obj.items === 'string') {
        try { obj.items = JSON.parse(obj.items); } catch (e) { obj.items = []; }
      }
      obj.member = memberMap[obj.memberId] || null;
      return obj;
    });

    res.render('admin/requests', { title: 'Member Supply Requests', requests: parsed });
  } catch (error) {
    req.flash('error_msg', 'Error loading requests: ' + error.message);
    res.render('admin/requests', { title: 'Member Supply Requests', requests: [] });
  }
};

// Admin: update request status (approve / fulfill / reject)
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // expected: approve | fulfill | reject

    const request = await SupplyRequest.findByPk(id);
    if (!request) {
      req.flash('error_msg', 'Supply request not found');
      return res.redirect('/admin/requests');
    }

    // Note: admin should not auto-approve/fulfill/reject from this interface by default.
    // Keep the endpoint for compatibility but ignore status changes unless explicitly allowed.
    req.flash('info_msg', 'No status change performed. Use Send Receipt to acknowledge the request.');

    res.redirect('/admin/requests');
  } catch (error) {
    req.flash('error_msg', 'Error updating request: ' + error.message);
    res.redirect('/admin/requests');
  }
};

export default { adminRequestList, updateRequestStatus };
