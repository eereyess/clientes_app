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

        console.log('Testing Query 1 (file_ + opects)...');
        try {
            const r1 = await pool.request().input('numFile', '259053').query(`
                SELECT TOP 1 f.*, o.nombre AS nombre_operador 
                FROM oris1.dbo.file_ f
                LEFT JOIN oris1.dbo.opects o ON f.ope = o.codigo
                WHERE f.num_file = @numFile
            `);
            console.log('Query 1 Success, rows:', r1.recordset.length);
        } catch (e) {
            console.error('Query 1 Failed:', e.message);
        }

        console.log('Testing Query 2 (det_file + view_hotel_operad)...');
        try {
            const r2 = await pool.request().input('numFile', '259053').query(`
                SELECT DISTINCT
                    LTRIM(RTRIM(d.provee)) as codigo,
                    v.proveedor as nombre
                FROM oris1.dbo.det_file d
                LEFT JOIN oris1.dbo.view_hotel_operad v ON LTRIM(RTRIM(d.provee)) = LTRIM(RTRIM(v.codigo))
                WHERE d.num_file = @numFile
                AND ISNULL(d.borra, '') <> 'N'
                AND d.provee IS NOT NULL AND LTRIM(RTRIM(d.provee)) <> ''
            `);
            console.log('Query 2 Success, rows:', r2.recordset.length);
            console.log('Data:', r2.recordset);
        } catch (e) {
            console.error('Query 2 Failed:', e.message);
        }

    } catch (err) {
        console.error('Connection Failed:', err.message);
    } finally {
        process.exit();
    }
}
run();
