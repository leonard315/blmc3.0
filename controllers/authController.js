
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
    
import bcrypt from "bcrypt";
import { User, Member } from "../models/index.js";

export const loginPage = (req, res) => res.render("login", { title: "Admin Login" });
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/login");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error_msg", "Incorrect password");
      return res.redirect("/login");
    }
    if (!user.isActive) {
      req.flash("error_msg", "Account is inactive");
      return res.redirect("/login");
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    res.redirect("/admin/dashboard");
  } catch (error) {
    req.flash("error_msg", "Login error: " + error.message);
    res.redirect("/login");
  }
};

export const memberLoginPage = (req, res) => res.render("member/login", { title: "Member Login" });

export const memberLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Try to find member via Member model first
    let member = await Member.findOne({ where: { email } });
    let memberId = null;
    
    if (!member) {
      // If not found in Member table, check User table (new inquiry-based members)
      const user = await User.findOne({ where: { email } });
      if (!user) {
        req.flash("error_msg", "Member account not found");
        return res.redirect("/member/login");
      }
      
      // Verify password against User record
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        req.flash("error_msg", "Incorrect password");
        return res.redirect("/member/login");
      }
      
      // Check if user is active and has member role
      if (!user.isActive || user.role !== 'member') {
        req.flash("error_msg", "Account is not active or not a member. Please contact administrator.");
        return res.redirect("/member/login");
      }
      
      // For User-based login, store userId as memberId equivalent in session
      req.session.memberId = `USER-${user.id}`;
      req.session.userId = user.id;
      req.session.userRole = 'member';
      return res.redirect("/member/dashboard");
    }
    
    // Original Member model login flow
    const match = await bcrypt.compare(password, member.password);
    if (!match) {
      req.flash("error_msg", "Incorrect password");
      return res.redirect("/member/login");
    }
    
    if (member.status !== 'active') {
      req.flash("error_msg", "Account is not active. Please contact administrator.");
      return res.redirect("/member/login");
    }
    
    // Store memberId (string) in session
    req.session.memberId = member.memberId;
    res.redirect("/member/dashboard");
  } catch (error) {
    req.flash("error_msg", "Login error: " + error.message);
    res.redirect("/member/login");
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashed,
      role: role || 'staff'
    });
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.flash("success_msg", "User registered successfully");
    res.redirect("/admin/dashboard");
  } catch (error) {
    req.flash("error_msg", "Registration error: " + error.message);
    res.redirect("/register");
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy();
  res.redirect("/login");
};
