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

export const Program = sequelize.define("Program", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  type: { 
    type: DataTypes.ENUM('Poultry', 'Meat Processing', 'Loans', 'Other'), 
    allowNull: false 
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  programDate: { type: DataTypes.DATEONLY, allowNull: true }
});

export const MemberProgram = sequelize.define("MemberProgram", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  memberId: { type: DataTypes.STRING, allowNull: false },
  programId: { type: DataTypes.INTEGER, allowNull: false },
  enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  target: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  quota: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  status: { 
    type: DataTypes.ENUM('active', 'completed', 'cancelled'), 
    defaultValue: 'active'
  }
});

// Define relationships
MemberProgram.belongsTo(Program, { foreignKey: 'programId', as: 'Program' });
Program.hasMany(MemberProgram, { foreignKey: 'programId', as: 'MemberPrograms' });

export { sequelize };

