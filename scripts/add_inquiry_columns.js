import { sequelize } from '../models/db.js';

try {
  await sequelize.query(`
    ALTER TABLE Inquiries
      ADD COLUMN seminarsAttended INT DEFAULT 0,
      ADD COLUMN seminarSchedule DATETIME NULL,
      ADD COLUMN membershipStep ENUM('applied','seminar_scheduled','seminar_attended','documents_submitted','approved','rejected') DEFAULT 'applied',
      ADD COLUMN adminNotes TEXT NULL
  `);
  console.log('Columns added successfully.');
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await sequelize.close();
}
