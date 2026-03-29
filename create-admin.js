/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import bcrypt from "bcrypt";
import inquirer from "inquirer";
import { User } from "./models/index.js";
import { sequelize } from "./models/db.js";

console.log("🔐 BLMC Admin Account Creator\n");

try {
  // Ensure database connection
  await sequelize.authenticate();
  console.log("✅ Database connected\n");

  // Prompt for admin details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Admin Name:',
      default: 'BLMC Administrator',
      validate: (input) => input.trim().length > 0 || 'Name is required'
    },
    {
      type: 'input',
      name: 'email',
      message: 'Admin Email:',
      default: 'admin@blmc.local',
      validate: (input) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Please enter a valid email';
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Admin Password:',
      mask: '*',
      validate: (input) => input.length >= 6 || 'Password must be at least 6 characters'
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm Password:',
      mask: '*',
      validate: (input, answers) => input === answers.password || 'Passwords do not match'
    }
  ]);

  // Check if email already exists
  const existingUser = await User.findOne({ where: { email: answers.email } });
  
  if (existingUser) {
    console.log("\n⚠️  User with this email already exists!");
    
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to update this user to admin?',
        default: false
      }
    ]);

    if (overwrite) {
      // Update existing user
      const hashedPassword = await bcrypt.hash(answers.password, 10);
      await existingUser.update({
        name: answers.name,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log("\n✅ Admin account updated successfully!");
    } else {
      console.log("\n❌ Operation cancelled");
      process.exit(0);
    }
  } else {
    // Create new admin user
    const hashedPassword = await bcrypt.hash(answers.password, 10);
    
    await User.create({
      name: answers.name,
      email: answers.email,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    console.log("\n✅ Admin account created successfully!");
  }

  console.log("\n📋 Admin Credentials:");
  console.log(`   Name: ${answers.name}`);
  console.log(`   Email: ${answers.email}`);
  console.log(`   Password: ${answers.password}`);
  console.log("\n🔒 Please keep these credentials secure!");
  console.log("\n🚀 You can now login at: http://localhost:3000/login");

} catch (error) {
  console.error("\n❌ Error creating admin account:", error.message);
  console.error(error);
} finally {
  await sequelize.close();
  process.exit(0);
}
