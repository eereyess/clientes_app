const sql = require('mssql');
require('dotenv').config();

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            server: process.env.DB_SERVER,
            options: { trustServerCertificate: true }
        });

        await pool.request().query(`
            ALTER TABLE tickets 
            ADD 
                tipof NVARCHAR(50), 
                pasajero NVARCHAR(255), 
                moneda NVARCHAR(10) DEFAULT 'CLP', 
                descripcion_html NVARCHAR(MAX), 
                anulado BIT DEFAULT 0, 
                sernac BIT DEFAULT 0, 
                archivos NVARCHAR(MAX), 
                cuentas_corrientes NVARCHAR(MAX), 
                nota_credito NVARCHAR(MAX)
        `);
        console.log('Columns added successfully');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
