const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildVipPassHtml(attendee) {
  const projectBlock = attendee.projectName
    ? `<div style="border-bottom:1px solid #3f3f46;padding-bottom:12px;margin-bottom:14px;">
         <div style="font-size:10px;letter-spacing:1px;color:#a1a1aa;font-weight:700;">PROJECT NAME</div>
         <div style="font-size:13px;color:#e4e4e7;font-weight:600;margin-top:4px;">${escapeHtml(attendee.projectName)}</div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VIP Pass - ${escapeHtml(attendee.passId)}</title>
</head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#181818;color:#ffffff;border:2px solid #3f9c35;border-radius:12px;overflow:hidden;">
    <div style="background:#ffffff;padding:14px 18px;border-bottom:3px solid #3f9c35;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:20px;font-weight:800;color:#3f9c35;letter-spacing:1px;">TRANSGULF <span style="color:#9ea4aa;">READYMIX</span></div>
        <div style="font-size:10px;font-weight:700;color:#3f9c35;letter-spacing:1.5px;">ENGINEERED FOR YOU</div>
      </div>
      <span style="background:#181818;color:#ffffff;font-size:11px;font-weight:800;padding:6px 12px;border-radius:6px;letter-spacing:1px;">VIP PASS</span>
    </div>

    <div style="padding:22px;">
      <div style="border-bottom:1px solid #3f3f46;padding-bottom:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:#d4d4d8;">Mastering Job-Site Concrete Practice &bull; Dec 5, 2026</div>
        <div style="font-size:26px;font-family:monospace;font-weight:800;color:#ffffff;margin-top:6px;">${escapeHtml(attendee.passId)}</div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:10px;letter-spacing:1px;color:#a1a1aa;font-weight:700;">ATTENDEE NAME</div>
        <div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;">${escapeHtml(attendee.fullName)}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #3f3f46;margin-bottom:14px;">
        <tr>
          <td style="padding-bottom:14px;width:50%;vertical-align:top;">
            <div style="font-size:10px;letter-spacing:1px;color:#a1a1aa;font-weight:700;">COMPANY</div>
            <div style="font-size:14px;font-weight:700;color:#ffffff;margin-top:4px;">${escapeHtml(attendee.company)}</div>
          </td>
          <td style="padding-bottom:14px;width:50%;vertical-align:top;">
            <div style="font-size:10px;letter-spacing:1px;color:#a1a1aa;font-weight:700;">POSITION</div>
            <div style="font-size:14px;font-weight:700;color:#4caf50;margin-top:4px;">${escapeHtml(attendee.position)}</div>
          </td>
        </tr>
      </table>

      ${projectBlock}

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:55%;vertical-align:top;">
            <div style="font-size:11px;color:#a1a1aa;">Email</div>
            <div style="font-size:12px;font-weight:600;color:#f4f4f5;margin-top:3px;">${escapeHtml(attendee.email)}</div>
          </td>
          <td style="width:45%;vertical-align:top;">
            <div style="font-size:11px;color:#a1a1aa;">Mobile Number</div>
            <div style="font-size:12px;font-weight:600;color:#f4f4f5;margin-top:3px;">${escapeHtml(attendee.mobile)}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top:18px;padding-top:12px;border-top:1px solid #3f3f46;font-size:11px;color:#a1a1aa;">
        <strong>Venue:</strong> Courtyard by Marriott Riyadh Diplomatic Quarter (Assafeer Hall) &bull; 8:00 AM – 5:00 PM
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  // Allow requests from your GitHub Pages site
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-organizer-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Organizer PIN header so unauthorized callers cannot spam emails
  const pinHeader = req.headers['x-organizer-pin'];
  if (!process.env.ORGANIZER_PIN || pinHeader !== process.env.ORGANIZER_PIN) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Organizer PIN' });
  }

  const { passId, fullName, company, position, projectName, email, mobile } = req.body || {};
  if (!passId || !fullName || !email) {
    return res.status(400).json({ error: 'Missing required attendee fields (passId, fullName, email)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587 STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const passHtml = buildVipPassHtml({ passId, fullName, company, position, projectName, email, mobile });

    await transporter.sendMail({
      from: `"TRANSGULF READYMIX Events" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `VIP Pass (${passId}) — Mastering Job-Site Concrete Practice`,
      html: `
        <p>Dear <strong>${escapeHtml(fullName)}</strong>,</p>
        <p>Your registration for <strong>Mastering Job-Site Concrete Practice</strong> has been confirmed.</p>
        <p><strong>Date &amp; Time:</strong> Saturday, December 5, 2026 | 8:00 AM – 5:00 PM<br>
           <strong>Venue:</strong> Courtyard by Marriott Riyadh Diplomatic Quarter (Assafeer Hall)</p>
        <p>Your official <strong>VIP Pass (${escapeHtml(passId)})</strong> is attached to this email and displayed below. Please present it at the registration desk upon arrival.</p>
        ${passHtml}
      `,
      attachments: [
        {
          filename: `VIP_Pass_${passId}.html`,
          content: passHtml,
          contentType: 'text/html',
        },
      ],
    });

    return res.status(200).json({ ok: true, message: `VIP Pass sent to ${email}` });
  } catch (err) {
    console.error('SMTP error:', err);
    return res.status(500).json({ error: err.message || 'SMTP delivery failed' });
  }
};
