const nodemailer = require('nodemailer');
const AdminEmailModel = require('../models/adminEmailModel');

async function crearTransporter() {
  const smtp = await AdminEmailModel.getSmtpConfig();
  if (!smtp) throw new Error('No hay configuración SMTP en la base de datos');
  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtp.mail_user, pass: smtp.mail_pass }
    }),
    smtp
  };
}

function formatearFecha(fecha) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  const [year, month, day] = fecha.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return `${dias[d.getDay()]} ${parseInt(day)} de ${meses[d.getMonth()]} de ${year}`;
}

function formatearHora(hora) {
  const [h, m] = hora.split(':');
  const hour = parseInt(h);
  const suffix = hour >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${hour12}:${m} ${suffix}`;
}

function generarHTMLReserva(datos) {
  const { nombre_persona, sala, fecha_reserva, hora_inicio, hora_fin, equipos, notas, numero_reserva, email, telefono } = datos;

  const equiposHTML = equipos && equipos.length > 0
    ? equipos.map(e => `
        <tr>
          <td style="padding: 8px 16px; border-bottom: 1px solid #e8e8e8; color: #444; font-size: 14px;">
            ${e.nombre || e}
          </td>
        </tr>`).join('')
    : '<tr><td style="padding: 8px 16px; color: #999; font-size: 14px;">Ninguno solicitado</td></tr>';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 36px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">
                Nueva Reservación de Sala
              </h1>
              <p style="margin: 8px 0 0; color: #bee3f8; font-size: 14px; font-weight: 400;">
                ${numero_reserva}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px 24px;">
              
              <!-- Saludo -->
              <p style="margin: 0 0 24px; color: #2d3748; font-size: 15px; line-height: 1.6;">
                Se ha registrado una nueva reservación con los siguientes datos:
              </p>

              <!-- Info Card: Solicitante -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #1a365d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px;">Solicitante</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px; width: 100px;">Nombre</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px; font-weight: 500;">${nombre_persona}</td>
                      </tr>
                      ${email ? `<tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px;">Correo</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px;">${email}</td>
                      </tr>` : ''}
                      ${telefono ? `<tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px;">Teléfono</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px;">${telefono}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info Card: Reservación -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #1a365d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px;">Detalles de la Reservación</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px; width: 100px;">Sala</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px; font-weight: 500;">${sala}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px;">Fecha</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px; font-weight: 500;">${formatearFecha(fecha_reserva)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #718096; font-size: 13px;">Horario</td>
                        <td style="padding: 4px 0; color: #2d3748; font-size: 14px; font-weight: 500;">${formatearHora(hora_inicio)} — ${formatearHora(hora_fin)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info Card: Equipos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #1a365d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px;">Equipos Solicitados</strong>
                  </td>
                </tr>
                ${equiposHTML}
              </table>

              <!-- Notas -->
              ${notas ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f7fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #1a365d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px;">Notas</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; color: #4a5568; font-size: 14px; line-height: 1.6; font-style: italic;">
                    ${notas}
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                Este correo fue generado automáticamente por el sistema de reservaciones.
              </p>
              <p style="margin: 6px 0 0; color: #a0aec0; font-size: 12px;">
                Sala de Juntas — Tabasco
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function enviarCorreoReserva(datosReserva) {
  const html = generarHTMLReserva(datosReserva);
  const asunto = `Nueva Reservación: ${datosReserva.sala} — ${formatearFecha(datosReserva.fecha_reserva)}`;

  const [{ transporter, smtp }, destinatarios] = await Promise.all([
    crearTransporter(),
    AdminEmailModel.getActive()
  ]);

  if (destinatarios.length === 0) {
    console.warn('No hay destinatarios activos para el correo de reserva');
    return false;
  }

  const resultados = await Promise.allSettled(
    destinatarios.map(correo =>
      transporter.sendMail({
        from: `"Sala de Juntas Tabasco" <${smtp.mail_user}>`,
        to: correo,
        subject: asunto,
        html
      })
    )
  );

  resultados.forEach((resultado, i) => {
    if (resultado.status === 'fulfilled') {
      console.log(`Correo enviado a ${destinatarios[i]}:`, resultado.value.messageId);
    } else {
      console.error(`Error al enviar correo a ${destinatarios[i]}:`, resultado.reason);
    }
  });

  return resultados.some(r => r.status === 'fulfilled');
}

async function enviarEmailReset(username, resetLink) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - ART</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ART - Restablecer Contraseña</h1>
  </div>
  
  <div style="background: white; border: 1px solid #ddd; border-radius: 0 0 10px 10px; padding: 30px;">
    <h2 style="color: #333; margin-top: 0;">Hola ${username},</h2>
    
    <p>Hemos recibido una solicitud para restablecer tu contraseña de administrador.</p>
    
    <p>Si solicitaste este cambio, haz clic en el siguiente enlace para crear una nueva contraseña:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
    </div>
    
    <p><strong>Este enlace expirará en 1 hora.</strong></p>
    
    <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida.</p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px;">
      Si el botón no funciona, copia y pega esta URL en tu navegador:<br>
      <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
    </p>
  </div>
</body>
</html>`;

  try {
    const { transporter, smtp } = await crearTransporter();
    await transporter.sendMail({
      from: `"ART Sistema" <${smtp.mail_user}>`,
      to: smtp.admin_email,
      subject: 'Restablecer Contraseña - ART',
      html
    });
    console.log('Email de reset enviado');
    return true;
  } catch (error) {
    console.error('Error al enviar email de reset:', error);
    return false;
  }
}

module.exports = { enviarCorreoReserva, enviarEmailReset };
