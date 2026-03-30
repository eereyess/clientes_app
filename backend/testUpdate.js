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

        const reqMock = {
            id: 11, // Replace with an existing ticket id
            monto: 100,
            moneda: 'CLP',
            proveedor_id: "TEST",
            proveedor_nombre: "TEST PROV",
            credito_proveedor: true,
            cuentas_corrientes: "[]",
            descripcion_html: "<p>test</p>",
            detalle_devolucion: null,
            cambio: 800,
            prog_pax: 2,
            prog_valor: 500,
            prog_total: 1000,
            tasas_pax: 2,
            tasas_valor: 100,
            tasas_total: 200,
            qseg_pax: 0,
            qseg_valor: 0,
            qseg_total: 0,
            retencion_pct: 10,
            retencion_valor: 120,
            total_con_retencion: 1080,
            nc_pct: 5,
            nc_clp: 54,
            nc_usd: 0,
            nc_iva_clp: 10,
            nc_iva_usd: 0,
            nc_total_clp: 64,
            nc_total_usd: 0,
            monto_final_devolucion: 1016
        };

        const request = pool.request()
            .input('id', sql.Int, reqMock.id)
            .input('monto', sql.Decimal(18, 2), reqMock.monto)
            .input('moneda', sql.NVarChar, reqMock.moneda)
            .input('proveedor_id', sql.NVarChar, reqMock.proveedor_id)
            .input('proveedor_nombre', sql.NVarChar, reqMock.proveedor_nombre)
            .input('credito_proveedor', sql.Bit, reqMock.credito_proveedor)
            .input('cuentas_corrientes', sql.NVarChar, reqMock.cuentas_corrientes)
            .input('descripcion_html', sql.NVarChar, reqMock.descripcion_html)
            .input('detalle_devolucion', sql.NVarChar, reqMock.detalle_devolucion)
            .input('cambio', sql.Decimal(18, 2), reqMock.cambio)
            .input('prog_pax', sql.Int, reqMock.prog_pax)
            .input('prog_valor', sql.Decimal(18, 2), reqMock.prog_valor)
            .input('prog_total', sql.Decimal(18, 2), reqMock.prog_total)
            .input('tasas_pax', sql.Int, reqMock.tasas_pax)
            .input('tasas_valor', sql.Decimal(18, 2), reqMock.tasas_valor)
            .input('tasas_total', sql.Decimal(18, 2), reqMock.tasas_total)
            .input('qseg_pax', sql.Int, reqMock.qseg_pax)
            .input('qseg_valor', sql.Decimal(18, 2), reqMock.qseg_valor)
            .input('qseg_total', sql.Decimal(18, 2), reqMock.qseg_total)
            .input('retencion_pct', sql.Decimal(18, 2), reqMock.retencion_pct)
            .input('retencion_valor', sql.Decimal(18, 2), reqMock.retencion_valor)
            .input('total_con_retencion', sql.Decimal(18, 2), reqMock.total_con_retencion)
            .input('nc_pct', sql.Decimal(18, 2), reqMock.nc_pct)
            .input('nc_clp', sql.Decimal(18, 2), reqMock.nc_clp)
            .input('nc_usd', sql.Decimal(18, 2), reqMock.nc_usd)
            .input('nc_iva_clp', sql.Decimal(18, 2), reqMock.nc_iva_clp)
            .input('nc_iva_usd', sql.Decimal(18, 2), reqMock.nc_iva_usd)
            .input('nc_total_clp', sql.Decimal(18, 2), reqMock.nc_total_clp)
            .input('nc_total_usd', sql.Decimal(18, 2), reqMock.nc_total_usd)
            .input('monto_final_devolucion', sql.Decimal(18, 2), reqMock.monto_final_devolucion);

        console.log("Starting query...");
        const result = await request.query(`
            UPDATE tickets SET
                monto = @monto,
                moneda = @moneda,
                proveedor_id = @proveedor_id,
                proveedor_nombre = @proveedor_nombre,
                credito_proveedor = @credito_proveedor,
                cuentas_corrientes = @cuentas_corrientes,
                descripcion_html = @descripcion_html,
                detalle_devolucion = @detalle_devolucion,
                cambio = @cambio,
                prog_pax = @prog_pax, prog_valor = @prog_valor, prog_total = @prog_total,
                tasas_pax = @tasas_pax, tasas_valor = @tasas_valor, tasas_total = @tasas_total,
                qseg_pax = @qseg_pax, qseg_valor = @qseg_valor, qseg_total = @qseg_total,
                retencion_pct = @retencion_pct, retencion_valor = @retencion_valor, total_con_retencion = @total_con_retencion,
                nc_pct = @nc_pct, nc_clp = @nc_clp, nc_usd = @nc_usd,
                nc_iva_clp = @nc_iva_clp, nc_iva_usd = @nc_iva_usd,
                nc_total_clp = @nc_total_clp, nc_total_usd = @nc_total_usd,
                monto_final_devolucion = @monto_final_devolucion
            WHERE id_ticket = @id
        `);
        console.log("Result:", result.rowsAffected);

        await pool.close();
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testQuery();
