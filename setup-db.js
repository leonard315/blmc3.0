import mysql from 'mysql2/promise';

async function setupDatabase() {
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('📡 Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS blmc_system');
    console.log('✅ Database "blmc_system" created or already exists');

    await connection.end();
    console.log('✅ Setup complete! You can now run: npm run xian');
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
