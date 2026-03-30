require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        const pool = await sql.connect(config);
        const res = await pool.request().query("SELECT TOP 5 id_ticket, monto, moneda, prog_pax, nc_pct, nc_total_clp, monto_final_devolucion FROM tickets ORDER BY id_ticket DESC");
        console.log("Últimos registros:", res.recordset);
        await pool.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}
run();
