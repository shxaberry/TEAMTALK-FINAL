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
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SECRET_KEY = "teamtalk_secret_key";
const app = express();

// ── Gemini client for AI summary ──────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../client/public')));

// ── Database ──────────────────────────────────────────────────────────────────
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
    console.log("Database Connection Pool Active");

    // ── Run migrations to add new columns if they don't exist ──
    await runMigrations();
}

async function runMigrations() {
    try {
        // polls table: add endsAt column
        await db.execute(`
            ALTER TABLE polls 
            ADD COLUMN IF NOT EXISTS endsAt DATETIME NULL
        `).catch(() => {}); // ignore if already exists

        // messages table: add replyTo and timestamp columns
        await db.execute(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS replyTo JSON NULL
        `).catch(() => {});

        await db.execute(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS timestamp BIGINT NULL
        `).catch(() => {});

        // messages table: allow 'image' as a type (update ENUM if needed)
        // If your type column is a VARCHAR this is fine already.
        // If it's ENUM, run: ALTER TABLE messages MODIFY type ENUM('text','file','voice','image')
        await db.execute(`
            ALTER TABLE messages MODIFY COLUMN type ENUM('text','file','voice','image') DEFAULT 'text'
        `).catch(() => {}); // ignore if already correct

        console.log("Migrations complete.");
    } catch (err) {
        console.error("Migration error (non-fatal):", err.message);
    }
}

connectDB();

// ── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const username = `${firstName} ${lastName}`;
    try {
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already in use.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.json({ message: "User registered successfully!" });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: "Registration failed." });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [results] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) return res.status(401).json({ error: "User not found" });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, username: user.username, userId: user.id, avatarColor: user.avatar_color || '#6366f1' });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ── File Upload ───────────────────────────────────────────────────────────────
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ── Room Routes ───────────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => res.json({ message: "Hello from server!" }));

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

app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rooms/mine', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms WHERE owner_id = ? ORDER BY createdAt DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        await db.execute('UPDATE rooms SET title = ? WHERE id = ? AND owner_id = ?', [req.body.title, req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM rooms WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/rooms/:roomCode/visit', async (req, res) => {
    try {
        await db.execute('UPDATE rooms SET visitCount = visitCount + 1 WHERE roomCode = ?', [req.params.roomCode]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/rooms/:roomCode/edit', async (req, res) => {
    try {
        await db.execute('UPDATE rooms SET editCount = editCount + 1 WHERE roomCode = ?', [req.params.roomCode]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/rooms/:id/cover', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await db.execute('UPDATE rooms SET coverImage = ? WHERE id = ? AND owner_id = ?', [fileUrl, req.params.id, req.user.id]);
        res.json({ success: true, coverImage: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/rooms/:roomCode/background', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await db.execute('UPDATE rooms SET bgImage = ? WHERE roomCode = ?', [fileUrl, req.params.roomCode]);
        res.json({ success: true, bgImage: fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Message Routes ────────────────────────────────────────────────────────────

// GET messages — returns all fields including replyTo and timestamp
app.get('/api/messages/:roomCode', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM messages WHERE roomCode = ? ORDER BY createdAt ASC',
            [req.params.roomCode]
        );
        // Parse replyTo JSON string back to object
        const parsed = rows.map(row => ({
            ...row,
            replyTo: row.replyTo ? (typeof row.replyTo === 'string' ? JSON.parse(row.replyTo) : row.replyTo) : null
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Poll Routes ───────────────────────────────────────────────────────────────

// CHANGED: now accepts and saves endsAt
app.post('/api/polls', authenticateToken, async (req, res) => {
    try {
        const { roomCode, question, options, endsAt } = req.body;
        const user_id = req.user.id;

        // Save endsAt as a proper datetime (convert from ISO string)
        const endsAtValue = endsAt ? new Date(endsAt) : null;

        const [pollResult] = await db.execute(
            'INSERT INTO polls (roomCode, question, user_id, endsAt) VALUES (?, ?, ?, ?)',
            [roomCode, question, user_id, endsAtValue]
        );

        for (let opt of options) {
            await db.execute(
                'INSERT INTO poll_options (pollId, optionText) VALUES (?, ?)',
                [pollResult.insertId, opt]
            );
        }

        res.json({ success: true, id: pollResult.insertId });
    } catch (err) {
        console.error("Poll creation error:", err);
        res.status(500).json({ error: err.message });
    }
});

// CHANGED: now returns endsAt so the frontend countdown works
app.get('/api/polls/:roomCode', async (req, res) => {
    try {
        const [polls] = await db.query(
            'SELECT * FROM polls WHERE roomCode = ? ORDER BY id DESC',
            [req.params.roomCode]
        );
        for (let poll of polls) {
            const [options] = await db.query(
                'SELECT * FROM poll_options WHERE pollId = ?',
                [poll.id]
            );
            poll.options = options;
            // Convert endsAt to ISO string for frontend
            poll.endsAt = poll.endsAt ? new Date(poll.endsAt).toISOString() : null;
        }
        res.json(polls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/polls/vote', async (req, res) => {
    try {
        await db.execute('UPDATE poll_options SET votes = votes + 1 WHERE id = ?', [req.body.optionId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Upload Route ──────────────────────────────────────────────────────────────

// CHANGED: detects image type automatically, saves replyTo
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { roomCode, color, type, replyTo, timestamp } = req.body;
        const user_id = req.user.id;
        const user = req.user.username;
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        const fileName = req.file.originalname;
        const mimeType = req.file.mimetype || '';

        // Auto-detect image type from mime
        const resolvedType = mimeType.startsWith('image/') ? 'image' : (type || 'file');

        // Parse replyTo if sent as string
        let replyToValue = null;
        try { replyToValue = replyTo ? JSON.stringify(JSON.parse(replyTo)) : null; }
        catch { replyToValue = null; }

        const ts = timestamp ? parseInt(timestamp) : Date.now();

        await db.execute(
            'INSERT INTO messages (roomCode, user_id, user, type, fileUrl, fileName, color, replyTo, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [roomCode, user_id, user, resolvedType, fileUrl, fileName, color, replyToValue, ts]
        );

        res.json({ fileUrl, fileName, type: resolvedType });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ── Summary Route (with real AI) ──────────────────────────────────────────────
app.get('/api/summary/:roomCode', async (req, res) => {
    try {
        // Fetch all messages since room was active (last 24h for summary)
        const [msgs] = await db.query(
            `SELECT user, message, type, fileName, color, timestamp, createdAt 
             FROM messages 
             WHERE roomCode = ? 
             ORDER BY createdAt ASC`,
            [req.params.roomCode]
        );

        const [polls] = await db.query(
            `SELECT p.*, GROUP_CONCAT(po.optionText, ':', po.votes SEPARATOR ' | ') as optionSummary
             FROM polls p 
             LEFT JOIN poll_options po ON po.pollId = p.id
             WHERE p.roomCode = ? 
             GROUP BY p.id 
             ORDER BY p.id DESC`,
            [req.params.roomCode]
        );

        // Build AI summary from messages
        let aiSummaryText = "No messages yet. Summary will appear once the room has activity.";

        if (msgs.length > 0) {
            // Build a readable transcript for Claude
            const transcript = msgs
                .filter(m => m.type === 'text' && m.message)
                .slice(-30) // last 30 text messages for context window efficiency
                .map(m => `${m.user}: ${m.message}`)
                .join('\n');

            const pollSummary = polls.length > 0
                ? polls.map(p => `Poll: "${p.question}" | Results: ${p.optionSummary || 'no votes'}`).join('\n')
                : '';

            if (transcript || pollSummary) {
                try {
                    const prompt = `You are summarizing a team collaboration room chat. Be concise (2-4 sentences). Summarize the key topics discussed, decisions made, and any notable activity. Do not mention names unless needed.

${transcript ? `Chat messages:\n${transcript}` : ''}
${pollSummary ? `\nPolls:\n${pollSummary}` : ''}

Provide a brief, professional summary:`;

                    const aiRes = await geminiModel.generateContent(prompt);
                    aiSummaryText = aiRes.response.text() || aiSummaryText;
                } catch (aiErr) {
                    console.error("AI summary failed (non-fatal):", aiErr.message);
                    // Fallback to basic summary
                    const uniqueUsers = [...new Set(msgs.map(m => m.user))];
                    aiSummaryText = `${msgs.length} message${msgs.length !== 1 ? 's' : ''} exchanged by ${uniqueUsers.length} participant${uniqueUsers.length !== 1 ? 's' : ''}${polls.length > 0 ? `, with ${polls.length} poll${polls.length !== 1 ? 's' : ''} created` : ''}.`;
                }
            }
        }

        // Return messages with proper timestamp for frontend
        const formattedMsgs = msgs.map(m => ({
            ...m,
            timestamp: m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : null)
        }));

        res.json({ aiSummary: aiSummaryText, messages: formattedMsgs, polls });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Canvas Routes ─────────────────────────────────────────────────────────────
app.get('/api/canvas/:roomCode', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM canvas_elements WHERE roomCode = ?', [req.params.roomCode]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/canvas', authenticateToken, async (req, res) => {
    try {
        const { roomCode, url, x, y } = req.body;
        const user_id = req.user.id;
        const [result] = await db.execute(
            'INSERT INTO canvas_elements (roomCode, user_id, url, x, y) VALUES (?, ?, ?, ?, ?)',
            [roomCode, user_id, url, x, y]
        );
        res.json({ id: result.insertId, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on("join_room", (roomCode) => {
        socket.join(roomCode);
    });

    socket.on("update_poll", (roomCode) => {
        io.to(roomCode).emit("poll_updated");
    });

    // CHANGED: saves replyTo and timestamp to DB
    socket.on("send_message", async (data) => {
        try {
            if (data.type === 'text') {
                const replyToValue = data.replyTo ? JSON.stringify(data.replyTo) : null;
                const ts = data.timestamp || Date.now();

                await db.execute(
                    'INSERT INTO messages (roomCode, user_id, user, message, color, type, replyTo, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [data.room, data.user_id || null, data.user, data.message, data.color, 'text', replyToValue, ts]
                );
            }
            // Broadcast to everyone else in the room
            io.to(data.room).emit("receive_message", data);
        } catch (err) {
            console.error("Socket send_message error:", err.message);
        }
    });

    socket.on("element_added", (data) => {
        socket.to(data.roomCode).emit("element_received", data);
    });
});

server.listen(process.env.PORT || 5000, () => console.log('Server running on port 5000'));