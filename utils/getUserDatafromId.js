const fs = require('fs').promises;
const path = require('path');

async function getUserDataFromId(userId) {
    const userDataPath = path.join(__dirname, '../db/users', `${userId}.json`);
    try {
        const userData = JSON.parse(await fs.readFile(userDataPath, 'utf8'));
        return userData;
    } catch (err) {
        return null;
    }
}

module.exports = getUserDataFromId;