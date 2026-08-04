const express = require('express');
const router = express.Router();
const { generateOTP, storeOTP, verifyOTP, storePendingUser, getPendingUser } = require('../../utils/otp');
const { sendEmail } = require('../../utils/sendEmail');
const { registerUser } = require('../../utils/register');
const { findUserByEmail } = require('../../utils/findUser');
const { generateToken } = require('../../utils/generateToken');

router.post('/send-otp', async (req, res) => {
    try {
        const { email, username, dob, displayname } = req.body;

        if (!email || !username || !dob || !displayname) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const otp = generateOTP();
        await storeOTP(email, otp);
        await storePendingUser(email, { email, username, dob, displayname });

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

        await sendEmail(
            email,
            'Verify your email - 360',
            `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Your verification code is:</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; 
                            font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
            `
        );

        res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({ message: "Failed to send OTP: " + error.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const result = await verifyOTP(email, otp);

        if (!result.valid) {
            return res.status(401).json({ message: result.message });
        }

        const pendingUser = await getPendingUser(email);

        if (!pendingUser) {
            return res.status(404).json({ message: "No pending registration found" });
        }

        const registerResult = await registerUser(
            pendingUser.email,
            pendingUser.username,
            pendingUser.dob,
            pendingUser.displayname
        );

        if (registerResult.statusCode !== 201) {
            return res.status(registerResult.statusCode).json({ message: registerResult.message });
        }

        res.status(201).json({
            message: "Email verified and account created",
            token: registerResult.token
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ message: "Verification failed: " + error.message });
    }
});

router.post('/login-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        const otp = generateOTP();
        await storeOTP(email, otp);

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

        await sendEmail(
            email,
            'Login Verification - 360',
            `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Login Verification</h2>
                <p>Your login code is:</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; 
                            font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
            `
        );

        res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
        console.error("Login OTP error:", error);
        res.status(500).json({ message: "Failed to send OTP: " + error.message });
    }
});

router.post('/verify-login', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const result = await verifyOTP(email, otp);

        if (!result.valid) {
            return res.status(401).json({ message: result.message });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        const token = await generateToken(user.userID);

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                userID: user.userID,
                email: user.email,
                username: user.username,
                displayname: user.displayname
            }
        });
    } catch (error) {
        console.error("Verify login error:", error);
        res.status(500).json({ message: "Login failed: " + error.message });
    }
});

module.exports = router;
