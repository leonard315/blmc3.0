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

export const ProductionLog = sequelize.define("ProductionLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  memberId: { type: DataTypes.STRING, allowNull: false },
  logDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  feedIntake: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // kg
  mortalityRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true }, // percentage
  mortalityCount: { type: DataTypes.INTEGER, allowNull: true },
  eggYield: { type: DataTypes.INTEGER, allowNull: true }, // pieces
  harvestYield: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // kg
  notes: { type: DataTypes.TEXT, allowNull: true },
  synced: { type: DataTypes.BOOLEAN, defaultValue: true }, // For offline sync
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export const BiosecurityCheck = sequelize.define("BiosecurityCheck", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  memberId: { type: DataTypes.STRING, allowNull: false },
  checkDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  temperature: { type: DataTypes.DECIMAL(5, 2), allowNull: true }, // Celsius
  sanitationStatus: { 
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'), 
    allowNull: true 
  },
  visualHealthCheck: { 
    type: DataTypes.ENUM('healthy', 'sick', 'suspicious'), 
    allowNull: true 
  },
  issues: { type: DataTypes.TEXT, allowNull: true },
  actionsTaken: { type: DataTypes.TEXT, allowNull: true },
  synced: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export { sequelize };


