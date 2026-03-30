const nodemailer = require('nodemailer');
const mockData = require('../data/mock');

function getSmtpConfig() {
    const config = {};
    mockData.configuracion_visual.forEach(c => {
        if (c.clave && c.clave.startsWith('smtp_')) {
            config[c.clave] = c.valor;
        }
    });
    return config;
}

function getEmpresaName() {
    return mockData.configuracion_visual.find(c => c.clave === 'nombre_empresa')?.valor || 'GClientes';
}

function getTemplateForState(id_estado) {
    return mockData.plantillas_mail.find(p => p.id_estado === id_estado);
}

function getRecipientsForState(id_estado, ticket) {
    // Busca usuarios que tengan recibe_notificaciones = true y que incluyan `id_estado` en `estados_notificacion`
    const eligibleUsers = mockData.usuarios.filter(u =>
        u.activo &&
        u.recibe_notificaciones &&
        u.estados_notificacion &&
        u.estados_notificacion.includes(id_estado)
    );

    // Filter further by visibility
    const finalUsers = eligibleUsers.filter(u => {
        if (u.visibilidad === 'todos') return true;
        if (u.visibilidad === 'propios' && ticket.id_usuario === u.id_usuario) return true;
        if (u.visibilidad === 'especificos' && (ticket.id_usuario === u.id_usuario || u.usuarios_visibles?.includes(ticket.id_usuario))) return true;
        return false;
    });

    return finalUsers.map(u => u.email);
}

async function reportStateChange(ticket, newEstadoId) {
    const smtpConfig = getSmtpConfig();

    // Si no hay host configurado, salir
    if (!smtpConfig.smtp_server) {
        console.log('[MailService] Servidor SMTP no configurado. Se omite envío.');
        return;
    }

    const template = getTemplateForState(newEstadoId);
    if (!template) {
        console.log(`[MailService] No existe plantilla para el estado ${newEstadoId}. Se omite envío.`);
        return;
    }

    const recipients = getRecipientsForState(newEstadoId, ticket);
    if (!recipients || recipients.length === 0) {
        console.log(`[MailService] No hay destinatarios configurados para recibir notificaciones del estado ${newEstadoId}.`);
        return;
    }

    // Preparar el motor de nodemailer
    const transporter = nodemailer.createTransport({
        host: smtpConfig.smtp_server,
        port: parseInt(smtpConfig.smtp_port) || 587,
        secure: smtpConfig.smtp_secure === 'true', // true for 465, false for other ports
        auth: {
            user: smtpConfig.smtp_user,
            pass: smtpConfig.smtp_password
        }
    });

    const estadoInfo = mockData.estados.find(e => e.id_estado === newEstadoId);
    const estadoNombre = estadoInfo ? estadoInfo.nombre : 'Desconocido';
    const empresaNombre = getEmpresaName();

    // Reemplazar variables
    let subject = template.asunto || '';
    let html = template.cuerpo_html || '';

    const replacements = {
        '[ticket_numero]': ticket.numero_ticket,
        '[file]': ticket.num_file || 'No asignado',
        '[pasajero]': ticket.pasajero || 'No especificado',
        '[estado]': estadoNombre,
        '[nombre_empresa]': empresaNombre,
        '[agencia]': ticket.agencia || 'Sin Agencia',
        '[proveedor]': ticket.proveedor_nombre || 'Sin Proveedor',
        '[monto]': ticket.monto ? ticket.monto.toLocaleString() : '0',
        '[moneda]': ticket.moneda || 'CLP',
        '[descripcion]': ticket.descripcion || 'Sin descripción'
    };

    for (const [key, value] of Object.entries(replacements)) {
        subject = subject.replace(new RegExp(key.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), value);
        html = html.replace(new RegExp(key.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), value);
    }

    try {
        const info = await transporter.sendMail({
            from: `"${empresaNombre}" <${smtpConfig.smtp_user}>`,
            to: recipients.join(', '), // Enviar a todos los destinatarios
            subject: subject,
            html: html
        });
        console.log('[MailService] Correo enviado correctamente: %s', info.messageId);
    } catch (err) {
        console.error('[MailService] Error al enviar correo:', err);
    }
}

module.exports = {
    reportStateChange
};
