const { getConnection } = require('./config/db');
async function run() {
    const pool = await getConnection();
    await pool.request().query("UPDATE roles SET estados_permitidos = '[1,2,3]' WHERE id_rol = 3");
    console.log('Fixed roles');
    process.exit(0);
}
run();
