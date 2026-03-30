const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getConnection, sql } = require('../config/db');

router.use(authMiddleware);

// GET /api/oris/file/:numFile
router.get('/file/:numFile', async (req, res) => {
    try {
        const pool = await getConnection();

        // Consultamos a la base de datos "oris1", tabla "file_"
        const result = await pool.request()
            .input('numFile', sql.VarChar, req.params.numFile)
            .query(`
                SELECT TOP 1 f.*, o.nombre AS nombre_operador 
                FROM oris1.dbo.file_ f
                LEFT JOIN oris1.dbo.opects o ON f.ope = o.codigo
                WHERE f.num_file = @numFile
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'File no encontrado en base ORIS1' });
        }

        const orisFile = result.recordset[0];

        // Mapeamos los campos que asumo vienen de la tabla file_ 
        // Obtenemos los proveedores
        const provResult = await pool.request()
            .input('numFile', sql.VarChar, req.params.numFile)
            .query(`
                SELECT DISTINCT
                    LTRIM(RTRIM(d.provee)) as codigo,
                    v.proveedor as nombre
                FROM oris1.dbo.det_file d
                LEFT JOIN oris1.dbo.view_hotel_operad v ON LTRIM(RTRIM(d.provee)) = LTRIM(RTRIM(v.codigo))
                WHERE d.num_file = @numFile
                AND ISNULL(d.borra, '') <> 'N'
                AND d.provee IS NOT NULL AND LTRIM(RTRIM(d.provee)) <> ''
            `);

        let proveedores = provResult.recordset.map(p => ({
            codigo: p.codigo,
            nombre: p.nombre || p.codigo
        }));

        // Si el proveedor PAN no viene en la respuesta, lo agregamos
        if (!proveedores.some(p => p.codigo === 'PAN')) {
            proveedores.push({ codigo: 'PAN', nombre: 'PANAM' });
        }

        res.json({
            num_file: orisFile.num_file,
            tipof: orisFile.tipof || orisFile.tipo_file || 'No especificado',
            agencia: orisFile.agencia || orisFile.nom_agencia || '',
            agente: orisFile.vage || '',
            fecha_viaje: orisFile.f_viaje || orisFile.fecha_viaje || '',
            destino: orisFile.ciudad || orisFile.destino || '',
            operador: orisFile.nombre_operador || orisFile.operador || orisFile.ope || '',
            pasajero: orisFile.nompax || orisFile.pasajero || orisFile.nombre_pax || '',
            proveedores: proveedores
        });

    } catch (err) {
        console.error('Error al consultar ORIS1:', err);
        res.status(500).json({
            error: 'Error del servidor al conectar con oris1.dbo.file_',
            details: err.message
        });
    }
});

module.exports = router;
