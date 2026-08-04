const fs = require('fs').promises;
const path = require('path');
const { generateToken } = require('./generateToken');

const usersDir = path.join(__dirname, '../db/users');

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function registerUser(email, username, dob, displayname) {
    try {
        if (!email || !username || !dob || !displayname) {
            return { 
                message: "Missing required fields", 
                token: null, 
                statusCode: 400 
            };
        }

        const userFiles = await fs.readdir(usersDir);

        for (const file of userFiles) {
            const existingUser = JSON.parse(await fs.readFile(path.join(usersDir, file), 'utf8'));
            if (existingUser.email === email || existingUser.username === username) {
                return {
                    message: "Account already exists",
                    token: null,
                    statusCode: 409
                };
            }
        }

        let userID;
        let userFilePath;

        do {
            userID = Math.floor(Math.random() * 1000000);
            userFilePath = path.join(usersDir, `${userID}.json`);
        } while (await fileExists(userFilePath));

        const userData = {
            userID,
            email,
            username,
            dob,
            displayname
        };

        await fs.writeFile(
            userFilePath,
            JSON.stringify(userData, null, 2),
            'utf8'
        );
        
        const token = await generateToken(userID);
        
        return { 
            message: "User registered successfully", 
            token, 
            statusCode: 201 
        };
    } catch (error) {
        console.error("Registration error:", error);
        return { 
            message: "Registration failed: " + error.message, 
            token: null, 
            statusCode: 500 
        };
    }
}

module.exports = { registerUser };
