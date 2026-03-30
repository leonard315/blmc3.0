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
import { isAdminOrStaff } from "../middleware/auth.js";
import { adminDashboard } from "../controllers/dashboardController.js";
import {
  memberList,
  memberRegister,
  memberRegisterPage,
  verifyMember,
  enrollMemberProgram,
  memberDetail,
  updateMemberStatus,
  payLedgerEntry
} from "../controllers/memberController.js";
import {
  programList,
  createProgram,
  updateProgram,
  deleteProgram
} from "../controllers/programController.js";
import {
  inventoryList,
  createInventoryItem,
  purchaseInventory,
  distributeInventory
} from "../controllers/inventoryController.js";
import { counterPage } from "../controllers/inventoryController.js";
import {
  financialReports,
  balanceSheet,
  calculateDividends,
  assetList,
  createAsset
} from "../controllers/financialController.js";
import {
  posPage,
  createPosSale,
  processPOS,
  processCounterCheckout,
  bulkOrderList,
  createBulkOrder,
  fulfillBulkOrder
} from "../controllers/salesController.js";
import {
  adminNotificationList,
  createNotification,
  publishNotification
} from "../controllers/notificationController.js";
import { adminListInquiries, updateInquiryStatus } from "../controllers/inquiryController.js";
import { loanList, addLoan, recordPayment } from "../controllers/loanController.js";
import { adminNotificationSimplePage } from "../controllers/notificationController.js";
import { adminRequestList, updateRequestStatus, sendRequestReceipt } from "../controllers/adminRequestController.js";
import { seedAdminNotification } from "../controllers/seedNotificationController.js";

const router = express.Router();

// Debug route to create a test notification
router.get("/seed-notification", seedAdminNotification);

// All admin routes require authentication
router.use(isAdminOrStaff);

// Dashboard
router.get("/dashboard", adminDashboard);

// Member Management
router.get("/members", memberList);
router.get("/members/new", memberRegisterPage);
router.post("/members/new", memberRegister);
router.get("/members/:memberId", memberDetail);
router.post("/members/:memberId/verify", verifyMember);
router.post("/members/:memberId/status", updateMemberStatus);
router.post("/members/:memberId/enroll", enrollMemberProgram);
router.post('/members/:memberId/ledger/:id/pay', payLedgerEntry);

// Program Management
router.get("/programs", programList);
router.post("/programs", createProgram);
router.post("/programs/:id", updateProgram);
router.post("/programs/:id/delete", deleteProgram);

// Inventory Management
router.get("/inventory", inventoryList);
router.get('/counter', counterPage);
router.post("/inventory", createInventoryItem);
router.post("/inventory/purchase", purchaseInventory);
router.post("/inventory/distribute", distributeInventory);

// Financial Management
router.get("/financial", financialReports);
router.get("/financial-reports", financialReports);
router.get("/financial/balance-sheet", balanceSheet);
router.post("/financial/dividends", calculateDividends);
router.get("/assets", assetList);
router.post("/assets", createAsset);

// Sales & Ordering
router.get("/pos", posPage);
router.post("/pos/sale", createPosSale);
router.post("/pos", processPOS);
router.post("/counter/checkout", processCounterCheckout);
router.get("/bulk-orders", bulkOrderList);
router.get("/bulk-orders/new", (req, res) => res.render("admin/bulk-order-new", { title: "New Bulk Order" }));
router.post("/bulk-orders", createBulkOrder);
router.post("/bulk-orders/:id/fulfill", fulfillBulkOrder);

// Notifications
router.get("/notifications", adminNotificationList);
router.post("/notifications", createNotification);
router.post("/notifications/:id/publish", publishNotification);

// Simple notification page (custom)
router.get("/notification", adminNotificationSimplePage);

// Inquiries
router.get('/inquiries', adminListInquiries);
router.post('/inquiries/:id/status', updateInquiryStatus);
// Supply Requests (admin)
router.get('/requests', adminRequestList);
router.post('/requests/:id/status', updateRequestStatus);
router.post('/requests/:id/send-receipt', sendRequestReceipt);

// Loans
router.get('/loans', loanList);
router.post('/loans/add', addLoan);
router.post('/loans/payment', recordPayment);

export default router;

