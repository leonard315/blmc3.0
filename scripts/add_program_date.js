import { sequelize } from '../models/db.js';

(async function(){
  try{
    const [results] = await sequelize.query("SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Programs' AND COLUMN_NAME = 'programDate';");
    const cnt = results && results[0] && results[0].cnt ? Number(results[0].cnt) : 0;
    if(cnt > 0){
      console.log('✅ Column programDate already exists in Programs');
      process.exit(0);
    }
    console.log('🔄 Adding programDate column to Programs...');
    await sequelize.query("ALTER TABLE `Programs` ADD COLUMN `programDate` DATE NULL;");
    console.log('✅ programDate column added');
    process.exit(0);
  }catch(err){
    console.error('❌ Failed to add programDate column:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
