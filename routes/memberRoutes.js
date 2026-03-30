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
import { Op } from "sequelize";
import { isMember } from "../middleware/auth.js";
import { memberDashboard } from "../controllers/dashboardController.js";
import {
  productionLogPage,
  submitProductionLog,
  productionHistory,
  biosecurityCheckPage,
  submitBiosecurityCheck,
  biosecurityHistory
} from "../controllers/memberProductionController.js";
import {
  memberLedger,
  remittanceHistory
} from "../controllers/memberFinanceController.js";
import {
  supplyRequestPage,
  submitSupplyRequest,
  myRequests
} from "../controllers/memberRequestController.js";
import {
  notificationList,
  markNotificationRead
} from "../controllers/notificationController.js";
import memberReportController from "../controllers/memberReportController.js";

const router = express.Router();

// All member routes require authentication
router.use(isMember);

// Dashboard
router.get("/dashboard", memberDashboard);

// Production Data Entry
router.get("/production", productionLogPage);
router.post("/production", submitProductionLog);
router.get("/production/history", productionHistory);
router.get("/biosecurity", biosecurityCheckPage);
router.post("/biosecurity", submitBiosecurityCheck);
router.get("/biosecurity/history", biosecurityHistory);

// Finance & Transparency
router.get("/ledger", memberLedger);
router.get("/remittances", remittanceHistory);

// Requests & Communication
router.get("/supply-request", supplyRequestPage);
router.post("/supply-request", submitSupplyRequest);
router.get("/requests", myRequests);
router.get("/requests/:id/receipt", async (req, res) => {
  const { id } = req.params;
  const memberId = req.session.memberId;
  const { SupplyRequest } = await import("../models/index.js");
  const request = await SupplyRequest.findOne({ where: { id, memberId } });
  if (!request) {
    req.flash("error_msg", "Request not found");
    return res.redirect("/member/requests");
  }
  if (!request.receiptSent) {
    req.flash("error_msg", "Receipt not available yet for this request.");
    return res.redirect("/member/requests");
  }
  // Generate receipt content from request
  let items = request.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  const totalAmount = Number(request.totalAmount) || 0;
  const receiptText = `Supply Request Receipt\nMember ID: ${request.memberId}\nTotal Amount: ₱${totalAmount.toFixed(2)}\nItems:\n${Array.isArray(items) ? items.map(i => `- ${i.itemName}: ${i.quantity} ${i.unit} (₱${Number(i.price||0).toFixed(2)})`).join('\n') : ''}`;
  res.render("member/receipt", {
    title: "Supply Request Receipt",
    request: request.toJSON(),
    receipt: receiptText
  });
});
// Membership Receipt
router.get("/membership-receipt", async (req, res) => {
  const { Member } = await import("../models/index.js");
  const member = await Member.findOne({ where: { memberId: req.session.memberId } });
  if (!member) return res.redirect("/member/dashboard");
  res.render("member/membership-receipt", {
    title: "Membership Receipt",
    member: member.toJSON()
  });
});

router.get("/notifications", notificationList);
router.post("/notifications/:id/read", markNotificationRead);

// Member report page
router.get("/report", memberReportController.reportPage);
router.post("/report", memberReportController.submitReport);

export default router;



