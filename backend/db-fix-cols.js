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

        console.log('🛠️ Añadiendo credito_proveedor a la tabla tickets...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'credito_proveedor')
            ALTER TABLE tickets ADD credito_proveedor BIT DEFAULT 0;
            
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'cuentas_corrientes')
            ALTER TABLE tickets ADD cuentas_corrientes NVARCHAR(MAX);
        `);

        console.log('✅ Base de datos actualizada con éxito.');
        await pool.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}
run();
