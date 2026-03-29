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
// Centralized model imports and sync
import { Member, sequelize as memberSequelize } from "./memberModel.js";
import { Program, MemberProgram, sequelize as programSequelize } from "./programModel.js";
import { Asset, sequelize as assetSequelize } from "./assetModel.js";
import { InventoryItem, InventoryTransaction, InventoryBatch, sequelize as invSequelize } from "./inventoryModel.js";
import { ProductionLog, BiosecurityCheck, sequelize as prodSequelize } from "./productionModel.js";
import { Transaction, FinancialLedger, sequelize as transSequelize } from "./transactionModel.js";
import { SupplyRequest, sequelize as reqSequelize } from "./supplyRequestModel.js";
import { Notification, NotificationRead, sequelize as notifSequelize } from "./notificationModel.js";
import { Sale, sequelize as salesSequelize } from "./salesModel.js";
import { User, sequelize as userSequelize } from "./userModel.js";
import { Inquiry, sequelize as inquirySequelize } from "./inquiryModel.js";

// Sync all models at startup
export const syncAllModels = async () => {
  try {
    await memberSequelize.sync();
    // Program uses sync() without alter to avoid issues; use targeted migration for schema changes
    await programSequelize.sync();
    await assetSequelize.sync();
    await invSequelize.sync();
    await prodSequelize.sync();
    await transSequelize.sync();
    await reqSequelize.sync();
    await notifSequelize.sync();
    await salesSequelize.sync();
    await userSequelize.sync();
    await inquirySequelize.sync();
    console.log("✅ All models synchronized");
  } catch (error) {
    console.error("❌ Model sync error:", error);
  }
};

// Export all models
export {
  Member,
  Program,
  MemberProgram,
  Asset,
  InventoryItem,
  InventoryTransaction,
  InventoryBatch,
  ProductionLog,
  BiosecurityCheck,
  Transaction,
  FinancialLedger,
  SupplyRequest,
  Notification,
  NotificationRead,
  Sale,
  Inquiry,
  User
};



