const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise'); 
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = "teamtalk_secret_key"; 
const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../client/public')));

// --- DATABASE SETUP ---
let db;
async function connectDB() {
    db = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true, 
        keepAliveInitialDelay: 10000
    });
    console.log("Database Connection Pool Active (Railway)");
}
connectDB();

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const username = `${firstName} ${lastName}`;
    try {
        const [existing] = await db.query(
            'SELECT * FROM users WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already in use.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.json({ message: "User registered successfully!" });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: "Registration failed. Try a different email." });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [results] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) return res.status(401).json({ error: "User not found" });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ 
                token, 
                username: user.username, 
                userId: user.id,
                avatarColor: user.avatar_color || '#6366f1'
            });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- FILE UPLOAD SETUP ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- ROOM ROUTES ---

app.get('/api/data', (req, res) => {
    res.json({ message: "Hello from Railway!" });
});

// Create room — now saves owner_id from token
app.post('/api/rooms', authenticateToken, async (req, res) => {
    try {
        const { roomCode, title, avatarColor } = req.body;
        const owner_id = req.user.id;
        const ownerName = req.user.username;

        const [result] = await db.execute(
            'INSERT INTO rooms (roomCode, title, owner_id, ownerName, avatarColor, coverImage) VALUES (?, ?, ?, ?, ?, ?)', 
            [roomCode, title, owner_id, ownerName, avatarColor, null]
        );
        res.json({ id: result.insertId, roomCode, title, owner_id, ownerName, avatarColor, coverImage: null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Get rooms only for logged in user
app.get('/api/rooms/mine', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM rooms WHERE owner_id = ? ORDER BY createdAt DESC', 
            [req.user.id]
        );
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Get messages
app.get('/api/messages/:roomCode', async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM messages WHERE roomCode = ? ORDER BY createdAt ASC', 
        [req.params.roomCode]
    );
    res.json(rows);
});

// Create poll — now saves user_id
app.post('/api/polls', authenticateToken, async (req, res) => {
    const { roomCode, question, options } = req.body;
    const user_id = req.user.id;
    const [pollResult] = await db.execute(
        'INSERT INTO polls (roomCode, question, user_id) VALUES (?, ?, ?)', 
        [roomCode, question, user_id]
    );
    for (let opt of options) {
        await db.execute(
            'INSERT INTO poll_options (pollId, optionText) VALUES (?, ?)', 
            [pollResult.insertId, opt]
        );
    }
    res.json({ success: true });
});

// Get polls
app.get('/api/polls/:roomCode', async (req, res) => {
    const [polls] = await db.query(
        'SELECT * FROM polls WHERE roomCode = ?', 
        [req.params.roomCode]
    );
    for (let poll of polls) {
        const [options] = await db.query(
            'SELECT * FROM poll_options WHERE pollId = ?', 
            [poll.id]
        );
        poll.options = options;
    }
    res.json(polls);
});

// Vote on poll
app.post('/api/polls/vote', async (req, res) => {
    await db.execute(
        'UPDATE poll_options SET votes = votes + 1 WHERE id = ?', 
        [req.body.optionId]
    );
    res.json({ success: true });
});

// Upload file — now saves user_id
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    const { roomCode, color, type } = req.body;
    const user_id = req.user.id;
    const user = req.user.username;
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    await db.execute(
        'INSERT INTO messages (roomCode, user_id, user, type, fileUrl, fileName, color) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [roomCode, user_id, user, type, fileUrl, fileName, color]
    );
    res.json({ fileUrl, fileName });
});

// Summary
app.get('/api/summary/:roomCode', async (req, res) => {
    try {
        const [msgs] = await db.query(
            `SELECT user, message, type, fileName FROM messages 
             WHERE roomCode = ? AND createdAt >= NOW() - INTERVAL 12 HOUR 
             ORDER BY createdAt DESC LIMIT 10`, 
            [req.params.roomCode]
        );
        let aiSummaryText = msgs.length > 0 ? `Active collaboration in progress.` : "";
        const [polls] = await db.query(
            'SELECT * FROM polls WHERE roomCode = ? ORDER BY id DESC LIMIT 3', 
            [req.params.roomCode]
        );
        res.json({ aiSummary: aiSummaryText, messages: msgs, polls: polls });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Canvas
app.get('/api/canvas/:roomCode', async (req, res) => {
    const [rows] = await db.query(
        'SELECT * FROM canvas_elements WHERE roomCode = ?', 
        [req.params.roomCode]
    );
    res.json(rows);
});

app.post('/api/canvas', authenticateToken, async (req, res) => {
    const { roomCode, url, x, y } = req.body;
    const user_id = req.user.id;
    const [result] = await db.execute(
        'INSERT INTO canvas_elements (roomCode, user_id, url, x, y) VALUES (?, ?, ?, ?, ?)', 
        [roomCode, user_id, url, x, y]
    );
    res.json({ id: result.insertId, success: true });
});

// Update room title
app.put('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'UPDATE rooms SET title = ? WHERE id = ? AND owner_id = ?', 
            [req.body.title, req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Delete room — only owner can delete
app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        await db.execute(
            'DELETE FROM rooms WHERE id = ? AND owner_id = ?', 
            [req.params.id, req.user.id]
        );
        res.json({ success: true, message: "Room deleted successfully" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Visit count
app.patch('/api/rooms/:roomCode/visit', async (req, res) => {
    try {
        await db.execute(
            'UPDATE rooms SET visitCount = visitCount + 1 WHERE roomCode = ?', 
            [req.params.roomCode]
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Edit count
app.patch('/api/rooms/:roomCode/edit', async (req, res) => {
    try {
        await db.execute(
            'UPDATE rooms SET editCount = editCount + 1 WHERE roomCode = ?', 
            [req.params.roomCode]
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Change cover — only owner
app.patch('/api/rooms/:id/cover', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await db.execute(
            'UPDATE rooms SET coverImage = ? WHERE id = ? AND owner_id = ?', 
            [fileUrl, req.params.id, req.user.id]
        );
        res.json({ success: true, coverImage: fileUrl });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Change background
app.patch('/api/rooms/:roomCode/background', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await db.execute(
            'UPDATE rooms SET bgImage = ? WHERE roomCode = ?', 
            [fileUrl, req.params.roomCode]
        );
        res.json({ success: true, bgImage: fileUrl });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- SOCKETS ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on("join_room", (roomCode) => socket.join(roomCode));
    socket.on("update_poll", (roomCode) => io.to(roomCode).emit("poll_updated"));

    socket.on("send_message", async (data) => {
        if (data.type === 'text') {
            await db.execute(
                'INSERT INTO messages (roomCode, user_id, user, message, color, type) VALUES (?, ?, ?, ?, ?, ?)', 
                [data.room, data.user_id || null, data.user, data.message, data.color, 'text']
            );
        }
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("element_added", (data) => {
        socket.to(data.roomCode).emit("element_received", data);
    });
});  

server.listen(process.env.PORT || 5000, () => console.log('Server running on port 5000'));