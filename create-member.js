import { Member } from "./models/index.js";
import { sequelize } from "./models/db.js";
import bcrypt from "bcrypt";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function createMember() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Get member details
    const name = await question("Enter member name (default: Kenn Napa): ") || "Kenn Napa";
    const email = await question("Enter email (default: kenn.napa@blmc.local): ") || "kenn.napa@blmc.local";
    const phone = await question("Enter phone (default: 09123456789): ") || "09123456789";
    const address = await question("Enter address (default: Bansud, Oriental Mindoro): ") || "Bansud, Oriental Mindoro";
    const password = await question("Enter password (default: password123): ") || "password123";

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create member
    const member = await Member.create({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      status: "active",
      share_balance: 0,
      savings_balance: 0,
    });

    console.log("\n✅ Member created successfully!");
    console.log("📋 Member Details:");
    console.log(`   ID: ${member.id}`);
    console.log(`   Name: ${member.name}`);
    console.log(`   Email: ${member.email}`);
    console.log(`   Phone: ${member.phone}`);
    console.log(`   Address: ${member.address}`);
    console.log(`   Status: ${member.status}`);
    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${member.email}`);
    console.log(`   Password: ${password}`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating member:", error.message);
    rl.close();
    process.exit(1);
  }
}

createMember();
