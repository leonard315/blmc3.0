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
import { User, Member } from "../models/index.js";
import { Op } from "sequelize";

// Check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
  if (!req.session.userId && !req.session.memberId) {
    return res.redirect("/login");
  }
  // Attach unread notification count for sidebar badge (admin or member)
  try {
    // Only compute unread counts for member/admin page requests to avoid running DB queries
    // on asset routes or API endpoints where session may not be set yet.
    const path = req.path || '';
    const shouldCompute = path.startsWith('/member') || path.startsWith('/admin') || path === '/member' || path === '/admin';
    if (!shouldCompute) {
      res.locals.unreadCount = 0;
      return next();
    }
    if (req.session.userId) {
      // Admin: lazily import Notification and count unpublished notifications for admin review
      const models = await import("../models/index.js");
      const { Notification } = models;
      const adminUnread = await Notification.count({ where: { published: false } });
      res.locals.unreadCount = adminUnread || 0;
    } else if (req.session.memberId) {
      // Member: lazily import Notification, NotificationRead and notificationModel's sequelize for JSON queries
      const memberId = req.session.memberId;
      const models = await import("../models/index.js");
      const { Notification, NotificationRead } = models;
      const notifModule = await import("../models/notificationModel.js");
      const { sequelize: notifSequelize } = notifModule;

      // Fetch published notifications visible to this member
      const notifications = await Notification.findAll({
        where: {
          published: true,
          [Op.or]: [
            { targetAudience: 'all' },
            { targetAudience: 'members' },
            // Match specific audience where specificMemberIds JSON contains this memberId
            notifSequelize.literal(`targetAudience = 'specific' AND JSON_CONTAINS(specificMemberIds, '["${memberId}"]')`)
          ]
        },
        attributes: ['id']
      });

      const read = await NotificationRead.findAll({ where: { memberId }, attributes: ['notificationId'] });
      const readIds = new Set(read.map(r => r.notificationId));
      const unread = (notifications || []).filter(n => !readIds.has(n.id)).length;
      res.locals.unreadCount = unread || 0;
    }
  } catch (err) {
    console.error('Error computing unread notifications:', err);
    res.locals.unreadCount = 0;
  }
  next();
};

// Check if user has admin or staff role
export const isAdminOrStaff = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      req.flash("error_msg", "Access denied. Admin or Staff privileges required.");
      return res.redirect("/dashboard");
    }
    req.user = user;
    next();
  } catch (error) {
    req.flash("error_msg", "Authentication error");
    return res.redirect("/login");
  }
};

// Check if user has admin role only
export const isAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || user.role !== 'admin') {
      req.flash("error_msg", "Access denied. Admin privileges required.");
      return res.redirect("/dashboard");
    }
    req.user = user;
    next();
  } catch (error) {
    req.flash("error_msg", "Authentication error");
    return res.redirect("/login");
  }
};

// Check if user is a member
export const isMember = async (req, res, next) => {
  if (!req.session.memberId) {
    return res.redirect("/member/login");
  }
  
  try {
    // Find by memberId (string) not id (integer)
    const member = await Member.findOne({ where: { memberId: req.session.memberId } });
    if (!member || member.status !== 'active') {
      req.flash("error_msg", "Account not active. Please contact administrator.");
      return res.redirect("/member/login");
    }
    req.member = member;
    next();
  } catch (error) {
    req.flash("error_msg", "Authentication error");
    return res.redirect("/member/login");
  }
};

