// Simple notification page for /admin/notification (renders notification.xian)
export const adminNotificationSimplePage = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']]
    });
    const unreadCount = await Notification.count({ where: { published: false } });
    res.render("admin/notification", {
      title: "Notifications",
      notifications: notifications || [],
      unreadCount
    });
  } catch (error) {
    req.flash("error_msg", "Error loading notifications: " + error.message);
    res.render("admin/notification", {
      title: "Notifications",
      notifications: [],
      unreadCount: 0
    });
  }
};
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
import { Notification, NotificationRead } from "../models/index.js";
import { Op } from "sequelize";

export const notificationList = async (req, res) => {
  try {
    const memberId = req.session.memberId;
    const { sequelize } = await import("../models/notificationModel.js");
    
    const notifications = await Notification.findAll({
      where: {
        published: true,
        [Op.or]: [
          { targetAudience: 'all' },
          { targetAudience: 'members' },
          sequelize.literal(`targetAudience = 'specific' AND JSON_CONTAINS(specificMemberIds, '"${memberId}"')`)
        ]
      },
      order: [['publishedAt', 'DESC']],
      limit: 50
    });
    
    // Mark read status
    const readNotifications = await NotificationRead.findAll({
      where: { memberId },
      attributes: ['notificationId']
    });
    const readIds = readNotifications.map(r => r.notificationId);
    
    const notificationsWithRead = (notifications || []).map(notif => ({
      ...notif.toJSON(),
      isRead: readIds.includes(notif.id),
      isReceipt: notif.title && (
        notif.title.includes('Receipt') ||
        notif.title.includes('Deposit') ||
        notif.title.includes('Withdrawal') ||
        notif.title.includes('Patronage Refund') ||
        notif.title.includes('POS Sale')
      )
    }));
    
    res.render("member/notifications", {
      title: "Notifications",
      notifications: notificationsWithRead
    });
  } catch (error) {
    req.flash("error_msg", "Error loading notifications: " + error.message);
    res.render("member/notifications", {
      title: "Notifications",
      notifications: []
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = req.session.memberId;
    
    const existing = await NotificationRead.findOne({
      where: { notificationId: id, memberId }
    });
    
    if (!existing) {
      await NotificationRead.create({
        notificationId: parseInt(id),
        memberId
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminNotificationList = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.render("admin/notifications", {
      title: "Notification Management",
      notifications: notifications || []
    });
  } catch (error) {
    req.flash("error_msg", "Error loading notifications: " + error.message);
    res.render("admin/notifications", {
      title: "Notification Management",
      notifications: []
    });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { title, titleTagalog, content, contentTagalog, type, targetAudience, priority, specificMemberIds } = req.body;
    
    await Notification.create({
      title,
      titleTagalog,
      content,
      contentTagalog,
      type,
      targetAudience,
      priority,
      specificMemberIds: specificMemberIds ? JSON.parse(specificMemberIds) : null,
      published: false,
      createdBy: req.session.userId
    });
    
    req.flash("success_msg", "Notification created successfully");
    res.redirect("/admin/notifications");
  } catch (error) {
    req.flash("error_msg", "Error creating notification: " + error.message);
    res.redirect("/admin/notifications");
  }
};

export const publishNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    
    if (!notification) {
      req.flash("error_msg", "Notification not found");
      return res.redirect("/admin/notifications");
    }
    
    notification.published = true;
    notification.publishedAt = new Date();
    await notification.save();
    
    req.flash("success_msg", "Notification published successfully");
    res.redirect("/admin/notifications");
  } catch (error) {
    req.flash("error_msg", "Error publishing notification: " + error.message);
    res.redirect("/admin/notifications");
  }
};

