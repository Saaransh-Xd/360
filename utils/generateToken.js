const { randomBytes } = require("crypto");
const { saveToken } = require("./saveToken");

async function generateToken(userID) {
    const token = randomBytes(32).toString("hex");

    await saveToken(userID, token);
    return token;
}

module.exports = { generateToken };
