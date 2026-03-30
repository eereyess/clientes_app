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

        console.log('Adding columns to roles...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'roles' AND COLUMN_NAME = 'accesos_menu')
            ALTER TABLE roles ADD accesos_menu NVARCHAR(MAX);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'roles' AND COLUMN_NAME = 'visibilidad_estados_tipo')
            ALTER TABLE roles ADD visibilidad_estados_tipo NVARCHAR(50) DEFAULT 'todos';

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'roles' AND COLUMN_NAME = 'estados_permitidos')
            ALTER TABLE roles ADD estados_permitidos NVARCHAR(MAX);
        `);
        console.log('Columns added to roles');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
