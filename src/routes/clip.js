const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.headers.userid;
        const clipDir = path.join(__dirname, '../../@db/clips', userId);
        if (!fs.existsSync(clipDir)) {
            fs.mkdirSync(clipDir, { recursive: true });
        }
        cb(null, clipDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `clip_${timestamp}.webp`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Only WebP format is supported'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for 60s clip
});

router.post('/clip', upload.single('clip'), async (req, res) => {
    try {
        // this endpoint is for saving the clip
        const { userId, token } = req.headers;
        
        if (!req.file) {
            return res.status(400).json({ message: "No clip file provided" });
        }

        res.status(200).json({ 
            message: "Clip saved successfully",
            filename: req.file.filename,
            path: req.file.path
        });

    } catch (error) {
        console.error("Clip error:", error);
        res.status(500).json({ message: "Clip operation failed: " + error.message });
    }
});

module.exports = router;