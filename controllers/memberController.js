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
import bcrypt from "bcrypt";
import { Member, MemberProgram, Program, FinancialLedger } from "../models/index.js";
import { Op } from "sequelize";

// Generate unique member ID
const generateMemberId = async () => {
  const prefix = "BLMC";
  const year = new Date().getFullYear();
  let random = Math.floor(1000 + Math.random() * 9000);
  let memberId = `${prefix}-${year}-${random}`;
  
  // Ensure uniqueness
  let exists = await Member.findOne({ where: { memberId } });
  let attempts = 0;
  while (exists && attempts < 10) {
    random = Math.floor(1000 + Math.random() * 9000);
    memberId = `${prefix}-${year}-${random}`;
    exists = await Member.findOne({ where: { memberId } });
    attempts++;
  }
  
  return memberId;
};

export const memberList = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { memberId: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const members = await Member.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.render("admin/members", { 
      title: "Member Management", 
      members,
      currentStatus: status || 'all',
      search: search || ''
    });
  } catch (error) {
    req.flash("error_msg", "Error loading members: " + error.message);
    res.redirect("/admin/dashboard");
  }
};

export const memberRegister = async (req, res) => {
  try {
    const { firstName, lastName, middleName, email, password, phone, address } = req.body;
    
    const existingMember = await Member.findOne({ where: { email } });
    if (existingMember) {
      req.flash("error_msg", "Email already registered");
      return res.redirect("/admin/members/new");
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const memberId = await generateMemberId();
    
    const member = await Member.create({
      memberId,
      firstName,
      lastName,
      middleName,
      email,
      password: hashedPassword,
      phone,
      address,
      status: 'pending'
    });
    
    req.flash("success_msg", `Member registered successfully. Member ID: ${memberId}`);
    res.redirect("/admin/members");
  } catch (error) {
    req.flash("error_msg", "Error registering member: " + error.message);
    res.redirect("/admin/members/new");
  }
};

export const memberRegisterPage = (req, res) => {
  res.render("admin/member-register", { title: "Register New Member" });
};

export const verifyMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const member = await Member.findOne({ where: { memberId } });
    
    if (!member) {
      req.flash("error_msg", "Member not found");
      return res.redirect("/admin/members");
    }
    
    member.verified = true;
    member.status = 'active';
    member.shareBalance = 10000;
    member.verifiedBy = req.session.userId;
    member.verifiedAt = new Date();
    await member.save();
    
    req.flash("success_msg", "Member verified successfully");
    res.redirect("/admin/members");
  } catch (error) {
    req.flash("error_msg", "Error verifying member: " + error.message);
    res.redirect("/admin/members");
  }
};

export const enrollMemberProgram = async (req, res) => {
  try {
    const { memberId, programId, target, quota } = req.body;
    
    await MemberProgram.create({
      memberId,
      programId: parseInt(programId),
      target: target ? parseFloat(target) : null,
      quota: quota ? parseFloat(quota) : null,
      status: 'active'
    });
    
    req.flash("success_msg", "Member enrolled in program successfully");
    res.redirect(`/admin/members/${memberId}`);
  } catch (error) {
    req.flash("error_msg", "Error enrolling member: " + error.message);
    res.redirect(`/admin/members/${memberId}`);
  }
};

export const memberDetail = async (req, res) => {
  try {
    const { memberId } = req.params;
    const member = await Member.findOne({ where: { memberId } });
    
    if (!member) {
      req.flash("error_msg", "Member not found");
      return res.redirect("/admin/members");
    }
    
    const programs = await Program.findAll({ where: { isActive: true } });
    const memberPrograms = await MemberProgram.findAll({
      where: { memberId },
      include: [{ model: Program, as: 'Program' }]
    });
    // Load financial ledger for this member (debits and credits)
    const ledger = await FinancialLedger.findAll({ where: { memberId }, order: [['ledgerDate', 'DESC']] });
    
    res.render("admin/member-detail", {
      title: `Member: ${member.firstName} ${member.lastName}`,
      member,
      programs,
      memberPrograms
      ,ledger
    });
  } catch (error) {
    req.flash("error_msg", "Error loading member details: " + error.message);
    res.redirect("/admin/members");
  }
};

export const updateMemberStatus = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { status } = req.body;
    
    const member = await Member.findOne({ where: { memberId } });
    if (!member) {
      req.flash("error_msg", "Member not found");
      return res.redirect("/admin/members");
    }
    
    member.status = status;
    await member.save();
    
    req.flash("success_msg", "Member status updated successfully");
    res.redirect(`/admin/members/${memberId}`);
  } catch (error) {
    req.flash("error_msg", "Error updating member status: " + error.message);
    res.redirect(`/admin/members/${memberId}`);
  }
};

export const payLedgerEntry = async (req, res) => {
  try {
    const { memberId, id } = req.params;
    const ledgerEntry = await FinancialLedger.findOne({ where: { id, memberId } });
    if (!ledgerEntry) {
      req.flash('error_msg', 'Ledger entry not found');
      return res.redirect(`/admin/members/${memberId}`);
    }
    if (ledgerEntry.entryType !== 'debit') {
      req.flash('error_msg', 'Only debit entries can be marked as paid');
      return res.redirect(`/admin/members/${memberId}`);
    }

    const amount = parseFloat(ledgerEntry.amount || 0);

    // Get current member to calculate new balance
    const member = await Member.findOne({ where: { memberId } });
    if (!member) {
      req.flash('error_msg', 'Member not found');
      return res.redirect(`/admin/members/${memberId}`);
    }

    // Calculate new loanBalance after payment
    const currentBalance = parseFloat(member.loanBalance || 0);
    const newBalance = Math.max(0, currentBalance - amount);

    // create a corresponding credit entry with proper running balance
    await FinancialLedger.create({
      memberId,
      transactionId: ledgerEntry.transactionId || null,
      entryType: 'credit',
      amount: amount,
      balance: newBalance, // Set running balance after this payment
      category: ledgerEntry.category,
      description: `Payment for: ${ledgerEntry.description || 'ledger entry #' + id}`,
      ledgerDate: new Date(),
      productName: ledgerEntry.productName,
      quantity: ledgerEntry.quantity,
      totalAmount: ledgerEntry.totalAmount
    });

    // Update member loanBalance to reflect payment
    if (member) {
      member.loanBalance = newBalance;
      await member.save();
    }

    req.flash('success_msg', 'Marked as paid and member balance updated');
    res.redirect(`/admin/members/${memberId}`);
  } catch (error) {
    req.flash('error_msg', 'Error marking ledger paid: ' + error.message);
    res.redirect(`/admin/members/${req.params.memberId}`);
  }
};

