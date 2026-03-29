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
import { InventoryItem, Member, User } from "./models/index.js";

console.log("🌱 Seeding database with sample data...\n");

try {
  // Seed Inventory Items (10 products)
  console.log("📦 Creating inventory items...");
  const inventoryItems = [
    {
      name: "Starter Feed (25kg)",
      category: "feeds",
      unit: "bag",
      unitPrice: 1250.00,
      currentStock: 150,
      reorderPoint: 50,
      isPerishable: false,
      expiryTracking: false
    },
    {
      name: "Grower Feed (25kg)",
      category: "feeds",
      unit: "bag",
      unitPrice: 1180.00,
      currentStock: 120,
      reorderPoint: 40,
      isPerishable: false,
      expiryTracking: false
    },
    {
      name: "Layer Feed (25kg)",
      category: "feeds",
      unit: "bag",
      unitPrice: 1150.00,
      currentStock: 200,
      reorderPoint: 60,
      isPerishable: false,
      expiryTracking: false
    },
    {
      name: "Broiler Starter Chicks (100 pcs)",
      category: "chicks",
      unit: "box",
      unitPrice: 850.00,
      currentStock: 25,
      reorderPoint: 10,
      isPerishable: true,
      expiryTracking: false
    },
    {
      name: "Layer Chicks (100 pcs)",
      category: "chicks",
      unit: "box",
      unitPrice: 900.00,
      currentStock: 30,
      reorderPoint: 12,
      isPerishable: true,
      expiryTracking: false
    },
    {
      name: "Antibiotic Powder (1kg)",
      category: "medicine",
      unit: "kg",
      unitPrice: 450.00,
      currentStock: 15,
      reorderPoint: 5,
      isPerishable: true,
      expiryTracking: true
    },
    {
      name: "Vitamin Supplement (1L)",
      category: "medicine",
      unit: "bottle",
      unitPrice: 380.00,
      currentStock: 45,
      reorderPoint: 15,
      isPerishable: true,
      expiryTracking: true
    },
    {
      name: "Disinfectant (5L)",
      category: "medicine",
      unit: "bottle",
      unitPrice: 420.00,
      currentStock: 20,
      reorderPoint: 8,
      isPerishable: false,
      expiryTracking: true
    },
    {
      name: "Egg Trays (30 pcs)",
      category: "feeds",
      unit: "set",
      unitPrice: 150.00,
      currentStock: 100,
      reorderPoint: 30,
      isPerishable: false,
      expiryTracking: false
    },
    {
      name: "Feeding Trough (Large)",
      category: "feeds",
      unit: "piece",
      unitPrice: 850.00,
      currentStock: 35,
      reorderPoint: 12,
      isPerishable: false,
      expiryTracking: false
    }
    ,
    // BOUNTY FEEDS and other requested items
    { name: 'Pansisiw (for chick recovery)', category: 'feeds', unit: 'bag', unitPrice: 220.00, currentStock: 80, reorderPoint: 20, isPerishable: false, expiryTracking: false },
    { name: 'Chicken Feed (Layer 25kg)', category: 'chicken_feeds', unit: 'bag', unitPrice: 1150.00, currentStock: 200, reorderPoint: 50, isPerishable: false, expiryTracking: false },
    { name: 'Broiler Feed (25kg)', category: 'broiler_feeds', unit: 'bag', unitPrice: 1180.00, currentStock: 140, reorderPoint: 40, isPerishable: false, expiryTracking: false },
    { name: 'Cat Food (5kg)', category: 'pet_food', unit: 'bag', unitPrice: 520.00, currentStock: 60, reorderPoint: 10, isPerishable: false, expiryTracking: false },
    { name: 'Dog Food (5kg)', category: 'pet_food', unit: 'bag', unitPrice: 560.00, currentStock: 50, reorderPoint: 10, isPerishable: false, expiryTracking: false },
    { name: 'UNO FEEDS (25kg)', category: 'uno_feeds', unit: 'bag', unitPrice: 1300.00, currentStock: 75, reorderPoint: 20, isPerishable: false, expiryTracking: false },
    // Hog feed categories
    { name: 'Hog Feed - Pre-Starter (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1400.00, currentStock: 60, reorderPoint: 15, isPerishable: false, expiryTracking: false },
    { name: 'Hog Feed - Starter Pellet (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1350.00, currentStock: 70, reorderPoint: 20, isPerishable: false, expiryTracking: false },
    { name: 'Hog Feed - Grower (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1280.00, currentStock: 90, reorderPoint: 25, isPerishable: false, expiryTracking: false },
    { name: 'Hog Feed - Finisher (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1220.00, currentStock: 80, reorderPoint: 20, isPerishable: false, expiryTracking: false },
    { name: 'Hog Feed - Breeder (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1500.00, currentStock: 40, reorderPoint: 10, isPerishable: false, expiryTracking: false },
    { name: 'Hog Feed - Lactating (25kg)', category: 'hog_feeds', unit: 'bag', unitPrice: 1550.00, currentStock: 30, reorderPoint: 8, isPerishable: false, expiryTracking: false },
    // Additional products
    { name: 'Rice (50kg)', category: 'grains', unit: 'sack', unitPrice: 2200.00, currentStock: 120, reorderPoint: 30, isPerishable: false, expiryTracking: false },
    { name: 'Fresh Chicken (per kg)', category: 'fresh_meat', unit: 'kg', unitPrice: 180.00, currentStock: 60, reorderPoint: 10, isPerishable: true, expiryTracking: true },
    { name: 'Fresh Beef (per kg)', category: 'fresh_meat', unit: 'kg', unitPrice: 350.00, currentStock: 40, reorderPoint: 8, isPerishable: true, expiryTracking: true },
    { name: 'Longganisa (per pack)', category: 'processed_meat', unit: 'pack', unitPrice: 120.00, currentStock: 80, reorderPoint: 20, isPerishable: true, expiryTracking: true },
    { name: 'Tocino (per pack)', category: 'processed_meat', unit: 'pack', unitPrice: 140.00, currentStock: 70, reorderPoint: 15, isPerishable: true, expiryTracking: true },
    { name: 'Skinless Sausages (per pack)', category: 'processed_meat', unit: 'pack', unitPrice: 160.00, currentStock: 65, reorderPoint: 12, isPerishable: true, expiryTracking: true },
    // Water station service (admin edits stock/price; members can see and request)
    { name: 'Water Station (liters available)', category: 'service', unit: 'liter', unitPrice: 5.00, currentStock: 10000, reorderPoint: 1000, isPerishable: false, expiryTracking: false }
  ];

  for (const item of inventoryItems) {
    const [inventoryItem, created] = await InventoryItem.findOrCreate({
      where: { name: item.name },
      defaults: item
    });
    if (created) {
      console.log(`  ✓ Created: ${item.name}`);
    } else {
      console.log(`  ⚠ Already exists: ${item.name}`);
    }
  }

  // Seed Members (3 members)
  console.log("\n👥 Creating members...");
  const members = [
    {
      memberId: "BLMC-2025-1001",
      firstName: "Juan",
      lastName: "Dela Cruz",
      middleName: "Santos",
      email: "juan.delacruz@blmc.com",
      password: await bcrypt.hash("member123", 10),
      phone: "+63 912 345 6789",
      address: "Barangay Poblacion, Bansud, Oriental Mindoro",
      status: "active",
      verified: true,
      verifiedBy: 1,
      verifiedAt: new Date(),
      shareBalance: 5000.00,
      loanBalance: 2500.00,
      patronageRefundAccrued: 1250.00
    },
    {
      memberId: "BLMC-2025-1002",
      firstName: "Maria",
      lastName: "Santos",
      middleName: "Reyes",
      email: "maria.santos@blmc.com",
      password: await bcrypt.hash("member123", 10),
      phone: "+63 923 456 7890",
      address: "Barangay Pag-asa, Bansud, Oriental Mindoro",
      status: "active",
      verified: true,
      verifiedBy: 1,
      verifiedAt: new Date(),
      shareBalance: 7500.00,
      loanBalance: 1500.00,
      patronageRefundAccrued: 2100.00
    },
    {
      memberId: "BLMC-2025-1003",
      firstName: "Pedro",
      lastName: "Garcia",
      middleName: "Torres",
      email: "pedro.garcia@blmc.com",
      password: await bcrypt.hash("member123", 10),
      phone: "+63 934 567 8901",
      address: "Barangay Proper, Bansud, Oriental Mindoro",
      status: "active",
      verified: true,
      verifiedBy: 1,
      verifiedAt: new Date(),
      shareBalance: 10000.00,
      loanBalance: 0.00,
      patronageRefundAccrued: 3500.00
    }
  ];

  for (const member of members) {
    const [newMember, created] = await Member.findOrCreate({
      where: { memberId: member.memberId },
      defaults: member
    });
    if (created) {
      console.log(`  ✓ Created: ${member.firstName} ${member.lastName} (${member.memberId})`);
      console.log(`    Email: ${member.email} | Password: member123`);
    } else {
      console.log(`  ⚠ Already exists: ${member.memberId}`);
    }
  }

  // Create default admin account (change email/password after seeding)
  console.log("\n🔐 Creating default admin account...");
  const adminEmail = "admin@blmc.local";
  const adminPassword = "admin123"; // change this after first login
  try {
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: "BLMC Administrator",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: 'admin',
        isActive: true
      }
    });
    if (adminCreated) console.log(`  ✓ Created admin: ${adminEmail} | Password: ${adminPassword}`);
    else console.log(`  ⚠ Admin already exists: ${adminEmail}`);
  } catch (err) {
    console.error("  ❌ Failed to create admin:", err.message);
  }

  console.log("\n✅ Seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`  - ${inventoryItems.length} inventory items`);
  console.log(`  - ${members.length} members`);
  console.log("\n💡 Member Login Credentials:");
  members.forEach(m => {
    console.log(`  ${m.memberId}: ${m.email} / member123`);
  });
  
} catch (error) {
  console.error("❌ Seeding failed:", error);
  console.error(error.stack);
} finally {
  process.exit(0);
}

