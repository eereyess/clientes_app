const { getConnection, sql } = require('./config/db');
async function fix() {
    try {
        const pool = await getConnection();
        await pool.request().query('ALTER TABLE tickets ALTER COLUMN agencia NVARCHAR(255)');
        await pool.request().query('ALTER TABLE tickets ALTER COLUMN destino NVARCHAR(255)');
        await pool.request().query('ALTER TABLE tickets ALTER COLUMN operador NVARCHAR(255)');
        await pool.request().query('ALTER TABLE tickets ALTER COLUMN pasajero NVARCHAR(255)');

        const count = await pool.request().query(`
            SELECT COUNT(*) as c FROM sys.columns 
            WHERE Name = N'agente' AND Object_ID = Object_ID(N'tickets')
        `);
        if (count.recordset[0].c === 0) {
            await pool.request().query('ALTER TABLE tickets ADD agente NVARCHAR(255)');
        }

        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
