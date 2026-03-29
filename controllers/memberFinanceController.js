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
import { FinancialLedger, Transaction, Member } from "../models/index.js";
import { Op } from "sequelize";

export const memberLedger = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const member = await Member.findOne({ where: { memberId } });
    
    if (!member) {
      req.flash("error_msg", "Member not found");
      return res.redirect("/member/login");
    }
    
    const ledger = await FinancialLedger.findAll({
      where: { memberId },
      order: [['ledgerDate', 'DESC']]
    });
    
    // If member is fully verified/active, ensure shareBalance is 10000 for display
    let memberForView = { ...member.toJSON() };
    if ((memberForView.status === 'active' || memberForView.verified) && (!memberForView.shareBalance || parseFloat(memberForView.shareBalance) < 10000)) {
      memberForView.shareBalance = 10000;
    }
    res.render("member/ledger", {
      title: "My Financial Ledger",
      member: memberForView,
      ledger: ledger || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading ledger: " + error.message);
    const member = await Member.findOne({ where: { memberId: req.session.memberId } });
    res.render("member/ledger", {
      title: "My Financial Ledger",
      member: member || {},
      ledger: []
    });
  }
};

export const remittanceHistory = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    
    const remittances = await Transaction.findAll({
      where: {
        memberId,
        transactionType: 'remittance'
      },
      order: [['transactionDate', 'DESC']]
    });
    
    res.render("member/remittances", {
      title: "Remittance History",
      remittances: remittances || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading remittance history: " + error.message);
    res.render("member/remittances", {
      title: "Remittance History",
      remittances: []
    });
  }
};

