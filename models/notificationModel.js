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

export const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  titleTagalog: { type: DataTypes.STRING, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  contentTagalog: { type: DataTypes.TEXT, allowNull: true },
  type: { 
    type: DataTypes.ENUM('announcement', 'alert', 'training', 'urgent'), 
    allowNull: false 
  },
  targetAudience: { 
    type: DataTypes.ENUM('all', 'members', 'admins', 'specific'), 
    defaultValue: 'all'
  },
  specificMemberIds: { type: DataTypes.JSON, allowNull: true }, // Array of member IDs if specific
  priority: { 
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), 
    defaultValue: 'medium'
  },
  published: { type: DataTypes.BOOLEAN, defaultValue: false },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true } // Admin ID
});

export const NotificationRead = sequelize.define("NotificationRead", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  notificationId: { type: DataTypes.INTEGER, allowNull: false },
  memberId: { type: DataTypes.STRING, allowNull: false },
  readAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

export { sequelize };


