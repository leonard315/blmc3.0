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

export const Transaction = sequelize.define("Transaction", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  memberId: { type: DataTypes.STRING, allowNull: true }, // null for non-member sales
  transactionType: { 
    type: DataTypes.ENUM('remittance', 'supply_distribution', 'loan', 'payment', 'sale', 'dividend', 'patronage_refund'), 
    allowNull: false 
  },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  productType: { 
    type: DataTypes.ENUM('eggs', 'chicken', 'processed_meat', 'other'), 
    allowNull: true 
  },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  paymentMethod: { 
    type: DataTypes.ENUM('cash', 'digital', 'credit'), 
    allowNull: true 
  },
  referenceNumber: { type: DataTypes.STRING, allowNull: true },
  transactionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  processedBy: { type: DataTypes.INTEGER, allowNull: true } // Admin/Staff ID
});

export const FinancialLedger = sequelize.define("FinancialLedger", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  memberId: { type: DataTypes.STRING, allowNull: false },
  transactionId: { type: DataTypes.INTEGER, allowNull: true },
  entryType: { 
    type: DataTypes.ENUM('debit', 'credit'), 
    allowNull: false 
  },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // Running balance
  category: { 
    type: DataTypes.ENUM('share', 'loan', 'patronage_refund', 'dividend', 'remittance', 'supply'), 
    allowNull: false 
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  ledgerDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  ,productName: { type: DataTypes.STRING, allowNull: true }
  ,quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
  ,totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
});

export { sequelize };


