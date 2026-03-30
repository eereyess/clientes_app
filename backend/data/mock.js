const bcrypt = require('bcryptjs');

// =============================================
// MOCK DATA - Simulates SQL Server database
// =============================================

const passwordHash = bcrypt.hashSync('admin123', 10);

const mockData = {
  roles: [
    { id_rol: 1, nombre: 'Administrador', descripcion: 'Acceso total al sistema', activo: true, accesos_menu: ['/dashboard', '/tickets', '/tickets/nuevo', '/mensajes', '/estadisticas', '/usuarios', '/parametricas', '/configuracion', '/plantillas'], visibilidad_estados_tipo: 'todos', estados_permitidos: [] },
    { id_rol: 2, nombre: 'Supervisor', descripcion: 'Supervisión y autorización', activo: true, accesos_menu: ['/dashboard', '/tickets', '/tickets/nuevo', '/mensajes', '/estadisticas'], visibilidad_estados_tipo: 'todos', estados_permitidos: [] },
    { id_rol: 3, nombre: 'Ejecutivo', descripcion: 'Creación y gestión de tickets', activo: true, accesos_menu: ['/dashboard', '/tickets', '/tickets/nuevo'], visibilidad_estados_tipo: 'especificos', estados_permitidos: [1, 2, 7] },
    { id_rol: 4, nombre: 'Autorizador', descripcion: 'Autorización de solicitudes', activo: true, accesos_menu: ['/dashboard', '/tickets', '/mensajes'], visibilidad_estados_tipo: 'especificos', estados_permitidos: [3, 4, 5, 6] }
  ],

  tipos_solicitud: [
    { id_tipo: 1, nombre: 'Reclamo', descripcion: 'Reclamo por servicio deficiente', activo: true },
    { id_tipo: 2, nombre: 'Devolución', descripcion: 'Solicitud de devolución de dinero', activo: true },
    { id_tipo: 3, nombre: 'Otras', descripcion: 'Otras solicitudes', activo: true }
  ],

  estados: [
    { id_estado: 1, nombre: 'Nuevo', color: '#3B82F6', orden: 1, activo: true },
    { id_estado: 2, nombre: 'En revisión', color: '#F59E0B', orden: 2, activo: true },
    { id_estado: 3, nombre: 'Pendiente autorización', color: '#8B5CF6', orden: 3, activo: true },
    { id_estado: 4, nombre: 'Aprobado', color: '#10B981', orden: 4, activo: true },
    { id_estado: 5, nombre: 'Rechazado', color: '#EF4444', orden: 5, activo: true },
    { id_estado: 6, nombre: 'Cerrado', color: '#6B7280', orden: 6, activo: true },
    { id_estado: 7, nombre: 'Anulado', color: '#991B1B', orden: 7, activo: true }
  ],

  usuarios: [
    // visibilidad: 'todos' | 'propios' | 'especificos'
    // usuarios_visibles: array of user IDs (only when visibilidad='especificos')
    // recibe_notificaciones: boolean
    // estados_notificacion: array of state IDs for which user receives email alerts
    { id_usuario: 1, nombre: 'Administrador', email: 'admin@gclientes.com', password_hash: passwordHash, id_rol: 1, activo: true, fecha_creacion: '2024-01-01', visibilidad: 'todos', usuarios_visibles: [], recibe_notificaciones: true, estados_notificacion: [4, 5, 7] },
    { id_usuario: 2, nombre: 'María González', email: 'maria@gclientes.com', password_hash: passwordHash, id_rol: 2, activo: true, fecha_creacion: '2024-01-15', visibilidad: 'todos', usuarios_visibles: [], recibe_notificaciones: true, estados_notificacion: [3] },
    { id_usuario: 3, nombre: 'Carlos Pérez', email: 'carlos@gclientes.com', password_hash: passwordHash, id_rol: 3, activo: true, fecha_creacion: '2024-02-01', visibilidad: 'propios', usuarios_visibles: [], recibe_notificaciones: false, estados_notificacion: [] },
    { id_usuario: 4, nombre: 'Ana López', email: 'ana@gclientes.com', password_hash: passwordHash, id_rol: 4, activo: true, fecha_creacion: '2024-02-10', visibilidad: 'especificos', usuarios_visibles: [3], recibe_notificaciones: true, estados_notificacion: [6] }
  ],

  tickets: [
    { id_ticket: 1, numero_ticket: 'TKT-00000001', num_file: '15230', tipof: 'Turismo', id_tipo_solicitud: 1, descripcion: 'Habitación no correspondía a lo reservado. El cliente reservó suite con vista al mar y recibió habitación estándar.', proveedor_id: 'H001', proveedor_nombre: 'Hotel Playa Dorada', agencia: 'Viajes del Sur', fecha_viaje: '2024-03-15', destino: 'Cancún', operador: 'OP Tours', pasajero: 'Roberto Méndez', monto: 450.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Habitación no correspondía a lo reservado. El cliente reservó suite con vista al mar y recibió habitación estándar.</p>', id_estado: 1, anulado: false, fecha_creacion: '2024-03-20', id_usuario_creacion: 3, archivos: [], sernac: false, detalle_devolucion: null },
    { id_ticket: 2, numero_ticket: 'TKT-00000002', num_file: '15245', tipof: 'Turismo', id_tipo_solicitud: 2, descripcion: 'Cancelación de tour por lluvia. El proveedor no ofreció alternativa ni reembolso.', proveedor_id: 'T003', proveedor_nombre: 'Tours Caribe', agencia: 'Mundo Viajes', fecha_viaje: '2024-03-18', destino: 'Punta Cana', operador: 'Caribbean Ops', pasajero: 'Laura Fernández', monto: 220.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Cancelación de tour por lluvia. El proveedor no ofreció alternativa ni reembolso.</p>', id_estado: 3, anulado: false, fecha_creacion: '2024-03-22', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 3, numero_ticket: 'TKT-00000003', num_file: '15260', tipof: 'Corporativo', id_tipo_solicitud: 1, descripcion: 'Traslado no se presentó en horario acordado. Cliente tuvo que tomar taxi al aeropuerto.', proveedor_id: 'TR005', proveedor_nombre: 'TransTur Express', agencia: 'Turismo Global', fecha_viaje: '2024-04-01', destino: 'Buenos Aires', operador: 'AR Operaciones', pasajero: 'Martín Sosa', monto: 85.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Traslado no se presentó en horario acordado. Cliente tuvo que tomar taxi al aeropuerto.</p>', id_estado: 4, anulado: false, fecha_creacion: '2024-04-03', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 4, numero_ticket: 'TKT-00000004', num_file: '15275', tipof: 'Turismo', id_tipo_solicitud: 2, descripcion: 'Paquete todo incluido no incluía actividades prometidas en el catálogo.', proveedor_id: 'H008', proveedor_nombre: 'Resort Paradise', agencia: 'Viajes del Sur', fecha_viaje: '2024-04-10', destino: 'Riviera Maya', operador: 'OP Tours', pasajero: 'Alejandra Ruiz', monto: 680.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Paquete todo incluido no incluía actividades prometidas en el catálogo.</p>', id_estado: 5, anulado: false, fecha_creacion: '2024-04-12', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 5, numero_ticket: 'TKT-00000005', num_file: '15290', tipof: 'Corporativo', id_tipo_solicitud: 3, descripcion: 'Solicitud de cambio de fecha por enfermedad del pasajero. Se requiere nota médica.', proveedor_id: 'A002', proveedor_nombre: 'Aerolineas Connect', agencia: 'Turismo Elitte', fecha_viaje: '2024-04-20', destino: 'Miami', operador: 'US Connect', pasajero: 'Diego Herrera', monto: 0, moneda: 'CLP', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Solicitud de cambio de fecha por enfermedad del pasajero. Se requiere nota médica.</p>', id_estado: 2, anulado: false, fecha_creacion: '2024-04-18', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 6, numero_ticket: 'TKT-00000006', num_file: '15310', tipof: 'Grupos', id_tipo_solicitud: 1, descripcion: 'Excursión no cumplió con el itinerario. Se visitaron menos atracciones de las ofrecidas.', proveedor_id: 'T003', proveedor_nombre: 'Tours Caribe', agencia: 'Mundo Viajes', fecha_viaje: '2024-05-05', destino: 'Cartagena', operador: 'Colombia Tours', pasajero: 'Sofía Morales', monto: 150.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Excursión no cumplió con el itinerario. Se visitaron menos atracciones de las ofrecidas.</p>', id_estado: 6, anulado: false, fecha_creacion: '2024-05-07', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 7, numero_ticket: 'TKT-00000007', num_file: '15325', tipof: 'Turismo', id_tipo_solicitud: 2, descripcion: 'Doble cobro en reserva de hotel. El cliente fue cobrado dos veces por la misma estadía.', proveedor_id: 'H001', proveedor_nombre: 'Hotel Playa Dorada', agencia: 'Viajes del Sur', fecha_viaje: '2024-05-12', destino: 'Cancún', operador: 'OP Tours', pasajero: 'Valentina Castro', monto: 920.00, moneda: 'CLP', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Doble cobro en reserva de hotel. El cliente fue cobrado dos veces por la misma estadía.</p>', id_estado: 1, anulado: false, fecha_creacion: '2024-05-14', id_usuario_creacion: 3, archivos: [] },
    { id_ticket: 8, numero_ticket: 'TKT-00000008', num_file: '15340', tipof: 'Corporativo', id_tipo_solicitud: 1, descripcion: 'Servicio de guía turístico en idioma incorrecto. Se contrató en español y se proporcionó en inglés.', proveedor_id: 'T009', proveedor_nombre: 'GuideWorld', agencia: 'Turismo Global', fecha_viaje: '2024-05-20', destino: 'Roma', operador: 'Euro Ops', pasajero: 'Nicolás Vargas', monto: 120.00, moneda: 'USD', credito_proveedor: false, cuentas_corrientes: [], nota_credito: { tc: null, neto: null, aplica_iva: false, iva: null, total: null, archivo: null }, descripcion_html: '<p>Servicio de guía turístico en idioma incorrecto. Se contrató en español y se proporcionó en inglés.</p>', id_estado: 3, anulado: false, fecha_creacion: '2024-05-22', id_usuario_creacion: 3, archivos: [] }
  ],

  // State change history
  historial_estados: [
    { id: 1, id_ticket: 1, id_estado_anterior: null, id_estado_nuevo: 1, descripcion: 'Ticket creado', id_usuario: 3, fecha: '2024-03-20', archivos: [] },
    { id: 2, id_ticket: 2, id_estado_anterior: null, id_estado_nuevo: 1, descripcion: 'Ticket creado', id_usuario: 3, fecha: '2024-03-22', archivos: [] },
    { id: 3, id_ticket: 2, id_estado_anterior: 1, id_estado_nuevo: 2, descripcion: 'Se inicia revisión del caso', id_usuario: 2, fecha: '2024-03-23', archivos: [] },
    { id: 4, id_ticket: 2, id_estado_anterior: 2, id_estado_nuevo: 3, descripcion: 'Se envía a autorización por monto superior a $200', id_usuario: 2, fecha: '2024-03-24', archivos: [] },
    { id: 5, id_ticket: 3, id_estado_anterior: null, id_estado_nuevo: 1, descripcion: 'Ticket creado', id_usuario: 3, fecha: '2024-04-03', archivos: [] },
    { id: 6, id_ticket: 3, id_estado_anterior: 1, id_estado_nuevo: 4, descripcion: 'Aprobado directamente por bajo monto', id_usuario: 2, fecha: '2024-04-04', archivos: [] },
    { id: 7, id_ticket: 6, id_estado_anterior: null, id_estado_nuevo: 1, descripcion: 'Ticket creado', id_usuario: 3, fecha: '2024-05-07', archivos: [] },
    { id: 8, id_ticket: 6, id_estado_anterior: 1, id_estado_nuevo: 6, descripcion: 'Caso cerrado tras resolución con proveedor', id_usuario: 4, fecha: '2024-05-09', archivos: [] }
  ],
  _historialCounter: 8,

  autorizaciones: [
    { id_autorizacion: 1, id_ticket: 3, id_usuario_autoriza: 2, fecha: '2024-04-04', decision: 'aprobado', comentario: 'Se aprueba devolución por incumplimiento comprobado del proveedor.' },
    { id_autorizacion: 2, id_ticket: 4, id_usuario_autoriza: 2, fecha: '2024-04-13', decision: 'rechazado', comentario: 'Las actividades estaban sujetas a disponibilidad según contrato.' },
    { id_autorizacion: 3, id_ticket: 6, id_usuario_autoriza: 4, fecha: '2024-05-09', decision: 'aprobado', comentario: 'Se procede con devolución parcial.' }
  ],

  mensajes: [
    { id_mensaje: 1, id_usuario_destino: 2, id_usuario_origen: 3, id_ticket: 2, asunto: 'Solicitud de autorización - TKT-00000002', mensaje: 'Se requiere su autorización para procesar la devolución del ticket TKT-00000002 por $220.00.', leido: true, fecha: '2024-03-22' },
    { id_mensaje: 2, id_usuario_destino: 3, id_usuario_origen: 2, id_ticket: 3, asunto: 'Ticket aprobado - TKT-00000003', mensaje: 'Su solicitud TKT-00000003 ha sido aprobada. Proceda con el reembolso.', leido: true, fecha: '2024-04-04' },
    { id_mensaje: 3, id_usuario_destino: 3, id_usuario_origen: 2, id_ticket: 4, asunto: 'Ticket rechazado - TKT-00000004', mensaje: 'Su solicitud TKT-00000004 ha sido rechazada. Motivo: Las actividades estaban sujetas a disponibilidad.', leido: false, fecha: '2024-04-13' },
    { id_mensaje: 4, id_usuario_destino: 4, id_usuario_origen: 3, id_ticket: 8, asunto: 'Nueva solicitud de autorización - TKT-00000008', mensaje: 'Se requiere autorización para el ticket TKT-00000008 relacionado con servicio de guía turístico.', leido: false, fecha: '2024-05-22' },
    { id_mensaje: 5, id_usuario_destino: 1, id_usuario_origen: null, id_ticket: 7, asunto: 'Nuevo ticket creado - TKT-00000007', mensaje: 'Se ha creado un nuevo ticket por doble cobro en Hotel Playa Dorada por un monto de $920.00.', leido: false, fecha: '2024-05-14' }
  ],

  // Simulated Oris1 data (includes tipof)
  oris_files: [
    { num_file: '15230', tipof: 'Turismo', agencia: 'Viajes del Sur', f_viaje: '2024-03-15', ciudad: 'Cancún', ope: 'OP01', nompax: 'Roberto Méndez', proveedores: [{ codigo: 'H001', nombre: 'Hotel Playa Dorada' }, { codigo: 'T001', nombre: 'Transfers MX' }], operador: 'OP Tours' },
    { num_file: '15245', tipof: 'Turismo', agencia: 'Mundo Viajes', f_viaje: '2024-03-18', ciudad: 'Punta Cana', ope: 'OP02', nompax: 'Laura Fernández', proveedores: [{ codigo: 'H002', nombre: 'Bahia Principe' }, { codigo: 'T003', nombre: 'Tours Caribe' }], operador: 'Caribbean Ops' },
    { num_file: '15260', tipof: 'Corporativo', agencia: 'Turismo Global', f_viaje: '2024-04-01', ciudad: 'Buenos Aires', ope: 'OP03', nompax: 'Martín Sosa', proveedores: [{ codigo: 'H003', nombre: 'Hotel Alvear' }, { codigo: 'TR005', nombre: 'TransTur Express' }], operador: 'AR Operaciones' },
    { num_file: '15275', tipof: 'Turismo', agencia: 'Viajes del Sur', f_viaje: '2024-04-10', ciudad: 'Riviera Maya', ope: 'OP01', nompax: 'Alejandra Ruiz', proveedores: [{ codigo: 'H008', nombre: 'Resort Paradise' }, { codigo: 'T003', nombre: 'Tours Caribe' }], operador: 'OP Tours' },
    { num_file: '15290', tipof: 'Corporativo', agencia: 'Turismo Elitte', f_viaje: '2024-04-20', ciudad: 'Miami', ope: 'OP04', nompax: 'Diego Herrera', proveedores: [{ codigo: 'A002', nombre: 'Aerolineas Connect' }, { codigo: 'H010', nombre: 'Hilton Miami' }], operador: 'US Connect' },
    { num_file: '15310', tipof: 'Grupos', agencia: 'Mundo Viajes', f_viaje: '2024-05-05', ciudad: 'Cartagena', ope: 'OP05', nompax: 'Sofía Morales', proveedores: [{ codigo: 'H005', nombre: 'Hotel Caribe' }, { codigo: 'T003', nombre: 'Tours Caribe' }], operador: 'Colombia Tours' },
    { num_file: '15325', tipof: 'Turismo', agencia: 'Viajes del Sur', f_viaje: '2024-05-12', ciudad: 'Cancún', ope: 'OP01', nompax: 'Valentina Castro', proveedores: [{ codigo: 'H001', nombre: 'Hotel Playa Dorada' }], operador: 'OP Tours' },
    { num_file: '15340', tipof: 'Corporativo', agencia: 'Turismo Global', f_viaje: '2024-05-20', ciudad: 'Roma', ope: 'OP06', nompax: 'Nicolás Vargas', proveedores: [{ codigo: 'H012', nombre: 'Hotel Roma Centro' }, { codigo: 'T009', nombre: 'GuideWorld' }], operador: 'Euro Ops' },
    { num_file: '15400', tipof: 'Grupos', agencia: 'Viajes Premium', f_viaje: '2024-06-01', ciudad: 'París', ope: 'OP07', nompax: 'Gabriela Ortiz', proveedores: [{ codigo: 'H015', nombre: 'Le Grand Hotel' }, { codigo: 'T012', nombre: 'Paris Tours' }, { codigo: 'TR008', nombre: 'CDG Transfers' }], operador: 'Europe Connect' },
    { num_file: '15450', tipof: 'Turismo', agencia: 'Turismo Elitte', f_viaje: '2024-06-15', ciudad: 'Tokio', ope: 'OP08', nompax: 'Fernando Aguirre', proveedores: [{ codigo: 'H020', nombre: 'Tokyo Imperial' }, { codigo: 'T015', nombre: 'Japan Experience' }], operador: 'Asia Pacific Ops' }
  ],

  configuracion_visual: [
    { id_config: 1, clave: 'color_primario', valor: '#FFFFFF', descripcion: 'Color principal (fondos/menús)' },
    { id_config: 2, clave: 'color_secundario', valor: '#f1f5f9', descripcion: 'Color secundario (hovers)' },
    { id_config: 3, clave: 'color_fondo', valor: '#f5f7fb', descripcion: 'Color de fondo general' },
    { id_config: 31, clave: 'color_acento', valor: '#d076c0', descripcion: 'Color de acento (botones)' },
    { id_config: 32, clave: 'color_borde', valor: '#d076c0', descripcion: 'Color de bordes de cuadros' },
    { id_config: 4, clave: 'nombre_empresa', valor: 'GClientes Tourism', descripcion: 'Nombre empresa' },
    { id_config: 5, clave: 'logo_url', valor: '', descripcion: 'URL del logo' },
    { id_config: 6, clave: 'smtp_server', valor: 'smtp.ejemplo.com', descripcion: 'Servidor SMTP' },
    { id_config: 7, clave: 'smtp_user', valor: 'notificaciones@ejemplo.com', descripcion: 'Usuario SMTP' },
    { id_config: 8, clave: 'smtp_password', valor: '', descripcion: 'Contraseña SMTP' },
    { id_config: 9, clave: 'smtp_port', valor: '587', descripcion: 'Puerto SMTP' },
    { id_config: 10, clave: 'smtp_secure', valor: 'false', descripcion: 'Usar conexión segura (SSL/TLS)' }
  ],

  plantillas_mail: [
    {
      id_plantilla: 1,
      id_estado: 4, // Aprobado
      asunto: 'Ticket [ticket_numero] Aprobado',
      cuerpo_html: '<p>Estimado(a),</p><p>El ticket <strong>[ticket_numero]</strong> asociado al file <strong>[file]</strong> ha sido <strong>Aprobado</strong>.</p><p>Saludos,<br/>Equipo [nombre_empresa]</p>'
    },
    {
      id_plantilla: 2,
      id_estado: 5, // Rechazado
      asunto: 'Ticket [ticket_numero] Rechazado',
      cuerpo_html: '<p>Estimado(a),</p><p>Lamentamos informar que el ticket <strong>[ticket_numero]</strong> asociado al file <strong>[file]</strong> ha sido <strong>Rechazado</strong>.</p><p>Saludos,<br/>Equipo [nombre_empresa]</p>'
    }
  ],

  _ticketCounter: 8
};

module.exports = mockData;
