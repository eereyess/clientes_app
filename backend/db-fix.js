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
        console.log(`📡 Conectando a ${config.server}...`);
        const pool = await sql.connect(config);
        console.log('✅ Conectado.');

        console.log('🛠️ Añadiendo monto_final_devolucion a la tabla tickets...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'monto_final_devolucion')
            ALTER TABLE tickets ADD monto_final_devolucion DECIMAL(18,2) DEFAULT 0;
        `);

        const res = await pool.request().query("SELECT TOP 5 id_ticket, prog_pax, nc_pct, monto_final_devolucion FROM tickets WHERE prog_pax IS NOT NULL ORDER BY id_ticket DESC");
        console.log("Últimos registros con datos financieros:", res.recordset);

        console.log('✅ Base de datos actualizada con éxito.');
        await pool.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}
run();
