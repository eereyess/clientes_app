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

        console.log('Searching for file_cambio table...');
        const result = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE '%cambio%'");
        console.log('Tables found:', result.recordset);

        if (result.recordset.length > 0) {
            console.log('Checking columns for the first one...');
            const tableName = result.recordset[0].name;
            const cols = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
            console.log(`Columns for ${tableName}:`, cols.recordset);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}
run();
