import { Notification } from "../models/index.js";

export const seedAdminNotification = async (req, res) => {
  try {
    await Notification.create({
      title: "Test Notification",
      content: "This is a test notification for admin.",
      type: "announcement",
      targetAudience: "admins",
      priority: "medium",
      published: true,
      publishedAt: new Date(),
      createdBy: 1
    });
    res.send("Test notification created.");
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
};
