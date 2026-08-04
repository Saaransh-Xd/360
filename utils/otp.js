const fs = require('fs');
const path = require('path');

const otpFile = path.join(__dirname, '../db/otp.json');
const pendingDir = path.join(__dirname, '../db/pending');

function readOTPData() {
    if (fs.existsSync(otpFile)) {
        return JSON.parse(fs.readFileSync(otpFile, 'utf8'));
    }
    return {};
}

function writeOTPData(data) {
    fs.writeFileSync(otpFile, JSON.stringify(data, null, 2), 'utf8');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeOTP(email, otp) {
    const data = readOTPData();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    data[email] = {
        otp,
        expiresAt: Date.now() + expiryMinutes * 60 * 1000
    };

    writeOTPData(data);
}

async function verifyOTP(email, otp) {
    const data = readOTPData();
    const record = data[email];

    if (!record) {
        return { valid: false, message: "No OTP found for this email" };
    }

    if (Date.now() > record.expiresAt) {
        delete data[email];
        writeOTPData(data);
        return { valid: false, message: "OTP has expired" };
    }

    if (record.otp !== otp) {
        return { valid: false, message: "Invalid OTP" };
    }

    delete data[email];
    writeOTPData(data);
    return { valid: true, message: "OTP verified" };
}

async function storePendingUser(email, userData) {
    if (!fs.existsSync(pendingDir)) {
        fs.mkdirSync(pendingDir, { recursive: true });
    }
    const filePath = path.join(pendingDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2), 'utf8');
}

async function getPendingUser(email) {
    const filePath = path.join(pendingDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        fs.unlinkSync(filePath);
        return data;
    }
    return null;
}

module.exports = { generateOTP, storeOTP, verifyOTP, storePendingUser, getPendingUser };
