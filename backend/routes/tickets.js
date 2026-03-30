const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const mockData = require('../data/mock');
const { getConnection, sql } = require('../config/db');
const { fillTemplate, sendEmail } = require('../utils/mailer');
const { Storage } = require('@google-cloud/storage');

// GCS Config
const GCS_BUCKET = process.env.GCS_BUCKET || 'gclientes-uploads-521751525588';
const gcs = new Storage();
const bucket = gcs.bucket(GCS_BUCKET);

// Multer config - memory storage (for GCS upload)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|pdf|doc|docx|xls|xlsx|png/i;
    const ext = allowed.test(path.extname(file.originalname));
    if (ext) return cb(null, true);
    cb(new Error('Solo permitidos: jpg, png, pdf, word, excel.'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: upload file buffer to GCS and return public URL
async function uploadToGCS(file) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    const blob = bucket.file(`uploads/${uniqueName}`);
    await blob.save(file.buffer, {
        metadata: { contentType: file.mimetype },
        resumable: false
    });
    return `https://storage.googleapis.com/${GCS_BUCKET}/uploads/${uniqueName}`;
}

router.use(authMiddleware);

// GET /api/tickets — list
router.get('/', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            // Logica Mock corta omitida
            return res.json({ total: mockData.tickets.length, tickets: mockData.tickets });
        }

        const { estado, tipo, buscar, limite, offset } = req.query;
        const limitNum = parseInt(limite) || 50;
        const offsetNum = parseInt(offset) || 0;

        const pool = await getConnection();

        // Determinar permisos
        const userResult = await pool.request().input('id', sql.Int, req.user.id_usuario).query('SELECT visibilidad, usuarios_visibles FROM usuarios WHERE id_usuario = @id');
        const user = userResult.recordset[0];

        let baseQuery = `
            SELECT t.*, ts.nombre as tipo_solicitud, e.nombre as estado_nombre, e.color as estado_color 
            FROM tickets t
            LEFT JOIN tipos_solicitud ts ON t.id_tipo_solicitud = ts.id_tipo
            LEFT JOIN estados e ON t.id_estado = e.id_estado
            WHERE 1=1
        `;

        if (user.visibilidad === 'propios') {
            baseQuery += ` AND t.id_usuario_creacion = ${req.user.id_usuario}`;
        } else if (user.visibilidad === 'especificos') {
            let visibles = [req.user.id_usuario];
            if (user.usuarios_visibles) {
                try { visibles = visibles.concat(JSON.parse(user.usuarios_visibles)); } catch (e) { }
            }
            baseQuery += ` AND t.id_usuario_creacion IN (${visibles.join(',')})`;
        }

        if (estado) baseQuery += ` AND t.id_estado = ${parseInt(estado)}`;
        if (tipo) baseQuery += ` AND t.id_tipo_solicitud = ${parseInt(tipo)}`;
        if (buscar) {
            baseQuery += ` AND (t.numero_ticket LIKE '%${buscar}%' OR t.num_file LIKE '%${buscar}%' OR t.pasajero LIKE '%${buscar}%')`;
        }

        const countResult = await pool.request().query(baseQuery.replace('SELECT t.*, ts.nombre as tipo_solicitud, e.nombre as estado_nombre, e.color as estado_color', 'SELECT COUNT(*) as total'));
        const total = countResult.recordset[0].total;

        baseQuery += ` ORDER BY t.id_ticket DESC OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;

        const result = await pool.request().query(baseQuery);
        res.json({ total, tickets: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo tickets' });
    }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') {
            const ticket = mockData.tickets.find(t => t.id_ticket === parseInt(req.params.id));
            if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
            return res.json(ticket);
        }

        const pool = await getConnection();
        const request = pool.request();

        const result = await request.input('id', sql.Int, req.params.id).query(`
            SELECT t.*, ts.nombre as tipo_solicitud, e.nombre as estado_nombre, e.color as estado_color 
            FROM tickets t
            LEFT JOIN tipos_solicitud ts ON t.id_tipo_solicitud = ts.id_tipo
            LEFT JOIN estados e ON t.id_estado = e.id_estado
            WHERE t.id_ticket = @id
        `);

        const ticket = result.recordset[0];
        if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

        // Parse JSON fields
        ['cuentas_corrientes', 'nota_credito', 'archivos', 'detalle_devolucion'].forEach(f => {
            if (typeof ticket[f] === 'string') try { ticket[f] = JSON.parse(ticket[f]); } catch (e) { ticket[f] = null; }
        });

        // Historial
        const histResult = await pool.request().input('id', sql.Int, ticket.id_ticket).query(`
            SELECT h.*, u.nombre as usuario_nombre, e_ant.nombre as estado_anterior_nombre, e_nue.nombre as estado_nuevo_nombre, e_nue.color as estado_nuevo_color 
            FROM historial_estados h
            LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
            LEFT JOIN estados e_ant ON h.id_estado_anterior = e_ant.id_estado
            LEFT JOIN estados e_nue ON h.id_estado_nuevo = e_nue.id_estado
            WHERE h.id_ticket = @id ORDER BY h.id DESC
        `);
        const historial = histResult.recordset.map(h => ({
            ...h,
            archivos: typeof h.archivos === 'string' ? JSON.parse(h.archivos || '[]') : []
        }));

        // Autorizaciones
        const authResult = await pool.request().input('id', sql.Int, ticket.id_ticket).query('SELECT * FROM autorizaciones WHERE id_ticket = @id ORDER BY id_autorizacion DESC');
        const autorizaciones = authResult.recordset;

        // Estados Permitidos
        const userRes = await pool.request().input('uid', sql.Int, req.user.id_usuario).query('SELECT id_rol FROM usuarios WHERE id_usuario = @uid');
        const rolRes = await pool.request().input('rid', sql.Int, userRes.recordset[0].id_rol).query('SELECT visibilidad_estados_tipo, estados_permitidos FROM roles WHERE id_rol = @rid');

        let estados_permitidos = [];
        const r = rolRes.recordset[0];
        if (r.visibilidad_estados_tipo === 'todos') {
            estados_permitidos = (await pool.request().query('SELECT * FROM estados WHERE activo = 1')).recordset;
        } else {
            let permitidos_ids = [];
            if (r.estados_permitidos) try { permitidos_ids = JSON.parse(r.estados_permitidos); } catch (e) { }

            permitidos_ids = permitidos_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));

            if (permitidos_ids.length > 0) {
                estados_permitidos = (await pool.request().query(`SELECT * FROM estados WHERE id_estado IN (${permitidos_ids.join(',')}) AND activo = 1`)).recordset;
            }
        }

        res.json({ ...ticket, historial, autorizaciones, estados_permitidos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo ticket' });
    }
});

// POST /api/tickets — create
router.post('/', upload.array('archivos', 5), async (req, res) => {
    try {
        const { num_file, id_tipo_solicitud, descripcion, proveedor_id, proveedor_nombre, monto, moneda, agencia, agente, fecha_viaje, destino, operador, pasajero, tipof, sernac } = req.body;
        if (!num_file || !id_tipo_solicitud) return res.status(400).json({ error: 'Faltan datos requeridos (número de file y tipo de solicitud)' });

        const archivosUrl = [];
        for (const f of (req.files || [])) {
            const url = await uploadToGCS(f);
            archivosUrl.push({ nombre: f.originalname, url });
        }

        if (process.env.USE_MOCK === 'true') {
            return res.status(201).json({ message: 'Mock ticket creadp' });
        }

        const pool = await getConnection();

        // Obtener Tipo de Cambio del File de ORIS1
        let cambioFile = 1;
        try {
            const cambioRes = await pool.request()
                .input('nf', sql.NVarChar, num_file)
                .query("SELECT TOP 1 cambio FROM oris1.dbo.file_ WHERE num_file = @nf");
            if (cambioRes.recordset[0] && cambioRes.recordset[0].cambio) {
                const parsed = parseFloat(cambioRes.recordset[0].cambio);
                if (!isNaN(parsed) && parsed > 0) {
                    cambioFile = parsed;
                }
            }
        } catch (e) {
            console.error("Error al obtener cambio de oris1.dbo.file_:", e.message);
        }

        // Generate TKT number
        const cntRes = await pool.request().query('SELECT COUNT(*) as c FROM tickets');
        const numero = String(cntRes.recordset[0].c + 1).padStart(8, '0');
        const numero_ticket = `TKT-${numero}`;

        const query = `
            INSERT INTO tickets (numero_ticket, num_file, tipof, id_tipo_solicitud, descripcion, proveedor_id, proveedor_nombre, agencia, agente, fecha_viaje, destino, operador, pasajero, monto, moneda, descripcion_html, id_estado, anulado, id_usuario_creacion, sernac, archivos, cuentas_corrientes, nota_credito, cambio)
            OUTPUT INSERTED.id_ticket, INSERTED.numero_ticket
            VALUES (@numero_ticket, @num_file, @tipof, @id_tipo_solicitud, @descripcion, @proveedor_id, @proveedor_nombre, @agencia, @agente, @fecha_viaje, @destino, @operador, @pasajero, @monto, @moneda, @descripcion_html, 1, 0, @id_usuario_creacion, @sernac, @archivos, '[]', '{}', @cambio)
        `;

        const request = pool.request()
            .input('numero_ticket', sql.NVarChar, numero_ticket)
            .input('num_file', sql.NVarChar, num_file)
            .input('tipof', sql.NVarChar, tipof || '')
            .input('id_tipo_solicitud', sql.Int, parseInt(id_tipo_solicitud))
            .input('descripcion', sql.NVarChar, descripcion || '')
            .input('proveedor_id', sql.NVarChar, proveedor_id || '')
            .input('proveedor_nombre', sql.NVarChar, proveedor_nombre || '')
            .input('agencia', sql.NVarChar, agencia || '')
            .input('agente', sql.NVarChar, agente || '')
            .input('fecha_viaje', sql.Date, fecha_viaje ? new Date(fecha_viaje) : null)
            .input('destino', sql.NVarChar, destino || '')
            .input('operador', sql.NVarChar, operador || '')
            .input('pasajero', sql.NVarChar, pasajero || '')
            .input('monto', sql.Decimal(18, 2), parseFloat(monto) || 0)
            .input('moneda', sql.NVarChar, moneda || 'CLP')
            .input('descripcion_html', sql.NVarChar, descripcion ? `<p>${descripcion}</p>` : '')
            .input('id_usuario_creacion', sql.Int, req.user.id_usuario)
            .input('sernac', sql.Bit, sernac === 'true' || sernac === true)
            .input('archivos', sql.NVarChar, JSON.stringify(archivosUrl))
            .input('cambio', sql.Decimal(18, 2), cambioFile);

        const result = await request.query(query);
        const newTicketId = result.recordset[0].id_ticket;

        // Historial
        await pool.request()
            .input('id_ticket', sql.Int, newTicketId)
            .input('id_estado_nuevo', sql.Int, 1)
            .input('descripcion', sql.NVarChar, 'Ticket creado')
            .input('archivos', sql.NVarChar, JSON.stringify(archivosUrl))
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query('INSERT INTO historial_estados (id_ticket, id_estado_nuevo, descripcion, archivos, id_usuario) VALUES (@id_ticket, @id_estado_nuevo, @descripcion, @archivos, @id_usuario)');

        res.status(201).json({ id_ticket: newTicketId, numero_ticket });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando ticket' });
    }
});

// PUT /api/tickets/:id - Update info and values
router.put('/:id', upload.array('archivos', 5), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock updated' });

        const pool = await getConnection();
        const { id_tipo_solicitud, descripcion, proveedor_id, proveedor_nombre, monto, moneda, agencia, agente, fecha_viaje, destino, operador, pasajero, tipof, sernac } = req.body;

        const archivosUrl = [];
        for (const f of (req.files || [])) {
            const url = await uploadToGCS(f);
            archivosUrl.push({ nombre: f.originalname, url });
        }

        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('tipof', sql.NVarChar, tipof)
            .input('id_tipo_solicitud', sql.Int, id_tipo_solicitud)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('proveedor_id', sql.NVarChar, proveedor_id)
            .input('proveedor_nombre', sql.NVarChar, proveedor_nombre)
            .input('agencia', sql.NVarChar, agencia)
            .input('agente', sql.NVarChar, agente)
            .input('fecha_viaje', sql.Date, fecha_viaje ? new Date(fecha_viaje) : null)
            .input('destino', sql.NVarChar, destino)
            .input('operador', sql.NVarChar, operador)
            .input('pasajero', sql.NVarChar, pasajero)
            .input('monto', sql.Decimal, parseFloat(monto) || 0)
            .input('moneda', sql.NVarChar, moneda || 'CLP')
            .input('descripcion_html', sql.NVarChar, descripcion ? `<p>${descripcion}</p>` : '')
            .input('sernac', sql.Bit, sernac === true || sernac === 'true');

        let finalArchivosStr = null;
        if (archivosUrl.length > 0) {
            const currentTicket = await pool.request().input('id', sql.Int, req.params.id).query('SELECT archivos FROM tickets WHERE id_ticket = @id');
            let currentArchivos = [];
            try { currentArchivos = JSON.parse(currentTicket.recordset[0]?.archivos || '[]'); } catch (e) { }
            const mergedArchivos = [...currentArchivos, ...archivosUrl];
            finalArchivosStr = JSON.stringify(mergedArchivos);
            request.input('final_archivos', sql.NVarChar, finalArchivosStr);
        }

        await request.query(`
            UPDATE tickets SET
                tipof = COALESCE(@tipof, tipof),
                id_tipo_solicitud = COALESCE(@id_tipo_solicitud, id_tipo_solicitud),
                descripcion = COALESCE(@descripcion, descripcion),
                proveedor_id = COALESCE(@proveedor_id, proveedor_id),
                proveedor_nombre = COALESCE(@proveedor_nombre, proveedor_nombre),
                agencia = COALESCE(@agencia, agencia),
                agente = COALESCE(@agente, agente),
                fecha_viaje = COALESCE(@fecha_viaje, fecha_viaje),
                destino = COALESCE(@destino, destino),
                operador = COALESCE(@operador, operador),
                pasajero = COALESCE(@pasajero, pasajero),
                monto = COALESCE(@monto, monto),
                moneda = COALESCE(@moneda, moneda),
                descripcion_html = COALESCE(@descripcion_html, descripcion_html),
                sernac = COALESCE(@sernac, sernac)
                ${archivosUrl.length > 0 ? ", archivos = @final_archivos" : ""}
            WHERE id_ticket = @id
        `);

        // Historial action
        await pool.request()
            .input('id_ticket', sql.Int, req.params.id)
            .input('id_estado_nuevo', sql.Int, 1) // Just passing default required
            .input('descripcion', sql.NVarChar, 'Ticket editado')
            .input('archivos', sql.NVarChar, JSON.stringify(archivosUrl))
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query('INSERT INTO historial_estados (id_ticket, id_estado_nuevo, descripcion, archivos, id_usuario) VALUES (@id_ticket, @id_estado_nuevo, @descripcion, @archivos, @id_usuario)');

        res.json({ message: 'Ticket actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando ticket' });
    }
});

// PUT /api/tickets/:id/estado
router.put('/:id/estado', upload.array('archivos', 5), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock state updated' });

        const { id_estado, descripcion } = req.body;
        if (!id_estado || !descripcion) return res.status(400).json({ error: 'Estado y descripción requeridos' });

        const archivosUrl = [];
        for (const f of (req.files || [])) {
            const url = await uploadToGCS(f);
            archivosUrl.push({ nombre: f.originalname, url });
        }
        const pool = await getConnection();

        const currentRes = await pool.request().input('id', sql.Int, req.params.id).query('SELECT id_estado, archivos FROM tickets WHERE id_ticket = @id');
        const estado_anterior = currentRes.recordset[0]?.id_estado;

        let finalArchivosStr = null;
        if (archivosUrl.length > 0) {
            let currentArchivos = [];
            try { currentArchivos = JSON.parse(currentRes.recordset[0]?.archivos || '[]'); } catch (e) { }
            const mergedArchivos = [...currentArchivos, ...archivosUrl];
            finalArchivosStr = JSON.stringify(mergedArchivos);
        }

        const updateReq = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('estado', sql.Int, id_estado);

        if (archivosUrl.length > 0) {
            updateReq.input('final_archivos', sql.NVarChar, finalArchivosStr);
        }

        await updateReq.query(`UPDATE tickets SET id_estado = @estado ${archivosUrl.length > 0 ? ', archivos = @final_archivos' : ''} WHERE id_ticket = @id`);

        await pool.request()
            .input('id_ticket', sql.Int, req.params.id)
            .input('id_estado_anterior', sql.Int, estado_anterior)
            .input('id_estado_nuevo', sql.Int, id_estado)
            .input('descripcion', sql.NVarChar, descripcion)
            .input('archivos', sql.NVarChar, JSON.stringify(archivosUrl))
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query('INSERT INTO historial_estados (id_ticket, id_estado_anterior, id_estado_nuevo, descripcion, archivos, id_usuario) VALUES (@id_ticket, @id_estado_anterior, @id_estado_nuevo, @descripcion, @archivos, @id_usuario)');

        // CREAR NOTIFICACION AL GERENTE O INTERESADOS (Muestra simple al creador)
        const creadorRes = await pool.request().input('id', sql.Int, req.params.id)
            .query('SELECT TOP 1 id_usuario_creacion FROM tickets WHERE id_ticket = @id');
        const id_creador = creadorRes.recordset[0]?.id_usuario_creacion;

        // Conseguir nombre del estado real primero
        let nombreEst = 'Nuevo Estado';
        const nombreEstRes = await pool.request().input('est', sql.Int, id_estado).query('SELECT nombre FROM estados WHERE id_estado = @est');
        if (nombreEstRes.recordset[0]) {
            nombreEst = nombreEstRes.recordset[0].nombre;
        }

        const destinatarios = []; // Array de { id_usuario, email, nombre }

        // Mapeo destinatario: Creador original del ticket (siempre recibe notificación)
        if (id_creador) {
            const creadorTarget = await pool.request()
                .input('u_id', sql.Int, id_creador)
                .query('SELECT id_usuario, nombre, email FROM usuarios WHERE id_usuario = @u_id');
            if (creadorTarget.recordset[0]) {
                destinatarios.push(creadorTarget.recordset[0]);
            }
        }

        // Mapeo destinatarios: Supervisores
        // Un supervisor es alguien que tiene recibe_notificaciones = 1, y nos tiene en sus `usuarios_visibles` 
        // y este estado específico está en su `estados_notificacion`.
        const supersRes = await pool.request().query("SELECT id_usuario, nombre, email, usuarios_visibles, estados_notificacion FROM usuarios WHERE recibe_notificaciones = 1 AND activo = 1");
        supersRes.recordset.forEach(sup => {
            let visibles = [];
            try { visibles = typeof sup.usuarios_visibles === 'string' ? JSON.parse(sup.usuarios_visibles) : []; } catch (e) { }
            let estadosNot = [];
            try { estadosNot = typeof sup.estados_notificacion === 'string' ? JSON.parse(sup.estados_notificacion) : []; } catch (e) { }

            // Normalizar arrays a numéricos
            visibles = visibles.map(v => parseInt(v));
            estadosNot = estadosNot.map(st => parseInt(st));

            if (visibles.includes(parseInt(req.user.id_usuario)) && estadosNot.includes(parseInt(id_estado))) {
                // Evitamos duplicado si el supervisor era también el creador del ticket
                if (!destinatarios.find(d => d.id_usuario === sup.id_usuario)) {
                    destinatarios.push({ id_usuario: sup.id_usuario, nombre: sup.nombre, email: sup.email });
                }
            }
        });

        // Enviar notificaciones e emails si hay clientes a quien mandar
        if (destinatarios.length > 0) {
            // Conseguir informacion extendida del ticket actual
            const numTicketRes = await pool.request().input('id', sql.Int, req.params.id)
                .query('SELECT numero_ticket, agencia, tipof, num_file, operador, agente, pasajero, destino, moneda, monto, proveedor_nombre FROM tickets WHERE id_ticket = @id');
            const tkData = numTicketRes.recordset[0] || {};
            const numeroTicket = tkData.numero_ticket || req.params.id;

            // Buscar Plantilla Email global
            const plantillaQry = await pool.request()
                .input('id_estado', sql.Int, id_estado)
                .query('SELECT TOP 1 * FROM plantillas_mail WHERE id_estado = @id_estado AND activo = 1');
            const plantilla = plantillaQry.recordset[0];

            for (const dest of destinatarios) {
                // Notificación Interna
                await pool.request()
                    .input('dest', sql.Int, dest.id_usuario)
                    .input('orig', sql.Int, req.user.id_usuario)
                    .input('tick', sql.Int, req.params.id)
                    .input('tit', sql.NVarChar, `Cambio de Estado - Ticket #${numeroTicket}`)
                    .input('msj', sql.NVarChar, `El ticket ha pasado al estado: ${nombreEst}. Motivo: ${descripcion}`)
                    .query(`INSERT INTO notificaciones (id_usuario_destino, id_usuario_origen, id_ticket, titulo, mensaje) 
                            VALUES (@dest, @orig, @tick, @tit, @msj)`);

                // Enviar Mail si hay plantilla y el usuario tiene correo
                if (plantilla && dest.email) {
                    const variables = {
                        ticket: numeroTicket,
                        nombre: dest.nombre,
                        estado: nombreEst || 'Nuevo Estado',
                        agencia: tkData.agencia || '',
                        tipo_file: tkData.tipof || '',
                        numero_file: tkData.num_file || '',
                        operador: tkData.operador || '',
                        agente: tkData.agente || '',
                        pasajero: tkData.pasajero || '',
                        destino: tkData.destino || '',
                        moneda: tkData.moneda || '',
                        monto: tkData.monto ? String(tkData.monto) : '',
                        proveedor: tkData.proveedor_nombre || ''
                    };
                    // Reemplazar variables en asunto Y cuerpo
                    let asuntoFinal = plantilla.asunto || '';
                    for (const key in variables) {
                        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                        asuntoFinal = asuntoFinal.replace(regex, variables[key] || '');
                    }
                    const htmlFinal = await fillTemplate(plantilla.cuerpo_html, variables);
                    console.log(`📧 Enviando mail a: ${dest.email} | Asunto: ${asuntoFinal}`);
                    sendEmail(dest.email, asuntoFinal, htmlFinal).catch(console.error);
                }
            }
        }

        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error cambiando estado' });
    }
});

// Public testing route to check FormData boundary detection
router.post('/debug Valores', upload.single('nc_archivo'), (req, res) => {
    console.log("== DEBUG POST ENTRADA ==");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    res.json({ bodyReceived: Object.keys(req.body).length > 0 });
});

// PUT /api/tickets/:id/valores
router.put('/:id/valores', upload.single('nc_archivo'), async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock valores updated' });

        const pool = await getConnection();
        const {
            monto, moneda, proveedor_id, proveedor_nombre, credito_proveedor, cuentas_corrientes,
            descripcion_html, detalle_devolucion,
            cambio, prog_pax, prog_valor, prog_total, tasas_pax, tasas_valor, tasas_total,
            qseg_pax, qseg_valor, qseg_total, retencion_pct, retencion_valor, total_con_retencion,
            nc_pct, nc_clp, nc_usd, nc_iva_clp, nc_iva_usd, nc_total_clp, nc_total_usd,
            monto_final_devolucion
        } = req.body;

        const isCreditoProv = credito_proveedor === 'true' || credito_proveedor === true;

        console.log(`📡 Recibiendo GUARDAR VALORES del Ticket ${req.params.id}:`);
        console.dir(req.body, { depth: null, colors: true });

        const fs = require('fs');
        fs.appendFileSync('debug.log', `[${new Date().toISOString()}] BODY RECIBIDO: ${JSON.stringify(req.body)}\n`);

        const request = pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .input('monto', sql.Decimal(18, 2), parseFloat(monto) || 0)
            .input('moneda', sql.NVarChar, moneda || 'CLP')
            .input('proveedor_id', sql.NVarChar, proveedor_id || '')
            .input('proveedor_nombre', sql.NVarChar, proveedor_nombre || '')
            .input('credito_proveedor', sql.Bit, isCreditoProv)
            .input('cuentas_corrientes', sql.NVarChar, cuentas_corrientes || '[]')
            .input('descripcion_html', sql.NVarChar, descripcion_html || '')
            .input('detalle_devolucion', sql.NVarChar, detalle_devolucion || null)
            // Table 1 detailed fields
            .input('cambio', sql.Decimal(18, 2), parseFloat(cambio) || 1)
            .input('prog_pax', sql.Int, parseInt(prog_pax) || 0)
            .input('prog_valor', sql.Decimal(18, 2), parseFloat(prog_valor) || 0)
            .input('prog_total', sql.Decimal(18, 2), parseFloat(prog_total) || 0)
            .input('tasas_pax', sql.Int, parseInt(tasas_pax) || 0)
            .input('tasas_valor', sql.Decimal(18, 2), parseFloat(tasas_valor) || 0)
            .input('tasas_total', sql.Decimal(18, 2), parseFloat(tasas_total) || 0)
            .input('qseg_pax', sql.Int, parseInt(qseg_pax) || 0)
            .input('qseg_valor', sql.Decimal(18, 2), parseFloat(qseg_valor) || 0)
            .input('qseg_total', sql.Decimal(18, 2), parseFloat(qseg_total) || 0)
            .input('retencion_pct', sql.Decimal(18, 2), parseFloat(retencion_pct) || 0)
            .input('retencion_valor', sql.Decimal(18, 2), parseFloat(retencion_valor) || 0)
            .input('total_con_retencion', sql.Decimal(18, 2), parseFloat(total_con_retencion) || 0)
            // Table 3 detailed fields
            .input('nc_pct', sql.Decimal(18, 2), parseFloat(nc_pct) || 0)
            .input('nc_clp', sql.Decimal(18, 2), parseFloat(nc_clp) || 0)
            .input('nc_usd', sql.Decimal(18, 2), parseFloat(nc_usd) || 0)
            .input('nc_iva_clp', sql.Decimal(18, 2), parseFloat(nc_iva_clp) || 0)
            .input('nc_iva_usd', sql.Decimal(18, 2), parseFloat(nc_iva_usd) || 0)
            .input('nc_total_clp', sql.Decimal(18, 2), parseFloat(nc_total_clp) || 0)
            .input('nc_total_usd', sql.Decimal(18, 2), parseFloat(nc_total_usd) || 0)
            .input('monto_final_devolucion', sql.Decimal(18, 2), parseFloat(monto_final_devolucion) || 0);

        if (req.file) {
            const ncUrl = await uploadToGCS(req.file);
            // Si hay un archivo, podríamos guardarlo en ticket.nota_credito JSON o en una columna específica.
            // Por consistencia con el código anterior, lo guardamos en nota_credito JSON junto con los totales.
            const currentRes = await pool.request().input('id', sql.Int, req.params.id).query('SELECT nota_credito FROM tickets WHERE id_ticket = @id');
            let notaCredito = {};
            try { notaCredito = JSON.parse(currentRes.recordset[0]?.nota_credito || '{}'); } catch (e) { }
            notaCredito.archivo = ncUrl;
            request.input('nota_credito', sql.NVarChar, JSON.stringify(notaCredito));
        }

        const updateResult = await request.query(`
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
                ${req.file ? ", nota_credito = @nota_credito" : ""}
            WHERE id_ticket = @id
        `);

        if (updateResult.rowsAffected[0] === 0) {
            console.warn(`⚠️ No se encontró ticket con id_ticket = ${req.params.id} para actualizar.`);
            return res.status(404).json({ error: 'Ticket no encontrado para actualización' });
        }

        // Insert into history
        await pool.request()
            .input('id_ticket', sql.Int, req.params.id)
            .input('descripcion', sql.NVarChar, 'Valores y detalles financieros editados')
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`INSERT INTO historial_estados (id_ticket, id_estado_nuevo, descripcion, id_usuario) 
                    VALUES (@id_ticket, (SELECT id_estado FROM tickets WHERE id_ticket=@id_ticket), @descripcion, @id_usuario)`);

        res.json({ message: 'Valores actualizados exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando valores' });
    }
});

// PUT /api/tickets/:id/anular
router.put('/:id/anular', async (req, res) => {
    try {
        if (process.env.USE_MOCK === 'true') return res.json({ message: 'Mock anular updated' });

        const pool = await getConnection();
        const { descripcion } = req.body;

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE tickets SET anulado = 1 WHERE id_ticket = @id');

        await pool.request()
            .input('id_ticket', sql.Int, req.params.id)
            .input('descripcion', sql.NVarChar, descripcion || 'Ticket Anulado')
            .input('id_usuario', sql.Int, req.user.id_usuario)
            .query(`INSERT INTO historial_estados (id_ticket, id_estado_nuevo, descripcion, id_usuario) 
                    VALUES (@id_ticket, (SELECT id_estado FROM tickets WHERE id_ticket=@id_ticket), @descripcion, @id_usuario)`);

        res.json({ message: 'Ticket anulado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al anular ticket' });
    }
});

module.exports = router;
