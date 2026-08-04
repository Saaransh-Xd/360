const fs = require('fs').promises;
const path = require('path');
const getUserDataFromId = require('./getUserDatafromId');

async function getDataFromToken(token) {
    const tokenDataPath = path.join(__dirname, '../db/tokens', `${token}.json`);
    try {
        const tokenData = JSON.parse(await fs.readFile(tokenDataPath, 'utf8'));
        const userId = Object.keys(tokenData).find(
            id => tokenData[id].value === token
        );

        // get user data from userid (internal function)

        return await getUserDataFromId(userId);

    } catch (err) {
        return null;
    }
}

module.exports = getDataFromToken;