const fs = require("fs");
const path = require("path");

const tokenFile = path.join(__dirname, "../db/token.json");

function verifyToken(token) {
  if (!token) return false;

  if (!fs.existsSync(tokenFile)) return false;

  const data = JSON.parse(fs.readFileSync(tokenFile, "utf8"));

  for (const [userID, entry] of Object.entries(data)) {
    if (typeof entry === "string") {
      if (entry === token) return { valid: true, userID: parseInt(userID) };
    } else if (entry.value === token) {
      if (Date.now() > entry.expiresAt) return { valid: false, message: "Token expired" };
      return { valid: true, userID: parseInt(userID) };
    }
  }

  return { valid: false, message: "Invalid token" };
}

module.exports = { verifyToken };
