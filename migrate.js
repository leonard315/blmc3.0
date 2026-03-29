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
    
import { Sequelize } from "sequelize";
import { syncAllModels } from "./models/index.js";

// Server-level connection (no database selected)
const rootSequelize = new Sequelize("mysql://root:@localhost:3306/");

console.log("🔄 Creating database if not exists...");
try {
  await rootSequelize.query("CREATE DATABASE IF NOT EXISTS sirnicko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
  console.log("✅ Database 'sirnicko' ready");
} catch (err) {
  console.log("⚠️ Database may already exist, continuing...");
}

console.log("\n🔄 Syncing all models and creating tables...");
try {
  // Sync all models
  await syncAllModels();
  console.log("\n✅ All tables created successfully!");
  console.log("\n📋 Database Tables Created:");
  console.log("  ✓ Members");
  console.log("  ✓ Users (Admin/Staff)");
  console.log("  ✓ Programs & MemberPrograms");
  console.log("  ✓ Assets, AssetMaintenance, AssetUsage");
  console.log("  ✓ InventoryItem, InventoryTransaction, InventoryBatch");
  console.log("  ✓ ProductionLog, BiosecurityCheck");
  console.log("  ✓ Transaction, FinancialLedger");
  console.log("  ✓ SupplyRequest");
  console.log("  ✓ Notification, NotificationRead");
  console.log("  ✓ Sale");
  console.log("\n✅ Migration completed successfully!");
  console.log("\n🚀 You can now start the server with: npm run xian-start");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  console.error(err);
} finally {
  await rootSequelize.close();
  process.exit(0);
}
