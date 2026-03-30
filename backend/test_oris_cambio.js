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

sql.connect(config).then(async pool => {
    let res = await pool.request().query("SELECT TOP 5 num_file, cambio FROM oris1.dbo.file_ WHERE num_file IS NOT NULL ORDER BY num_file DESC");
    console.log("Recent files:", res.recordset);
    process.exit(0);
}).catch(console.error);
