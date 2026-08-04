const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { findUserByUsername } = require('../../utils/findUser');
const { verifyToken } = require('../../utils/verifyToken');

const router = express.Router();
const clipsRoot = path.join(__dirname, '../../db/clips');

function getAuthUserId(req) {
    const result = verifyToken(req.headers.token || req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    return result && result.valid ? result.userID : null;
}

async function resolveUser(identifier) {
    if (/^\d+$/.test(String(identifier))) {
        const userPath = path.join(__dirname, '../../db/users', `${identifier}.json`);
        try {
            return JSON.parse(await fsp.readFile(userPath, 'utf8'));
        } catch (_) {
            return null;
        }
    }
    return findUserByUsername(String(identifier));
}

function clipDirectory(userId) {
    return path.join(clipsRoot, String(userId));
}

function metadataPath(userId, clipId) {
    return path.join(clipDirectory(userId), `${clipId}.json`);
}

async function readClipMetadata(userId, clipId) {
    try {
        return JSON.parse(await fsp.readFile(metadataPath(userId, clipId), 'utf8'));
    } catch (_) {
        return null;
    }
}

function canView(clip, requesterId) {
    return !clip.isPrivate || String(clip.userID) === String(requesterId);
}

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const userId = getAuthUserId(req);
        if (!userId) return cb(new Error('Authentication required'));
        try {
            await fsp.mkdir(clipDirectory(userId), { recursive: true });
            cb(null, clipDirectory(userId));
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.webp`)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/webp') cb(null, true);
        else cb(new Error('Only WebP format is supported'));
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

async function uploadClip(req, res) {
    const userID = getAuthUserId(req);
    if (!userID) return res.status(401).json({ message: 'Authentication required' });
    if (!req.file) return res.status(400).json({ message: 'No clip file provided' });

    const isPrivate = req.body.private === true || req.body.private === 'true' || req.body.isPrivate === true || req.body.isPrivate === 'true';
    const clipID = path.basename(req.file.filename, '.webp');
    const clip = {
        clipID,
        userID,
        filename: req.file.filename,
        isPrivate,
        createdAt: new Date().toISOString(),
        mimeType: req.file.mimetype,
        size: req.file.size
    };
    await fsp.writeFile(metadataPath(userID, clipID), JSON.stringify(clip, null, 2), 'utf8');
    res.status(201).json({ message: 'Clip saved successfully', clip });
}

// Kept as an alias for clients using the original endpoint.
router.post(['/clips', '/clip'], upload.single('clip'), (req, res) => {
    uploadClip(req, res).catch(error => {
        console.error('Clip error:', error);
        res.status(500).json({ message: 'Clip operation failed: ' + error.message });
    });
});

async function listClips(req, res) {
    const identifier = req.params.identifier || req.query.username || req.query.userid || req.query.userId;
    if (!identifier) return res.status(400).json({ message: 'Username or userID is required' });
    const user = await resolveUser(identifier);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const requesterId = getAuthUserId(req);
    const directory = clipDirectory(user.userID);
    let files = [];
    try { files = await fsp.readdir(directory); } catch (_) { /* no clips yet */ }

    const clips = (await Promise.all(files.filter(file => file.endsWith('.json')).map(file =>
        readClipMetadata(user.userID, path.basename(file, '.json'))
    ))).filter(Boolean).filter(clip => canView(clip, requesterId)).map(clip => ({
        ...clip,
        downloadUrl: `/clips/${encodeURIComponent(user.username)}/${encodeURIComponent(clip.clipID)}/download`
    }));

    res.json({ user: { userID: user.userID, username: user.username, displayname: user.displayname }, clips });
}

// identifier can be either a username or a numeric userID.
router.get('/clips/:identifier', listClips);
router.get('/clips', listClips);
router.get('/clips/user/:identifier', listClips);
router.get('/users/:identifier/clips', listClips);

router.patch('/clips/:identifier/:clipID', async (req, res) => {
    try {
        const user = await resolveUser(req.params.identifier);
        const requesterId = getAuthUserId(req);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (String(user.userID) !== String(requesterId)) return res.status(403).json({ message: 'Only the owner can change clip privacy' });
        if (!/^[0-9a-f-]{36}$/i.test(req.params.clipID)) return res.status(400).json({ message: 'Invalid clip ID' });
        const clip = await readClipMetadata(user.userID, req.params.clipID);
        if (!clip) return res.status(404).json({ message: 'Clip not found' });
        if (typeof req.body.private !== 'boolean' && typeof req.body.isPrivate !== 'boolean') {
            return res.status(400).json({ message: 'private must be a boolean' });
        }
        clip.isPrivate = req.body.private ?? req.body.isPrivate;
        await fsp.writeFile(metadataPath(user.userID, clip.clipID), JSON.stringify(clip, null, 2), 'utf8');
        res.json({ message: 'Clip privacy updated', clip });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update clip privacy: ' + error.message });
    }
});

async function downloadClip(req, res) {
    let userID = req.params.userIdentifier;
    let clipID = req.params.clipID;
    if (userID && !/^\d+$/.test(String(userID))) {
        const user = await resolveUser(userID);
        if (!user) return res.status(404).json({ message: 'User not found' });
        userID = user.userID;
    }
    if (clipID && !/^[0-9a-f-]{36}$/i.test(clipID)) {
        return res.status(400).json({ message: 'Invalid clip ID' });
    }
    let clip = userID ? await readClipMetadata(userID, clipID) : null;

    if (!clip) {
        clipID = req.params.clipID || req.params.identifier;
        const entries = await fsp.readdir(clipsRoot, { withFileTypes: true }).catch(() => []);
        for (const entry of entries.filter(item => item.isDirectory())) {
            clip = await readClipMetadata(entry.name, clipID);
            if (clip) { userID = entry.name; break; }
        }
    }
    if (!clip) return res.status(404).json({ message: 'Clip not found' });
    if (!(await canView(clip, getAuthUserId(req)))) return res.status(403).json({ message: 'This clip is private' });

    const filePath = path.join(clipDirectory(userID), clip.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Clip file not found' });
    res.download(filePath, clip.filename);
}

router.get('/clips/:userIdentifier/:clipID/download', downloadClip);
router.get('/clips/:clipID/download', downloadClip);

module.exports = router;
