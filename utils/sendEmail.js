const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendViaDiscord(to, subject, html) {
    const otpMatch = html.match(/\d{6}/);
    const otp = otpMatch ? otpMatch[0] : 'N/A';

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: subject,
                fields: [
                    { name: 'To', value: to, inline: true },
                    { name: 'OTP Code', value: `\`${otp}\``, inline: true }
                ],
                color: 0x5865F2,
                timestamp: new Date().toISOString()
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status}`);
    }
}

async function sendEmail(to, subject, html) {
    if (process.env.TESTING === 'true') {
        return await sendViaDiscord(to, subject, html);
    }

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
    });
    return info;
}

module.exports = { sendEmail };
