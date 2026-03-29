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

export const Member = sequelize.define("Member", {
  memberId: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    primaryKey: true
  },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  middleName: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  status: { 
    type: DataTypes.ENUM('pending', 'active', 'inactive', 'delinquent'), 
    defaultValue: 'pending'
  },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  shareBalance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  loanBalance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  patronageRefundAccrued: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export { sequelize };
