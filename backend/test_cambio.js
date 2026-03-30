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

        console.log("Checking file_cambio schema...");
        let res = await pool.request().query("SELECT TOP 1 * FROM file_cambio");
        console.log(res.recordset);

        pool.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testQuery();
