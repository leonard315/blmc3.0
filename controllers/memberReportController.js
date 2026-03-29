import { Notification } from "../models/index.js";

const memberReportController = {
  reportPage: (req, res) => {
    res.render("member/report", { title: "Report an Issue", success_msg: req.flash("success_msg"), error_msg: req.flash("error_msg") });
  },
  submitReport: async (req, res) => {
    try {
      const memberId = req.session.memberId;
      const { subject, message } = req.body;
      await Notification.create({
        title: `Member Report: ${subject}`,
        content: message,
        type: 'alert',
        targetAudience: 'admin',
        priority: 'high',
        published: false, // Mark as unread for admin
        createdBy: memberId
      });
      req.flash("success_msg", "Your report has been submitted to the admin.");
      res.redirect("/member/report");
    } catch (error) {
      req.flash("error_msg", "Error submitting report: " + error.message);
      res.redirect("/member/report");
    }
  }
};

export default memberReportController;
