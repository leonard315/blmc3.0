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
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const InventoryItem = sequelize.define("InventoryItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  // Use a flexible string category to allow adding new categories without
  // needing to modify the DB enum type every time.
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: { type: DataTypes.STRING, allowNull: false }, // kg, bags, pieces, etc.
  currentStock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  reorderPoint: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  isPerishable: { type: DataTypes.BOOLEAN, defaultValue: false },
  expiryTracking: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export const InventoryTransaction = sequelize.define("InventoryTransaction", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  itemId: { type: DataTypes.INTEGER, allowNull: false },
  transactionType: { 
    type: DataTypes.ENUM('purchase', 'sale', 'distribution', 'adjustment', 'spoilage'), 
    allowNull: false 
  },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  batchNumber: { type: DataTypes.STRING, allowNull: true }, // For FIFO tracking
  expiryDate: { type: DataTypes.DATE, allowNull: true },
  receivedDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  relatedMemberId: { type: DataTypes.STRING, allowNull: true }, // If distributed to member
  notes: { type: DataTypes.TEXT, allowNull: true },
  processedBy: { type: DataTypes.INTEGER, allowNull: true } // Admin/Staff ID
});

// FIFO tracking - tracks which batches are consumed first
export const InventoryBatch = sequelize.define("InventoryBatch", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  itemId: { type: DataTypes.INTEGER, allowNull: false },
  batchNumber: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  remainingQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  receivedDate: { type: DataTypes.DATE, allowNull: false },
  expiryDate: { type: DataTypes.DATE, allowNull: true },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

export { sequelize };


