const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const { Server } = require('socket.io');
const mysql     = require('mysql2/promise');
const multer    = require('multer');
const fs        = require('fs');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const Groq      = require('groq-sdk');

// ── Constants ─────────────────────────────────────────────────────────────────
const SECRET_KEY = process.env.SECRET_KEY || 'fallback_local_secret';
const BASE_URL   = process.env.BASE_URL   || 'https://adorable-peace-production-50ae.up.railway.app';
const PORT       = process.env.PORT       || 5000;

// ── App & Server Initialization ───────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const FRONTEND_URL = "teamtalk-final-1dlk.vercel.app";

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "teamtalk-final-1dlk.vercel.app"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webm')) res.setHeader('Content-Type', 'audio/webm');
    if (filePath.endsWith('.ogg'))  res.setHeader('Content-Type', 'audio/ogg');
    if (filePath.endsWith('.mp3'))  res.setHeader('Content-Type', 'audio/mpeg');
  }
}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Groq AI ───────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Database ──────────────────────────────────────────────────────────────────
let db = null;

async function connectDB() {
  const host     = process.env.MYSQLHOST     || process.env.DB_HOST;
  const user     = process.env.MYSQLUSER     || process.env.DB_USER;
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  const port     = Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306;

  if (!host || !user || !database) {
    console.error('Missing DB env vars. Retrying in 10s...');
    setTimeout(connectDB, 10000);
    return;
  }

  const attempts = [
    { label: 'no SSL',                       ssl: false },
    { label: 'SSL rejectUnauthorized=false',  ssl: { rejectUnauthorized: false } },
  ];

  for (const attempt of attempts) {
    try {
      const pool = mysql.createPool({
        host, user, password, database, port,
        ssl:                   attempt.ssl,
        waitForConnections:    true,
        connectionLimit:       10,
        queueLimit:            0,
        enableKeepAlive:       true,
        keepAliveInitialDelay: 30000,
        connectTimeout:        15000,
      });
      await pool.query('SELECT 1');
      db = pool;
      console.log(`DB connected — ${host}:${port}/${database}`);

      // ── Schema safety patches ──────────────────────────────
      await db.query(`
        ALTER TABLE users
          MODIFY COLUMN email VARCHAR(255) NULL DEFAULT NULL,
          MODIFY COLUMN color VARCHAR(20)  NULL DEFAULT '#6366f1'
      `).catch(() => {});

      // Create poll_votes table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS poll_votes (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          poll_id    INT          NOT NULL,
          option_id  INT          NOT NULL,
          username   VARCHAR(255) NOT NULL,
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_vote (poll_id, username)
        )
      `).catch(() => {});

      // Keep-alive ping every 30s
      setInterval(async () => {
        try { await db.query('SELECT 1'); }
        catch (e) { console.warn('Keep-alive failed, reconnecting...'); db = null; connectDB(); }
      }, 30000);

      return;
    } catch (err) {
      console.warn(`✗ ${attempt.label} → ${err.message}`);
    }
  }

  console.error('All DB attempts failed. Retrying in 5s...');
  db = null;
  setTimeout(connectDB, 5000);
}

connectDB();

// ── DB Guard ──────────────────────────────────────────────────────────────────
function requireDB(req, res, next) {
  if (!db) return res.status(503).json({ message: 'Database not ready, please retry.' });
  next();
}

// ── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next();
  try { socket.user = jwt.verify(token, SECRET_KEY); next(); }
  catch { next(); }
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => socket.join(roomId));

  socket.on('send_message', async (data) => {
    try {
      if (!db) return;
      await db.query(
        `INSERT INTO messages
           (room_code, user, message, type, file_url, file_name, color, timestamp, reply_to)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          data.room,
          data.user,
          data.message  || null,
          data.type     || 'text',
          data.fileUrl  || null,
          data.fileName || null,
          data.color    || null,
          data.timestamp || Date.now(),
          JSON.stringify(data.replyTo || null),
        ]
      );
      socket.to(data.room).emit('receive_message', data);
    } catch (err) {
      console.error('send_message error:', err.message);
    }
  });

  socket.on('update_poll',   (room) => io.to(room).emit('poll_updated'));
  socket.on('element_added', (data) => socket.to(data.roomCode).emit('element_received', data));
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/signup
app.post('/api/signup', requireDB, async (req, res) => {
  const { firstName, lastName, username, email, password, color } = req.body;

  const resolvedUsername = username?.trim()
    || [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');

  if (!resolvedUsername || !password)
    return res.status(400).json({ message: 'Name/username and password are required.' });

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ?', [resolvedUsername]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: 'Username already taken.' });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, color, email) VALUES (?, ?, ?, ?)',
      [resolvedUsername, hash, color || '#6366f1', email || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('signup:', err.message);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /api/login
app.post('/api/login', requireDB, async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ message: 'Username and password are required.' });

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', [username.trim(), username.trim()]
    );
    if (users.length === 0)
      return res.status(401).json({ message: 'Invalid credentials.' });

    const user = users[0];
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ token, username: user.username, color: user.color || '#6366f1' });
  } catch (err) {
    console.error('login:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/logout
app.post('/api/logout', requireAuth, (req, res) => res.json({ success: true }));

// GET /api/me
app.get('/api/me', requireAuth, requireDB, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT username, color FROM users WHERE username = ?', [req.user.username]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(users[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ROOM ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/rooms', requireAuth, requireDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM rooms ORDER BY last_edited DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms', requireAuth, requireDB, async (req, res) => {
  const { roomCode, title, ownerName, avatarColor } = req.body;
  if (!roomCode || !title)
    return res.status(400).json({ message: 'roomCode and title are required.' });
  try {
    const [result] = await db.query(
      'INSERT INTO rooms (room_code, title, owner_name, avatar_color) VALUES (?, ?, ?, ?)',
      [roomCode, title, ownerName || req.user.username, avatarColor || '#6366f1']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/rooms/:id', requireAuth, requireDB, async (req, res) => {
  if (!req.body.title) return res.status(400).json({ message: 'Title is required.' });
  try {
    await db.query('UPDATE rooms SET title = ? WHERE id = ?', [req.body.title, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/rooms/:id', requireAuth, requireDB, async (req, res) => {
  try {
    await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/rooms/:code/visit', requireDB, async (req, res) => {
  try {
    await db.query(
      'UPDATE rooms SET visit_count = COALESCE(visit_count, 0) + 1, last_edited = NOW() WHERE room_code = ?',
      [req.params.code]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/rooms/:code/edit', requireDB, async (req, res) => {
  try {
    await db.query(
      'UPDATE rooms SET edit_count = COALESCE(edit_count, 0) + 1, last_edited = NOW() WHERE room_code = ?',
      [req.params.code]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/rooms/:id/cover', requireAuth, requireDB, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const coverUrl = `${BASE_URL}/uploads/${req.file.filename}`;
  try {
    await db.query('UPDATE rooms SET cover_image = ? WHERE id = ?', [coverUrl, req.params.id]);
    res.json({ success: true, coverUrl });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.patch('/api/rooms/:code/background', requireAuth, requireDB, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const bgImage = `${BASE_URL}/uploads/${req.file.filename}`;
  try {
    await db.query('UPDATE rooms SET bg_image = ? WHERE room_code = ?', [bgImage, req.params.code]);
    res.json({ success: true, bgImage });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  MESSAGES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/messages/:code', requireAuth, requireDB, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE room_code = ? ORDER BY timestamp ASC',
      [req.params.code]
    );
    res.json(rows.map(r => ({
      ...r,
      replyTo: r.reply_to ? JSON.parse(r.reply_to) : null,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({
    fileUrl:  `${BASE_URL}/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  POLLS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/polls/:code — returns polls with options + current user's voted option
app.get('/api/polls/:code', requireAuth, requireDB, async (req, res) => {
  try {
    const [polls] = await db.query(
      'SELECT * FROM polls WHERE room_code = ?', [req.params.code]
    );

    for (const p of polls) {
      // Get options with vote counts
      const [opts] = await db.query(
        'SELECT id, option_text AS optionText, votes FROM poll_options WHERE poll_id = ?',
        [p.id]
      );
      p.options = opts;

      // Get which option this user voted for (if any)
      const [[userVote]] = await db.query(
        'SELECT option_id FROM poll_votes WHERE poll_id = ? AND username = ?',
        [p.id, req.user.username]
      );
      p.userVotedOptionId = userVote?.option_id || null;

      // Normalize ends_at to ISO string
      if (p.ends_at) {
        try {
          const ms = p.ends_at instanceof Date
            ? p.ends_at.getTime()
            : new Date(String(p.ends_at).trim().replace(' ', 'T')).getTime();
          p.ends_at = isNaN(ms) ? null : new Date(ms).toISOString();
        } catch { p.ends_at = null; }
      }
    }

    res.json(polls);
  } catch (err) {
    console.error('GET /api/polls error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/polls — create a new poll
app.post('/api/polls', requireAuth, requireDB, async (req, res) => {
  const { roomCode, question, options, endsAt } = req.body;
  if (!roomCode || !question || !Array.isArray(options) || options.length < 2)
    return res.status(400).json({ message: 'roomCode, question, and at least 2 options required.' });
  try {
    const [result] = await db.query(
      'INSERT INTO polls (room_code, question, ends_at) VALUES (?, ?, ?)',
      [roomCode, question, endsAt ? new Date(endsAt).toISOString().slice(0, 19).replace('T', ' ') : null]
    );
    for (const opt of options) {
      await db.query(
        'INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)',
        [result.insertId, opt.trim()]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('poll create error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/polls/vote — one vote per user per poll, supports vote switching
app.post('/api/polls/vote', requireAuth, requireDB, async (req, res) => {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ message: 'optionId is required.' });

  try {
    // Look up which poll this option belongs to
    const [[option]] = await db.query(
      'SELECT poll_id FROM poll_options WHERE id = ?', [optionId]
    );
    if (!option) return res.status(404).json({ message: 'Option not found.' });

    const pollId   = option.poll_id;
    const username = req.user.username;

    // Check if this poll has expired
    const [[poll]] = await db.query(
      'SELECT room_code, ends_at FROM polls WHERE id = ?', [pollId]
    );
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });

    if (poll.ends_at) {
      let endMs;
      if (poll.ends_at instanceof Date) {
        // mysql2 may return a Date object — use it directly (already UTC)
        endMs = poll.ends_at.getTime();
      } else {
        // MySQL DATETIME string "2026-05-18 14:30:00" has no timezone.
        // We stored it via toISOString() so it IS UTC — force UTC parsing by appending Z.
        const s = String(poll.ends_at).trim().replace(' ', 'T');
        endMs = new Date(s.endsWith('Z') ? s : s + 'Z').getTime();
      }
      if (!isNaN(endMs) && endMs < Date.now()) {
        return res.status(403).json({ message: 'This poll has ended.' });
      }
    }

    // Check if user has already voted on this poll
    const [[existing]] = await db.query(
      'SELECT id, option_id FROM poll_votes WHERE poll_id = ? AND username = ?',
      [pollId, username]
    );

    if (existing) {
      if (existing.option_id === optionId) {
        // Voted for the same option — no-op
        return res.json({ success: true, unchanged: true });
      }
      // Switch vote: decrement old option, increment new option, update record
      await db.query(
        'UPDATE poll_options SET votes = GREATEST(votes - 1, 0) WHERE id = ?',
        [existing.option_id]
      );
      await db.query(
        'UPDATE poll_options SET votes = votes + 1 WHERE id = ?',
        [optionId]
      );
      await db.query(
        'UPDATE poll_votes SET option_id = ? WHERE poll_id = ? AND username = ?',
        [optionId, pollId, username]
      );
    } else {
      // First-time vote
      await db.query(
        'UPDATE poll_options SET votes = votes + 1 WHERE id = ?',
        [optionId]
      );
      await db.query(
        'INSERT INTO poll_votes (poll_id, option_id, username) VALUES (?, ?, ?)',
        [pollId, optionId, username]
      );
    }

    // Broadcast real-time update to everyone in the room
    io.to(poll.room_code).emit('poll_updated');

    res.json({ success: true });
  } catch (err) {
    console.error('vote error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CANVAS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/canvas/:code', requireAuth, requireDB, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM canvas_elements WHERE room_code = ?', [req.params.code]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/canvas', requireAuth, requireDB, async (req, res) => {
  const { roomCode, url, x, y } = req.body;
  if (!roomCode || !url) return res.status(400).json({ message: 'roomCode and url are required.' });
  try {
    await db.query(
      'INSERT INTO canvas_elements (room_code, url, x, y) VALUES (?, ?, ?, ?)',
      [roomCode, url, x || 0, y || 0]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY (AI)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/summary/:code', requireAuth, requireDB, async (req, res) => {
  try {
    const [msgs] = await db.query(
      'SELECT user, message, type, file_name, timestamp, color FROM messages WHERE room_code = ? ORDER BY timestamp ASC LIMIT 100',
      [req.params.code]
    );
    const [polls] = await db.query(
      `SELECT p.id, p.question, p.ends_at,
              GROUP_CONCAT(CONCAT(po.option_text, ': ', po.votes, ' votes') SEPARATOR ' | ') AS options_summary
       FROM polls p
       LEFT JOIN poll_options po ON po.poll_id = p.id
       WHERE p.room_code = ?
       GROUP BY p.id`,
      [req.params.code]
    );

    let aiSummary = 'No activity to summarize yet.';

    try {
      if (msgs.length > 0 || polls.length > 0) {
        let activityLines = [];
        let counter = 1;

        msgs.forEach(m => {
          const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (m.type === 'text') {
            activityLines.push(`${counter}. [${time}] ${m.user} said: "${m.message}"`);
          } else if (m.type === 'image') {
            activityLines.push(`${counter}. [${time}] ${m.user} uploaded an image (${m.file_name || 'image'})`);
          } else if (m.type === 'voice') {
            activityLines.push(`${counter}. [${time}] ${m.user} sent a voice message`);
          } else if (m.type === 'file') {
            activityLines.push(`${counter}. [${time}] ${m.user} shared a file: ${m.file_name || 'file'}`);
          }
          counter++;
        });

        polls.forEach(p => {
          activityLines.push(`${counter}. A poll was created: "${p.question}" — Results: ${p.options_summary || 'no votes yet'}`);
          counter++;
        });

        const prompt = `You are a chat summarizer like a smart assistant in Messenger or Slack.

A team was chatting in a room. Here is the full activity log:
${activityLines.join('\n')}

Write a friendly, natural 3-5 sentence paragraph that catches someone up on what they missed.
Cover: what topics were discussed, any media or files shared, and poll results if any.
Be conversational and concise. Do NOT list every message one by one. Summarize the overall session.`;

        const result = await groq.chat.completions.create({
          model:      'llama-3.1-8b-instant',
          max_tokens: 1024,
          messages:   [{ role: 'user', content: prompt }]
        });
        aiSummary = result.choices[0]?.message?.content || 'Summary unavailable.';
      }
    } catch (aiErr) {
      console.warn('AI summary error (non-fatal):', aiErr.message);
      aiSummary = 'AI summary temporarily unavailable.';
    }

    res.json({ messages: msgs, polls, aiSummary });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`BASE_URL: ${BASE_URL}`);
});