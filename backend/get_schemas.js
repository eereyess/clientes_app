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

        const r1 = await pool.request().query("SELECT TOP 1 * FROM oris1.dbo.file_");
        require('fs').writeFileSync('file_schema.json', JSON.stringify(Object.keys(r1.recordset[0]), null, 2));

        const r2 = await pool.request().query("SELECT TOP 1 * FROM oris1.dbo.det_file");
        require('fs').writeFileSync('det_file_schema.json', JSON.stringify(Object.keys(r2.recordset[0]), null, 2));

        console.log('Schemas saved');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
