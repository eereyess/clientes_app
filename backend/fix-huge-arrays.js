require('dotenv').config({ path: './.env' });
const { getConnection } = require('./config/db');
async function fix() {
  const pool = await getConnection();
  await pool.request().query("UPDATE roles SET accesos_menu = '[]' WHERE accesos_menu LIKE '%\"[%\"%'");
  await pool.request().query("UPDATE roles SET estados_permitidos = '[]' WHERE estados_permitidos LIKE '%\"[%\"%'");
  console.log('Fixed corrupted JSON strings on roles table.');
  process.exit();
}
fix().catch(console.error);
