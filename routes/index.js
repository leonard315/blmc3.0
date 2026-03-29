
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
    
import express from "express";
import { homePage } from "../controllers/homeController.js";
import { contactPage, featureProgramsPage, featureInventoryPage, featureFinancialPage, aboutPage } from "../controllers/homeController.js";
import { 
  loginPage, 
  registerPage, 
  forgotPasswordPage, 
  loginUser, 
  registerUser, 
  logoutUser,
  memberLoginPage,
  memberLogin
} from "../controllers/authController.js";
import adminRoutes from "./adminRoutes.js";
import memberRoutes from "./memberRoutes.js";
import apiRoutes from "./apiRoutes.js";
import posRoutes from "./posRoutes.js";

const router = express.Router();

// Home
router.get("/", homePage);
router.get("/contact", contactPage);

// Dashboard redirect - redirect to appropriate dashboard based on session
router.get("/dashboard", (req, res) => {
  if (req.session.userId) {
    // Admin or staff user
    return res.redirect("/admin/dashboard");
  } else if (req.session.memberId) {
    // Member user
    return res.redirect("/member/dashboard");
  } else {
    // Not logged in
    return res.redirect("/login");
  }
});

// Features pages
router.get('/features/programs', featureProgramsPage);
router.get('/features/inventory', featureInventoryPage);
router.get('/features/financial', featureFinancialPage);

// About
router.get('/about', aboutPage);

// Admin/Staff Auth
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/logout", logoutUser);

// Member Auth
router.get("/member/login", memberLoginPage);
router.post("/member/login", memberLogin);
router.get("/member/logout", logoutUser);

// API Routes (for mobile app)
router.use("/api", apiRoutes);

// Admin Routes
router.use("/admin", adminRoutes);

// Member Routes
router.use("/member", memberRoutes);

// POS Routes
router.use("/pos", posRoutes);

export default router;
