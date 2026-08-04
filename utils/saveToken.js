const fs = require("fs");
const path = require("path");

const tokenFile = path.join(__dirname, "../db/token.json");

function readTokenData() {
  if (fs.existsSync(tokenFile)) {
    return JSON.parse(fs.readFileSync(tokenFile, "utf8"));
  }
  return {};
}

function writeTokenData(data) {
  fs.writeFileSync(tokenFile, JSON.stringify(data, null, 2), "utf8");
}

async function saveToken(userID, tokenValue) {
  const data = readTokenData();
  const expiryDays = parseInt(process.env.TOKEN_EXPIRY_DAYS) || 256;

  data[userID] = {
    value: tokenValue,
    expiresAt: Date.now() + expiryDays * 24 * 60 * 60 * 1000
  };

  writeTokenData(data);
}

module.exports = { saveToken };
