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

        let res = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%file%' OR TABLE_NAME LIKE '%cambio%'");
        console.log(res.recordset);

        pool.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testQuery();
