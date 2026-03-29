import { Inquiry, User, Member, ProductionLog } from "../models/index.js";
import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

export const createInquiry = async (req, res) => {
  try {
    const body = req.body || {};
    const file = req.file;
    const picturePath = file ? `/uploads/${file.filename}` : null;

    // Serialize dynamic table rows (family, beneficiary, land)
    const familyMembers = [];
    const names = body['family_name[]'] || [];
    const relations = Array.isArray(body['family_relation[]']) ? body['family_relation[]'] : [body['family_relation[]']];
    const ages = Array.isArray(body['family_age[]']) ? body['family_age[]'] : [body['family_age[]']];
    const educations = Array.isArray(body['family_education[]']) ? body['family_education[]'] : [body['family_education[]']];
    const occupations = Array.isArray(body['family_occupation[]']) ? body['family_occupation[]'] : [body['family_occupation[]']];
    for (let i = 0; i < (Array.isArray(names) ? names.length : 1); i++) {
      if ((Array.isArray(names) ? names[i] : names) || (Array.isArray(relations) ? relations[i] : relations)) {
        familyMembers.push({
          pangalan: Array.isArray(names) ? names[i] : names,
          relasyon: Array.isArray(relations) ? relations[i] : relations,
          edad: Array.isArray(ages) ? ages[i] : ages,
          edukasyon: Array.isArray(educations) ? educations[i] : educations,
          hanapbuhay: Array.isArray(occupations) ? occupations[i] : occupations
        });
      }
    }

    const beneficiaries = [];
    const benNames = body['ben_name[]'] || [];
    const benRelations = Array.isArray(body['ben_relation[]']) ? body['ben_relation[]'] : [body['ben_relation[]']];
    const benAges = Array.isArray(body['ben_age[]']) ? body['ben_age[]'] : [body['ben_age[]']];
    for (let i = 0; i < (Array.isArray(benNames) ? benNames.length : 1); i++) {
      if ((Array.isArray(benNames) ? benNames[i] : benNames) || (Array.isArray(benRelations) ? benRelations[i] : benRelations)) {
        beneficiaries.push({
          pangalan: Array.isArray(benNames) ? benNames[i] : benNames,
          relasyon: Array.isArray(benRelations) ? benRelations[i] : benRelations,
          edad: Array.isArray(benAges) ? benAges[i] : benAges
        });
      }
    }

    const landRows = [];
    const crops = body['land_crop[]'] || [];
    const areas = Array.isArray(body['land_area[]']) ? body['land_area[]'] : [body['land_area[]']];
    const tenures = Array.isArray(body['land_tenure[]']) ? body['land_tenure[]'] : [body['land_tenure[]']];
    for (let i = 0; i < (Array.isArray(crops) ? crops.length : 1); i++) {
      if ((Array.isArray(crops) ? crops[i] : crops) || (Array.isArray(areas) ? areas[i] : areas)) {
        landRows.push({
          uri: Array.isArray(crops) ? crops[i] : crops,
          lawak: Array.isArray(areas) ? areas[i] : areas,
          tenure: Array.isArray(tenures) ? tenures[i] : tenures
        });
      }
    }

    const inquiry = await Inquiry.create({
      userId: req.session?.userId || null,
      fullName: body.fullName,
      address: body.address,
      birthday: body.birthday,
      age: body.age ? parseInt(body.age) : null,
      gender: body.gender,
      civilStatus: body.civilStatus,
      religion: body.religion,
      memberType: body.memberType,
      codeNumber: body.codeNumber,
      promisedCapital: body.promisedCapital,
      paidCapital: body.paidCapital,
      dependents: body.dependents ? parseInt(body.dependents) : null,
      occupation: body.occupation,
      annualIncome: body.annualIncome,
      contactNo: body.contactNo,
      otherCooperatives: body.otherCooperatives,
      familyInfo: JSON.stringify(familyMembers),
      beneficiaries: JSON.stringify(beneficiaries),
      landInfo: JSON.stringify(landRows),
      livestockInfo: JSON.stringify({
        pig_sow: body.pig_sow,
        pig_breeder: body.pig_breeder,
        pig_grower: body.pig_grower,
        chicken_layer: body.chicken_layer,
        chicken_broiler: body.chicken_broiler
      }),
      feedsInfo: body.feeds,
      goal: body.goal,
      contributionHelp: body.contributionHelp,
      picturePath,
      formData: JSON.stringify(body)
    });

    // Create a User account with the provided email and password
    let userId = null;
    if (body.email && body.password) {
      try {
        const hashedPassword = await bcrypt.hash(body.password, 10);
        const user = await User.create({
          name: body.fullName,
          email: body.email,
          password: hashedPassword,
          role: 'member',
          isActive: false // Set inactive until admin approves
        });
        userId = user.id;
        // Update inquiry with the new user ID
        inquiry.userId = userId;
        await inquiry.save();
      } catch (userError) {
        console.error('User creation error:', userError);
        // Continue even if user creation fails, but return a note in response
      }
    }

    res.json({ success: true, inquiryId: inquiry.id, userId, message: 'Inquiry submitted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInquiryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Inquiry.findByPk(id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    
    // Parse JSON fields for display
    const detail = inquiry.toJSON();
    detail.familyInfo = inquiry.familyInfo ? JSON.parse(inquiry.familyInfo) : [];
    detail.beneficiaries = inquiry.beneficiaries ? JSON.parse(inquiry.beneficiaries) : [];
    detail.landInfo = inquiry.landInfo ? JSON.parse(inquiry.landInfo) : [];
    detail.livestockInfo = inquiry.livestockInfo ? JSON.parse(inquiry.livestockInfo) : {};
    
    res.json({ success: true, inquiry: detail });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminListInquiries = async (req, res) => {
  try {
    // Get query params for search and pagination
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const limit = 10;
    const offset = (page - 1) * limit;
    // Case-insensitive search by name, email, or contact number
    let where = {};
    if (search) {
      where = {
        [Op.or]: [
          { fullName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { contactNo: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    // Sort alphabetically by fullName
    const { count, rows: inquiries } = await Inquiry.findAndCountAll({
      where,
      order: [['fullName','ASC']],
      limit,
      offset
    });
    const totalPages = Math.ceil(count / limit);
    res.render('admin/inquiries', { title: 'Inquiries', inquiries, page, totalPages, search });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // expected 'pending' or 'successful' or 'rejected'
    const inquiry = await Inquiry.findByPk(id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });

    inquiry.status = status;
    await inquiry.save();

    // Create email transporter. If no SMTP env vars provided, use Ethereal test account.
    let transporter;
    let usingTestAccount = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Create a test account for development (Ethereal)
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      usingTestAccount = true;
      console.log('No SMTP credentials found — using Ethereal test account', testAccount);
    }

    // Send email based on status
    let previewUrl = null;
    if (inquiry.email) {
      let mailOptions = {};
      
      if (status === 'pending') {
        mailOptions = {
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: inquiry.email,
          subject: 'Pending: Membership Seminar & Fees',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2>Hello ${inquiry.fullName},</h2>
              <p>Thank you for your inquiry to join Bansud Livestock Multi-Purpose Cooperative.</p>
              <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p><strong>Pending:</strong> Attend the upcoming Membership seminar.</p>
                <p>Please prepare <strong>10,000 pesos</strong> for Share Capital and <strong>200 pesos</strong> for Membership Fee.</p>
              </div>
              <p>We will notify you with the seminar schedule and next steps.</p>
              <p>Best regards,<br>Bansud Livestock Multi-Purpose Cooperative</p>
            </div>
          `
        };
      } else if (status === 'successful') {
        mailOptions = {
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: inquiry.email,
          subject: 'Successful: Membership Approved',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2>Successful: You are now a member!</h2>
              <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                <p><strong>Congratulations - your membership has been approved.</strong></p>
                <p>You are now a member of Bansud Livestock Multi-Purpose Cooperative.</p>
              </div>
              <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
                <p><strong>How to Log In:</strong></p>
                <p>Visit the Member Login page and use your registered credentials.</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Email:</strong> ${inquiry.email}</li>
                </ul>
                <p><strong>Member Login URL:</strong> <a href="http://localhost:3000/member/login" style="color: #2196F3;">http://localhost:3000/member/login</a></p>
              </div>
              <p>If you need help logging in, contact us.</p>
              <p>Best regards,<br>Bansud Livestock Multi-Purpose Cooperative</p>
            </div>
          `
        };
      } else if (status === 'rejected') {
        mailOptions = {
          from: process.env.EMAIL_USER || 'your-email@gmail.com',
          to: inquiry.email,
          subject: 'Your Membership Application Status',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2>Dear ${inquiry.fullName},</h2>
              <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <p><strong>Your membership application has been reviewed.</strong></p>
                <p>Unfortunately, we are unable to process your membership at this time.</p>
                <p>For more information, please contact us directly.</p>
              </div>
              <p>Thank you for your interest in our cooperative.</p>
              <p>Best regards,<br>Bansud Livestock Multi-Purpose Cooperative</p>
            </div>
          `
        };
      }

      // Send email if we have mail options
      if (Object.keys(mailOptions).length > 0) {
        try {
          console.log('Sending email to', mailOptions.to, 'subject:', mailOptions.subject);
          const info = await transporter.sendMail(mailOptions);
          console.log('Email send result:', info && info.messageId ? info.messageId : info);
          if (usingTestAccount) {
            previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL: ', previewUrl);
          }
        } catch (mailErr) {
          console.error('Error sending email:', mailErr && mailErr.message ? mailErr.message : mailErr);
          // keep going even if email fails; include error in response for debugging
          previewUrl = previewUrl || null;
        }
      }
    }

    // If marked successful, ensure a User exists (created earlier during inquiry or provided by admin now)
    if (status === 'successful') {
      let user = null;

      // If admin provided email/password in the status update form, prefer those
      const adminEmail = req.body.email;
      const adminPassword = req.body.password;

      if (adminEmail) {
        // Try to find an existing user by the provided email
        user = await User.findOne({ where: { email: adminEmail } });

        if (user) {
          // Update role/active state and optionally update password
          user.role = 'member';
          user.isActive = true;
          if (adminPassword) {
            try {
              user.password = await bcrypt.hash(adminPassword, 10);
            } catch (pwErr) {
              console.warn('Password hash error for admin-provided password:', pwErr.message);
            }
          }
          await user.save();
        } else {
          // Create new user with provided credentials
          try {
            const hashed = adminPassword ? await bcrypt.hash(adminPassword, 10) : await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
            user = await User.create({
              name: inquiry.fullName || adminEmail,
              email: adminEmail,
              password: hashed,
              role: 'member',
              isActive: true
            });
          } catch (createErr) {
            console.error('Error creating user from admin-provided email:', createErr.message);
          }
        }

        // Link inquiry to this user if not already linked
        if (user && !inquiry.userId) {
          inquiry.userId = user.id;
          await inquiry.save();
        }
      }

      // If no admin-provided email, but inquiry already linked to a user, use that user
      if (!user && inquiry.userId) {
        user = await User.findByPk(inquiry.userId);
        if (user) {
          user.role = 'member';
          user.isActive = true;
          // If admin supplied a password even when user existed, update it
          if (adminPassword) {
            try { user.password = await bcrypt.hash(adminPassword, 10); } catch (pwErr) { console.warn('Password hash error:', pwErr.message); }
          }
          await user.save();
        }
      }

      // If still no user but inquiry has email in formData or email field, create user using that email
      if (!user && inquiry.email) {
        try {
          const generatedPassword = adminPassword || Math.random().toString(36).slice(-8);
          const hashed = await bcrypt.hash(generatedPassword, 10);
          user = await User.create({
            name: inquiry.fullName || inquiry.email,
            email: inquiry.email,
            password: hashed,
            role: 'member',
            isActive: true
          });
          inquiry.userId = user.id;
          await inquiry.save();
        } catch (createErr) {
          console.error('Error auto-creating user from inquiry email:', createErr.message);
        }
      }

      // Create a corresponding Member record if it doesn't exist
      if (user) {
        try {
          const existingMember = await Member.findOne({ where: { email: user.email } });
          if (!existingMember) {
            const names = (inquiry.fullName || user.name || '').split(' ');
            const firstName = names[0] || 'Member';
            const lastName = names.slice(1).join(' ') || '';
            const memberId = `MEM-${Date.now()}-${Math.floor(Math.random()*9000+1000)}`;
            await Member.create({
              memberId,
              firstName,
              lastName,
              email: user.email,
              password: user.password, // hashed
              phone: inquiry.contactNo || null,
              address: inquiry.address || null,
              status: 'active',
              verified: true,
              shareBalance: 0,
              loanBalance: 0,
              patronageRefundAccrued: 0
            });
            console.log(`Member record created for user ${user.id} (${user.email})`);
          }
        } catch (memberError) {
          console.warn('Warning: Could not create Member record:', memberError.message);
        }
      }
    }

    // Include previewUrl in response if available (development/test)
    res.json({ success: true, previewUrl });
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateInquiryStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { step, seminarDate } = req.body;
    const validSteps = ['applied','seminar_scheduled','seminar_attended','documents_submitted','approved','rejected'];
    if (!validSteps.includes(step)) return res.status(400).json({ error: 'Invalid step' });

    const inquiry = await Inquiry.findByPk(id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });

    inquiry.membershipStep = step;
    if (seminarDate) inquiry.seminarSchedule = new Date(seminarDate);
    await inquiry.save();

    // Send email notification for seminar schedule
    if (step === 'seminar_scheduled' && inquiry.email && seminarDate) {
      try {
        let transporter;
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: testAccount.user, pass: testAccount.pass } });
        }
        const seminarDateStr = new Date(seminarDate).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });
        await transporter.sendMail({
          from: process.env.EMAIL_USER || 'noreply@blmc.local',
          to: inquiry.email,
          subject: 'BLMC Membership Seminar Schedule',
          html: `
            <div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
              <h2>Hello ${inquiry.fullName},</h2>
              <p>Your pre-membership seminar has been scheduled.</p>
              <div style="background:#e7f3ff;padding:15px;border-left:4px solid #2196F3;margin:20px 0;">
                <p><strong>Seminar Date & Time:</strong> ${seminarDateStr}</p>
                <p><strong>Location:</strong> BLMC Office, Poblacion, Bansud, Oriental Mindoro</p>
              </div>
              <p>Please prepare the following:</p>
              <ul>
                <li>Valid ID</li>
                <li>Membership Fee: ₱200.00</li>
                <li>Share Capital: ₱10,000.00</li>
              </ul>
              <p>Best regards,<br>Bansud Livestock Multi-Purpose Cooperative</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Seminar email error:', mailErr.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
