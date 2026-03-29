/*
  Script to ensure all members have a share balance of 10,000 if missing or zero.
  Usage: node scripts/fixShareBalance.js
*/
import { Member } from "../models/index.js";

(async () => {
  try {
    const members = await Member.findAll({
      where: {
        shareBalance: [null, 0]
      }
    });
    for (const member of members) {
      member.shareBalance = 10000;
      await member.save();
      console.log(`Updated member ${member.memberId} shareBalance to 10,000`);
    }
    console.log("All members now have a share balance of 10,000.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating share balances:", err);
    process.exit(1);
  }
})();
