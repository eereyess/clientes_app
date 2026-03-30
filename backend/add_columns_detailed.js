const { getConnection, sql } = require('./config/db');

async function run() {
    try {
        console.log('📡 Iniciando conexión manual...');
        const pool = await getConnection();
        console.log('✅ Conexión establecida.');

        console.log('Adding columns to tickets table...');
        const result = await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'cambio')
            ALTER TABLE tickets ADD cambio DECIMAL(18,2) DEFAULT 1;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'prog_pax')
            ALTER TABLE tickets ADD prog_pax INT, prog_valor DECIMAL(18,2), prog_total DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'tasas_pax')
            ALTER TABLE tickets ADD tasas_pax INT, tasas_valor DECIMAL(18,2), tasas_total DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'qseg_pax')
            ALTER TABLE tickets ADD qseg_pax INT, qseg_valor DECIMAL(18,2), qseg_total DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'retencion_pct')
            ALTER TABLE tickets ADD retencion_pct DECIMAL(18,2), retencion_valor DECIMAL(18,2), total_con_retencion DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'nc_pct')
            ALTER TABLE tickets ADD nc_pct DECIMAL(18,2), nc_clp DECIMAL(18,2), nc_usd DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'nc_iva_clp')
            ALTER TABLE tickets ADD nc_iva_clp DECIMAL(18,2), nc_iva_usd DECIMAL(18,2);

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'nc_total_clp')
            ALTER TABLE tickets ADD nc_total_clp DECIMAL(18,2), nc_total_usd DECIMAL(18,2);
            
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tickets' AND COLUMN_NAME = 'detalle_devolucion')
            ALTER TABLE tickets ADD detalle_devolucion NVARCHAR(MAX);
        `);
        console.log('✅ Columnas procesadas correctamente.');

    } catch (err) {
        console.error('❌ ERROR FATAL:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        process.exit();
    }
}

run();
