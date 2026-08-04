const fs = require('fs').promises;
const path = require('path');

const usersDir = path.join(__dirname, '../db/users');

async function findUserByEmail(email) {
    const userFiles = await fs.readdir(usersDir);

    for (const file of userFiles) {
        const user = JSON.parse(await fs.readFile(path.join(usersDir, file), 'utf8'));
        if (user.email === email) {
            return user;
        }
    }

    return null;
}

async function findUserByUsername(username) {
    const userFiles = await fs.readdir(usersDir);

    for (const file of userFiles) {
        const user = JSON.parse(await fs.readFile(path.join(usersDir, file), 'utf8'));
        if (user.username === username) {
            return user;
        }
    }

    return null;
}

module.exports = { findUserByEmail, findUserByUsername };
