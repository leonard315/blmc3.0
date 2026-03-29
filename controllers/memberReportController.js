import { Notification, Member } from "../models/index.js";

const memberReportController = {
  reportPage: (req, res) => {
    res.render("member/report", { title: "Feedback", success_msg: req.flash("success_msg"), error_msg: req.flash("error_msg") });
  },
  submitReport: async (req, res) => {
    try {
      const memberId = req.session.memberId;
      const { subject, message } = req.body;

      if (!subject || !message) {
        req.flash("error_msg", "Subject and message are required.");
        return res.redirect("/member/report");
      }

      // Get member name for context
      const member = await Member.findOne({ where: { memberId }, attributes: ['firstName', 'lastName'] });
      const memberName = member ? `${member.firstName} ${member.lastName}` : memberId;

      // Create notification visible to admins (published: false = unread for admin review)
      await Notification.create({
        title: `Feedback from ${memberName}: ${subject}`,
        content: `From: ${memberName} (${memberId})\n\n${message}`,
        type: 'alert',
        targetAudience: 'admins',
        priority: 'high',
        published: false,
        createdBy: null
      });

      req.flash("success_msg", "Your feedback has been submitted. The admin will review it shortly.");
      res.redirect("/member/report");
    } catch (error) {
      req.flash("error_msg", "Error submitting feedback: " + error.message);
      res.redirect("/member/report");
    }
  }
};

export default memberReportController;
