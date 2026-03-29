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
import { SupplyRequest, InventoryItem, Member } from "../models/index.js";
import nodemailer from "nodemailer";
import { Op } from "sequelize";

export const supplyRequestPage = async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: { category: { [Op.in]: ['feeds', 'chicks', 'medicine'] } },
      order: [['name', 'ASC']]
    });
    
    res.render("member/supply-request", {
      title: "Request Supplies",
      items: items || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading supply request page: " + error.message);
    res.render("member/supply-request", {
      title: "Request Supplies",
      items: []
    });
  }
};

export const submitSupplyRequest = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const { items, notes } = req.body;
    
    if (!items || items.trim() === '') {
      req.flash("error_msg", "Please add at least one item to your request");
      return res.redirect("/member/supply-request");
    }
    
    const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;
    
    if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
      req.flash("error_msg", "Please add at least one item to your request");
      return res.redirect("/member/supply-request");
    }
    
    // Calculate total amount and validate items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of itemsArray) {
      if (!item.itemId || !item.quantity || parseFloat(item.quantity) <= 0) {
        req.flash("error_msg", "Invalid item data. Please check all items have valid quantities.");
        return res.redirect("/member/supply-request");
      }
      
      const inventoryItem = await InventoryItem.findByPk(item.itemId);
      if (!inventoryItem) {
        req.flash("error_msg", `Item ${item.itemId} not found in inventory`);
        return res.redirect("/member/supply-request");
      }
      
      const quantity = parseFloat(item.quantity);
      const availableStock = parseFloat(inventoryItem.currentStock || 0);
      
      if (isNaN(quantity) || quantity <= 0) {
        req.flash("error_msg", `Invalid quantity for ${inventoryItem.name}. Please enter a valid number.`);
        return res.redirect("/member/supply-request");
      }
      
      if (quantity > availableStock) {
        req.flash("error_msg", `Requested quantity (${quantity}) exceeds available stock (${availableStock}) for ${inventoryItem.name}`);
        return res.redirect("/member/supply-request");
      }
      
      const itemTotal = quantity * parseFloat(inventoryItem.unitPrice);
      totalAmount += itemTotal;
      
      // Store item with name and price for better display
      validatedItems.push({
        itemId: parseInt(item.itemId),
        quantity: quantity,
        itemName: item.itemName || inventoryItem.name,
        unit: inventoryItem.unit,
        price: itemTotal
      });
    }
    
    await SupplyRequest.create({
      memberId,
      items: validatedItems,
      totalAmount,
      notes: notes || null
    });
    
    // Send receipt email to member (best-effort)
    try {
      // find member email
      let member = null;
      try { member = await Member.findOne({ where: { memberId } }); } catch(_) { member = null; }
      const toEmail = (member && member.email) ? member.email : (req.session && req.session.userEmail) ? req.session.userEmail : null;

      if (toEmail) {
        let transporter;
        let usingTestAccount = false;
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: testAccount.user, pass: testAccount.pass } });
          usingTestAccount = true;
        }

        const itemsHtml = validatedItems.map(i => `<li>${i.itemName} — ${i.quantity} ${i.unit} (₱${(i.price||0).toFixed(2)})</li>`).join('');
        const mailOptions = {
          from: process.env.EMAIL_USER || 'no-reply@blmc.local',
          to: toEmail,
          subject: `BLMC Supply Request Receipt - ₱${totalAmount.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Supply Request Received</h2>
              <p>Thank you. We have received your supply request. Details below:</p>
              <p><strong>Member ID:</strong> ${memberId}</p>
              <p><strong>Total Amount:</strong> ₱${totalAmount.toFixed(2)}</p>
              <ul>${itemsHtml}</ul>
              <p>Request status: <strong>Pending</strong>. An admin will review and process your request shortly.</p>
              <p>Reference: This is an automated receipt from Bansud Livestock Multi-Purpose Cooperative.</p>
            </div>
          `
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          if (usingTestAccount) {
            const preview = nodemailer.getTestMessageUrl(info);
            console.log('Supply request receipt preview URL:', preview);
            req.flash('success_msg', `Supply request submitted successfully! Receipt preview: ${preview}`);
          } else {
            req.flash('success_msg', `Supply request submitted successfully! A receipt was sent to ${toEmail}`);
          }
        } catch (mailErr) {
          console.error('Error sending supply request receipt:', mailErr && mailErr.message ? mailErr.message : mailErr);
          req.flash('success_msg', `Supply request submitted successfully! (Could not send receipt by email)`);
        }
      } else {
        req.flash('success_msg', `Supply request submitted successfully!`);
      }
    } catch (err) {
      console.error('Error during sending receipt:', err);
      req.flash('success_msg', `Supply request submitted successfully!`);
    }

    res.redirect("/member/requests");
  } catch (error) {
    req.flash("error_msg", "Error submitting supply request: " + error.message);
    res.redirect("/member/supply-request");
  }
};

export const myRequests = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const requests = await SupplyRequest.findAll({
      where: { memberId },
      order: [['requestDate', 'DESC']]
    });
    // Parse JSON items if they're stored as strings
    const parsedRequests = (requests || []).map(request => {
      const requestData = request.toJSON();
      if (requestData.items && typeof requestData.items === 'string') {
        try {
          requestData.items = JSON.parse(requestData.items);
        } catch (e) {
          requestData.items = [];
        }
      }
      return requestData;
    });
    // Use receiptSent field for button logic
    for (const reqObj of parsedRequests) {
      reqObj.canViewReceipt = !!reqObj.receiptSent;
    }
    res.render("member/my-requests", {
      title: "My Supply Requests",
      requests: parsedRequests
    });
  } catch (error) {
    req.flash("error_msg", "Error loading requests: " + error.message);
    res.render("member/my-requests", {
      title: "My Supply Requests",
      requests: []
    });
  }
};

