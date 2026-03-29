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

export const Sale = sequelize.define("Sale", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  saleType: { 
    type: DataTypes.ENUM('pos', 'bulk_order', 'counter'), 
    allowNull: false 
  },
  customerName: { type: DataTypes.STRING, allowNull: true },
  customerType: { 
    type: DataTypes.ENUM('walk_in', 'institutional', 'member'), 
    allowNull: true 
  },
  items: { type: DataTypes.JSON, allowNull: false }, // Array of {itemId, quantity, unitPrice}
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentMethod: { 
    type: DataTypes.ENUM('cash', 'digital', 'credit'), 
    allowNull: false 
  },
  paymentStatus: { 
    type: DataTypes.ENUM('pending', 'paid', 'partial'), 
    defaultValue: 'paid'
  },
  orderStatus: { 
    type: DataTypes.ENUM('pending', 'processing', 'fulfilled', 'cancelled'), 
    defaultValue: 'pending'
  },
  orderDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fulfilledAt: { type: DataTypes.DATE, allowNull: true },
  processedBy: { type: DataTypes.INTEGER, allowNull: false }, // Admin/Staff ID
  notes: { type: DataTypes.TEXT, allowNull: true }
});

export { sequelize };



