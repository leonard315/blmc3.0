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

export const Asset = sequelize.define("Asset", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { 
    type: DataTypes.ENUM('Vehicle', 'Equipment', 'Building', 'Other'), 
    allowNull: false 
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  purchaseDate: { type: DataTypes.DATE, allowNull: true },
  purchasePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  currentValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  status: { 
    type: DataTypes.ENUM('active', 'maintenance', 'retired'), 
    defaultValue: 'active'
  }
});

export const AssetMaintenance = sequelize.define("AssetMaintenance", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  maintenanceDate: { type: DataTypes.DATE, allowNull: false },
  maintenanceType: { 
    type: DataTypes.ENUM('routine', 'repair', 'inspection'), 
    allowNull: false 
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  performedBy: { type: DataTypes.STRING, allowNull: true }
});

export const AssetUsage = sequelize.define("AssetUsage", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  usageDate: { type: DataTypes.DATE, allowNull: false },
  purpose: { type: DataTypes.STRING, allowNull: true },
  assignedTo: { type: DataTypes.STRING, allowNull: true }, // Member ID or Staff
  notes: { type: DataTypes.TEXT, allowNull: true }
});

export { sequelize };


