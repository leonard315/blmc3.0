import { Member, Transaction } from "../models/index.js";
import { Op, fn, col, literal } from "sequelize";

export const loanList = async (req, res) => {
  try {
    const members = await Member.findAll({
      where: { loanBalance: { [Op.gt]: 0 } },
      order: [['lastName', 'ASC']]
    });

    const allMembers = await Member.findAll({ order: [['lastName', 'ASC']] });

    const totalLoans = members.reduce((sum, m) => sum + parseFloat(m.loanBalance || 0), 0);

    // Fetch all loan-related transactions grouped by member
    const loanTransactions = await Transaction.findAll({
      where: { transactionType: { [Op.in]: ['loan', 'payment'] } },
      order: [['transactionDate', 'DESC']]
    });

    // Build a map: memberId -> { loans: [], payments: [] }
    const txMap = {};
    loanTransactions.forEach(tx => {
      const mid = tx.memberId;
      if (!txMap[mid]) txMap[mid] = { loans: [], payments: [] };
      if (tx.transactionType === 'loan') txMap[mid].loans.push(tx.toJSON());
      else txMap[mid].payments.push(tx.toJSON());
    });

    // Attach transaction history to each member
    const membersWithHistory = members.map(m => {
      const json = m.toJSON();
      const hist = txMap[m.memberId] || { loans: [], payments: [] };
      const totalGranted = hist.loans.reduce((s, t) => s + parseFloat(t.amount), 0);
      const totalPaid    = hist.payments.reduce((s, t) => s + parseFloat(t.amount), 0);
      return { ...json, loanHistory: hist.loans, paymentHistory: hist.payments, totalGranted, totalPaid };
    });

    // Recent loan activity (all members, last 20)
    const recentActivity = loanTransactions.slice(0, 20).map(t => t.toJSON());

    res.render("admin/loans", {
      title: "Loan Management",
      members: membersWithHistory,
      allMembers,
      totalLoans,
      recentActivity
    });
  } catch (error) {
    req.flash("error_msg", "Error loading loans: " + error.message);
    res.render("admin/loans", { title: "Loan Management", members: [], allMembers: [], totalLoans: 0, recentActivity: [] });
  }
};

export const addLoan = async (req, res) => {
  try {
    const { memberId, amount, notes } = req.body;
    const member = await Member.findOne({ where: { memberId } });
    if (!member) { req.flash("error_msg", "Member not found"); return res.redirect("/admin/loans"); }

    const newBalance = parseFloat(member.loanBalance || 0) + parseFloat(amount);
    await member.update({ loanBalance: newBalance });

    await Transaction.create({
      memberId,
      transactionType: 'loan',
      amount: parseFloat(amount),
      description: notes || `Loan granted: ₱${parseFloat(amount).toLocaleString('en-PH')}`,
      transactionDate: new Date()
    });

    req.flash("success_msg", "Loan added successfully");
    res.redirect("/admin/loans");
  } catch (error) {
    req.flash("error_msg", "Error adding loan: " + error.message);
    res.redirect("/admin/loans");
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { memberId, amount, notes } = req.body;
    const member = await Member.findOne({ where: { memberId } });
    if (!member) { req.flash("error_msg", "Member not found"); return res.redirect("/admin/loans"); }

    const payment = Math.min(parseFloat(amount), parseFloat(member.loanBalance || 0));
    const newBalance = parseFloat(member.loanBalance || 0) - payment;
    await member.update({ loanBalance: newBalance });

    await Transaction.create({
      memberId,
      transactionType: 'payment',
      amount: payment,
      description: notes || `Loan payment: ₱${payment.toLocaleString('en-PH')}`,
      transactionDate: new Date()
    });

    req.flash("success_msg", "Payment recorded successfully");
    res.redirect("/admin/loans");
  } catch (error) {
    req.flash("error_msg", "Error recording payment: " + error.message);
    res.redirect("/admin/loans");
  }
};
