const sql = require('mssql');
require('dotenv').config();

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            server: process.env.DB_SERVER,
            options: { trustServerCertificate: true, encrypt: false }
        });

        console.log('Adding column detalle_devolucion to tickets...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'detalle_devolucion')
            ALTER TABLE tickets ADD detalle_devolucion NVARCHAR(MAX);
        `);
        console.log('Column added successfully.');

    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        process.exit();
    }
}
run();
