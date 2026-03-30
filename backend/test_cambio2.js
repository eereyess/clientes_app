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

async function testQuery() {
    try {
        const pool = await sql.connect(config);

        console.log("Checking oris1.dbo.file_ schema...");
        let res = await pool.request().query("SELECT TOP 1 * FROM oris1.dbo.file_");
        console.log(Object.keys(res.recordset[0]).filter(k => k.toLowerCase().includes('cambio')));

        let res2 = await pool.request().query("SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%cambio%'");
        console.log("Local tables with cambio:", res2.recordset);

        let res3 = await pool.request().query("SELECT TOP 1 * FROM oris1.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%cambio%'");
        console.log("Oris tables with cambio:", res3.recordset);

        pool.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testQuery();
