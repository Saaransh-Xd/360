require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const multer = require('multer');
const PORT = 8000;
const authRoutes = require('./routes/auth');
const clipRoutes = require('./routes/clip');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use('/', clipRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
