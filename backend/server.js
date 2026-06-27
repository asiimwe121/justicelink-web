const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint - this is what your "TEST SERVER" button calls
app.get('/', (req, res) => {
    res.send('LCDJP Server is Running!');
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? AND user_type = ?',
            [username, role]
        );
        
        if (users.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.json({ success: false, message: 'Wrong password' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.first_name,
                role: user.user_type
            }
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Register endpoint (simplified)
app.post('/api/register', async (req, res) => {
    const { username, password, firstName, lastName, phoneNumber, userType } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.query(
            `INSERT INTO users (username, password_hash, first_name, last_name, phone, user_type, approval_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, firstName, lastName, phoneNumber, userType, 'Approved']
        );
        
        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Username already exists' });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});