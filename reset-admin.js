import bcrypt from "bcrypt";
import { User } from "./models/index.js";
import { sequelize } from "./models/db.js";

console.log("🔐 Admin Password Reset Tool\n");

try {
  await sequelize.authenticate();
  console.log("✅ Database connected\n");

  // Find admin user
  const admin = await User.findOne({ where: { role: 'admin' } });

  if (!admin) {
    console.log("❌ No admin account found!");
    console.log("\n💡 Run 'npm run seed' to create default admin account");
    process.exit(1);
  }

  console.log("📋 Current Admin Account:");
  console.log(`   Name: ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Active: ${admin.isActive}`);

  // Reset password to default
  const newPassword = "admin123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await admin.update({ 
    password: hashedPassword,
    isActive: true 
  });

  console.log("\n✅ Password reset successfully!");
  console.log("\n🔐 New Credentials:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: ${newPassword}`);
  console.log("\n🚀 Login at: http://localhost:3000/login");
  console.log("\n⚠️  Please change this password after logging in!");

} catch (error) {
  console.error("\n❌ Error:", error.message);
} finally {
  await sequelize.close();
  process.exit(0);
}
