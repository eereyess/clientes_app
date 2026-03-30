const nodemailer = require('nodemailer');
const { getConnection } = require('../config/db');

// Helper to replace placeholders like {{ticket}} with actual values
async function fillTemplate(templateHtml, variables) {
    let result = templateHtml;
    for (const key in variables) {
        // Escape braces for Regex
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        result = result.replace(regex, variables[key] || '');
    }

    // Embed in global HTML frame if it's missing <html>
    if (!result.toLowerCase().includes('<html')) {
        let logo = 'https://via.placeholder.com/150x50?text=Logo';
        let empresa = 'GClientes';
        let color = '#1e40af';

        try {
            const pool = await getConnection();
            const confRes = await pool.request().query("SELECT clave, valor FROM configuracion_visual WHERE clave IN ('nombre_empresa', 'logo_url', 'color_primario')");
            const confText = {};
            confRes.recordset.forEach(r => confText[r.clave] = r.valor);
            if (confText['logo_url']) logo = confText['logo_url'];
            if (confText['nombre_empresa']) empresa = confText['nombre_empresa'];
            if (confText['color_primario']) color = confText['color_primario'];
        } catch (e) { console.error('Error fetched config for email', e); }

        result = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
             body { font-family: Arial, sans-serif; background-color: #f4f7fc; padding: 20px; color: #334155; margin: 0; }
             .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
             .header { background: ${color}; padding: 20px; text-align: center; border-bottom: 3px solid rgba(0,0,0,0.1); }
             .header img { max-height: 65px; max-width: 200px; object-fit: contain; }
             .header h2 { color: white; margin: 0; font-size: 22px; }
             .content { padding: 30px; font-size: 15px; line-height: 1.6; }
             .footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
               ${logo && logo.startsWith('http') ? `<img src="${logo}" alt="${empresa}" />` : `<h2>${empresa}</h2>`}
            </div>
            <div class="content">
               ${result}
            </div>
            <div class="footer">
               Este es un correo automático generado por <strong>${empresa}</strong>. Por favor, no responda a este mensaje directamente.
            </div>
          </div>
        </body>
        </html>
        `;
    }

    return result;
}

// Function to send email
async function sendEmail(to, subject, htmlContent) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.office365.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Uncomment to test configuration locally
        // await transporter.verify();

        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Sistema GClientes'}" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: htmlContent,
        });

        console.log('📬 Email enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return { success: false, error };
    }
}

module.exports = {
    fillTemplate,
    sendEmail
};
