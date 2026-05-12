import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import CreateModal from './components/CreateModal';
import JoinModal from './components/JoinModal';
import Dashboard from './components/Dashboard';
import Login from './components/login';
import Signup from './components/signup';

const API = 'http://localhost:5000';

let socket = null;
function getSocket() {
  if (socket && socket.connected) return socket;
  const token = localStorage.getItem('token');
  if (socket) socket.disconnect();
  socket = io(API, { auth: { token }, autoConnect: true });
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  return socket;
}

const savedToken = localStorage.getItem('token');
if (savedToken) axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userColor');
      delete axios.defaults.headers.common['Authorization'];
      if (socket) { socket.disconnect(); socket = null; }
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ═══════════════════════════════════════════════════════════
//  SVG ICONS
// ═══════════════════════════════════════════════════════════
const Icon = {
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
    </svg>
  ),
  ChevronRight: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/>
    </svg>
  ),
  MessageSquare: ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
    </svg>
  ),
  BarChart: ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  ),
  Sparkles: ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  Paperclip: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656l-6.586 6.586a6 6 0 108.485 8.485L20.5 13"/>
    </svg>
  ),
  Mic: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
    </svg>
  ),
  Play: () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>),
  Pause: () => (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>),
  File: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Image: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  Reply: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════
//  POLL COUNTDOWN
// ═══════════════════════════════════════════════════════════
function PollCountdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired]   = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    // Normalize: MySQL returns "2026-05-13 10:30:00" (no Z), ISO strings already have Z
    const raw = String(endsAt);
    const normalized = raw.includes('T') && raw.endsWith('Z')
      ? raw                                    // already ISO UTC e.g. "2026-05-13T10:30:00.000Z"
      : raw.replace(' ', 'T') + 'Z';           // MySQL datetime → treat as UTC

    const endMs = new Date(normalized).getTime();

    const tick = () => {
      const diff = endMs - Date.now();
      if (diff <= 0) { setExpired(true); setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  return (
    <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${expired ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-600'}`}>
      <Icon.Clock /> {timeLeft}
    </div>
  );
}

function ImagePreviewModal({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-3xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-600 hover:text-red-500 transition z-10">
          <Icon.X />
        </button>
        <img src={src} alt="Preview" className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain bg-white" />
      </div>
    </div>
  );
}

function ErrorNotification({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] bg-red-50 border border-red-200 rounded-2xl px-6 py-4 shadow-lg flex items-start gap-3 max-w-sm">
      <Icon.AlertCircle />
      <div className="flex-1"><p className="text-sm font-bold text-red-800">{message}</p></div>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 transition shrink-0"><Icon.X /></button>
    </div>
  );
}

function ReplyBanner({ replyTo, onClear }) {
  if (!replyTo) return null;
  return (
    <div className="mx-2 mb-2 px-4 py-3 bg-brand-50 border-l-4 border-brand-500 rounded-xl flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest mb-0.5">Replying to {replyTo.user}</p>
        <p className="text-[11px] text-gray-500 truncate">
          {replyTo.type === 'text' ? replyTo.message : replyTo.type === 'voice' ? 'Voice message' : replyTo.fileName || 'File'}
        </p>
      </div>
      <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition shrink-0 mt-0.5"><Icon.X /></button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════
function App() {
  const [view, setView]               = useState('loading');
  const [authChecked, setAuthChecked] = useState(false);

  const [rooms, setRooms]           = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomCode, setRoomCode]     = useState('');
  const [roomTitle, setRoomTitle]   = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen]     = useState(false);
  const [isPollModalOpen, setIsPollModalOpen]     = useState(false);
  const [step, setStep]                           = useState(1);

  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366f1');

  const [message, setMessage]     = useState('');
  const [chatLog, setChatLog]     = useState([]);
  const [replyTo, setReplyTo]     = useState(null);
  const [activeTab, setActiveTab] = useState('chat');

  const [polls, setPolls]               = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions]   = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(0);

  const [summaryData, setSummaryData]     = useState({ messages: [], polls: [], aiSummary: '' });
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [isRecording, setIsRecording]   = useState(false);
  const [playingId, setPlayingId]       = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const mediaRecorderRef = useRef(null);

  const [canvasElements, setCanvasElements] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen]   = useState(true);
  const [errorMessage, setErrorMessage]     = useState('');

  const socketRef  = useRef(null);
  const chatEndRef  = useRef(null);
  const fileInputRef = useRef(null);

  const sock = () => {
    if (!socketRef.current || !socketRef.current.connected) socketRef.current = getSocket();
    return socketRef.current;
  };

  // ── Auth init ─────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setView('login'); setAuthChecked(true); return; }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.get(`${API}/api/me`)
      .then((res) => {
        setDisplayName(res.data.username || localStorage.getItem('userName') || '');
        setAvatarColor(res.data.color   || localStorage.getItem('userColor') || '#6366f1');
        socketRef.current = getSocket();
        setView('dashboard');
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userColor');
        delete axios.defaults.headers.common['Authorization'];
        setView('login');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog]);
  useEffect(() => { if (view === 'dashboard') fetchRooms(); }, [view]);

  useEffect(() => {
    if (!activeRoom) return;
    const code = activeRoom.roomCode;
    const s    = sock();
    fetchPolls(code); fetchSummary(code); fetchCanvas(code); fetchChatHistory(code);
    s.emit('join_room', code);

    const handleMessage = (data) => {
      setChatLog(prev => {
        const dup = prev.some(m => m.user === data.user && m.timestamp === data.timestamp);
        return dup ? prev : [...prev, data];
      });
    };
    const handlePollUpdate = () => { fetchPolls(code); fetchSummary(code); };
    const handleElement    = (el) => setCanvasElements(prev => [...prev, el]);

    s.on('receive_message',  handleMessage);
    s.on('poll_updated',     handlePollUpdate);
    s.on('element_received', handleElement);
    return () => {
      s.off('receive_message',  handleMessage);
      s.off('poll_updated',     handlePollUpdate);
      s.off('element_received', handleElement);
    };
  }, [activeRoom]);

  // ── Fetch helpers ─────────────────────────────────────────
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API}/api/rooms`);
      const normalized = (Array.isArray(res.data) ? res.data : []).map(r => ({
        ...r,
        roomCode:   r.roomCode   || r.room_code,
        ownerName:  r.ownerName  || r.owner_name,
        avatarColor: r.avatarColor || r.avatar_color,
        coverImage: r.coverImage || r.cover_image,
        bgImage:    r.bgImage    || r.bg_image,
        visitCount: r.visitCount || r.visit_count,
        editCount:  r.editCount  || r.edit_count,
        lastEdited: r.lastEdited || r.last_edited,
      }));
      setRooms(normalized);
    } catch (err) { if (err.response?.status !== 401) setErrorMessage('Failed to fetch rooms.'); }
  };
  const fetchPolls = async (code) => {
    try { const res = await axios.get(`${API}/api/polls/${code}`); setPolls(res.data || []); }
    catch (err) { console.error('fetchPolls:', err); }
  };
  const fetchSummary = async (code) => {
    try { const res = await axios.get(`${API}/api/summary/${code}`); setSummaryData(res.data); }
    catch (err) { console.error('fetchSummary:', err); }
  };
  const fetchChatHistory = async (code) => {
    try { const res = await axios.get(`${API}/api/messages/${code}`); setChatLog(res.data || []); }
    catch (err) { console.error('fetchChatHistory:', err); }
  };
  const fetchCanvas = async (code) => {
    try { const res = await axios.get(`${API}/api/canvas/${code}`); setCanvasElements(res.data || []); }
    catch (err) { console.error('fetchCanvas:', err); }
  };

  // ── Auth handlers ─────────────────────────────────────────
  const handleAuthSuccess = () => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setDisplayName(localStorage.getItem('userName')  || '');
    setAvatarColor(localStorage.getItem('userColor') || '#6366f1');
    socketRef.current = getSocket();
    setView('dashboard');
  };

  const handleLogout = async () => {
    try { await axios.post(`${API}/api/logout`); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userColor');
    delete axios.defaults.headers.common['Authorization'];
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    socket = null;
    setView('login'); setRooms([]); setActiveRoom(null); setDisplayName(''); setChatLog([]); setPolls([]);
  };

  // ── Room handlers ─────────────────────────────────────────
  const enterRoom = (room) => {
    const code = room?.roomCode || room?.room_code;
    if (!code) return;
    const normalizedRoom = { ...room, roomCode: code };
    setActiveRoom(normalizedRoom);
    sock().emit('join_room', code);
    //  FIX: visit increments properly now
    axios.patch(`${API}/api/rooms/${code}/visit`).catch(console.error);
    fetchCanvas(code); fetchChatHistory(code); fetchPolls(code); fetchSummary(code);
  };

  const handleCreateRoom = async () => {
    const code    = roomCode || 'TT-' + Math.floor(1000 + Math.random() * 9000);
    const newRoom = { roomCode: code.toUpperCase(), title: roomTitle || 'Untitled Project', ownerName: displayName || 'Anonymous', avatarColor };
    localStorage.setItem('userColor', avatarColor);
    try {
      await axios.post(`${API}/api/rooms`, newRoom);
      setRoomCode(code.toUpperCase()); setStep(3); fetchRooms();
    } catch (err) { setErrorMessage('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) { setErrorMessage('Please enter a room code.'); return; }
    try {
      const res  = await axios.get(`${API}/api/rooms`);
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find(r => (r.roomCode || r.room_code)?.toUpperCase() === roomCode.trim().toUpperCase());
      if (found) { enterRoom(found); setIsJoinModalOpen(false); setRoomCode(''); }
      else setErrorMessage('Room code not found. Please check and try again.');
    } catch { setErrorMessage('Failed to find room. Is the server running?'); }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this project permanently?')) return;
    try { await axios.delete(`${API}/api/rooms/${roomId}`); fetchRooms(); }
    catch { setErrorMessage('Could not delete the room.'); }
  };

  const handleRenameRoom = async (roomId, currentTitle) => {
    const newTitle = window.prompt('Enter new project name:', currentTitle);
    if (newTitle?.trim() && newTitle !== currentTitle) {
      try { await axios.put(`${API}/api/rooms/${roomId}`, { title: newTitle }); fetchRooms(); }
      catch { setErrorMessage('Could not rename the room.'); }
    }
  };

  // ✅ FIX: cover image — refreshes rooms list AND updates card immediately
  const handleChangeCover = async (roomId) => {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await axios.patch(`${API}/api/rooms/${roomId}/cover`, fd);
        // Update the room in state immediately so card re-renders with new cover
        setRooms(prev => prev.map(r =>
          r.id === roomId ? { ...r, cover_image: res.data.coverUrl } : r
        ));
      } catch { setErrorMessage('Error updating cover image.'); }
    };
    input.click();
  };

  // ── Canvas ────────────────────────────────────────────────
  const handleDropOnCanvas = async (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('itemData');
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = Math.round(e.clientX - rect.left - 80);
    const y    = Math.round(e.clientY - rect.top  - 40);
    const newEl = { roomCode: activeRoom.roomCode, url: data.url, x, y };
    try {
      await axios.post(`${API}/api/canvas`, newEl);
      sock().emit('element_added', newEl);
      setCanvasElements(prev => [...prev, newEl]);
    } catch { setErrorMessage('Failed to add image to canvas.'); }
  };

  // ── Chat ──────────────────────────────────────────────────
  const sendMessage = () => {
    if (!message.trim() || !activeRoom) return;
    const msgData = {
      room: activeRoom.roomCode, message, user: displayName || 'User',
      color: avatarColor, type: 'text', timestamp: Date.now(),
      replyTo: replyTo ? { user: replyTo.user, message: replyTo.message, type: replyTo.type, fileName: replyTo.fileName } : null,
    };
    sock().emit('send_message', msgData);
    // ✅ FIX: increment edit count on each message sent
    axios.patch(`${API}/api/rooms/${activeRoom.roomCode}/edit`).catch(console.error);
    setChatLog(prev => [...prev, msgData]);
    setMessage(''); setReplyTo(null);
  };

  // ✅ FIX: media messages now persist — they are saved to DB via socket send_message
  // The socket handler on the server INSERTs the message, so on reload they come back from fetchChatHistory
  const handleUpload = async (e, type = 'file') => {
    const file = e.target?.files ? e.target.files[0] : e;
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setErrorMessage('File size exceeds 50 MB limit.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    axios.patch(`${API}/api/rooms/${activeRoom.roomCode}/edit`).catch(console.error);
    try {
      const res     = await axios.post(`${API}/api/upload`, fd);
      const isImage = file.type?.startsWith('image/');
      const msgData = {
        room:      activeRoom.roomCode,
        user:      displayName || 'User',
        type:      isImage ? 'image' : type,
        fileUrl:   res.data.fileUrl,
        file_url:  res.data.fileUrl,   // ✅ also set snake_case for DB reload consistency
        fileName:  res.data.fileName,
        file_name: res.data.fileName,
        color:     avatarColor,
        timestamp: Date.now(),
        replyTo:   replyTo ? { user: replyTo.user, message: replyTo.message, type: replyTo.type } : null,
      };
      sock().emit('send_message', msgData);
      setChatLog(prev => [...prev, msgData]);
      setReplyTo(null);
      if (e.target) e.target.value = null;
    } catch { setErrorMessage('Failed to upload file. Please try again.'); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        handleUpload(new File([blob], 'voice-note.webm', { type: 'audio/webm' }), 'voice');
      };
      mediaRecorderRef.current.onerror = () => setErrorMessage('Microphone error.');
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch { setErrorMessage('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop(); setIsRecording(false);
    }
  };

  // ── Polls ─────────────────────────────────────────────────
  const handleVote = async (optionId) => {
    try {
      await axios.post(`${API}/api/polls/vote`, { optionId });
      sock().emit('update_poll', activeRoom.roomCode);
      fetchPolls(activeRoom.roomCode);
    } catch { setErrorMessage('Failed to vote. Please try again.'); }
  };

  //  FIX: poll launch — better error display so you know what went wrong
  const handleLaunchPoll = async () => {
    if (!pollQuestion.trim()) { setErrorMessage('Please enter a poll question.'); return; }
    const filledOptions = pollOptions.filter(o => o.trim());
    if (filledOptions.length < 2) { setErrorMessage('At least 2 options are required.'); return; }

    const endsAt = pollDuration > 0 ? new Date(Date.now() + pollDuration * 60 * 1000).toISOString() : null;
    try {
      await axios.post(`${API}/api/polls`, {
        roomCode: activeRoom.roomCode,
        question: pollQuestion.trim(),
        options:  filledOptions,
        endsAt,
      });
      sock().emit('update_poll', activeRoom.roomCode);
      axios.patch(`${API}/api/rooms/${activeRoom.roomCode}/edit`).catch(console.error);
      setPollQuestion(''); setPollOptions(['', '']); setPollDuration(0);
      setIsPollModalOpen(false);
      fetchPolls(activeRoom.roomCode);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to launch poll.';
      setErrorMessage(msg);
      console.error('handleLaunchPoll:', err);
    }
  };

  // ── Summary ───────────────────────────────────────────────
  const handleRefreshSummary = async () => {
    setIsSummarizing(true);
    try { await fetchSummary(activeRoom.roomCode); }
    finally { setIsSummarizing(false); }
  };

  // ── Helpers ───────────────────────────────────────────────
  const isMe          = (user) => user === (displayName || 'User');
  const isPollExpired = (poll) => {
    const raw = poll.ends_at || poll.endsAt;
    if (!raw) return false;
    const s = String(raw);
    const normalized = s.includes('T') && s.endsWith('Z') ? s : s.replace(' ', 'T') + 'Z';
    return new Date(normalized).getTime() < Date.now();
  };

  // ── Helper: get fileUrl from either camelCase or snake_case ─────────────────
  // Messages from socket use fileUrl; messages loaded from DB use file_url
  const getFileUrl  = (msg) => msg.fileUrl  || msg.file_url  || '';
  const getFileName = (msg) => msg.fileName || msg.file_name || '';

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'login')  return <Login setAuth={handleAuthSuccess} switchToSignup={() => setView('signup')} />;
  if (view === 'signup') return <Signup switchToLogin={() => setView('login')} />;

  // ── Active Room view ──────────────────────────────────────
  if (activeRoom) return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      <ErrorNotification message={errorMessage} onClose={() => setErrorMessage('')} />

      {/* HEADER */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => { setActiveRoom(null); setChatLog([]); setPolls([]); fetchRooms(); }}
            className="w-10 h-10 flex items-center justify-center bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-100 transition"
          >
            <Icon.ArrowLeft />
          </button>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Workspace</p>
            <h2 className="text-lg font-extrabold text-gray-800">{activeRoom.title}</h2>
          </div>
        </div>
        {/* ✅ FIX: room code visible in header for all users */}
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hidden md:flex items-center gap-2">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Room Code</span>
            <span className="text-sm font-black text-indigo-600 tracking-widest">{activeRoom.roomCode}</span>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
            <span className="text-sm font-bold text-gray-700">{displayName || 'You'}</span>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* CANVAS */}
        <div
          className="flex-1 h-full bg-white relative overflow-hidden cursor-crosshair"
          style={{
            backgroundImage:    activeRoom.bgImage ? `url(${activeRoom.bgImage})` : 'radial-gradient(#e2e8f0 1.5px, transparent 0)',
            backgroundSize:     activeRoom.bgImage ? 'cover' : '24px 24px',
            backgroundPosition: 'center',
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnCanvas}
        >
          {canvasElements.map((el, idx) => (
            <div key={el.id || idx} className="absolute p-2 bg-white shadow-xl border border-gray-100 rounded-xl" style={{ left: el.x, top: el.y }}>
              <img
                src={el.url} alt="" className="w-40 rounded-lg pointer-events-none"
                draggable onDragStart={(e) => e.dataTransfer.setData('itemData', JSON.stringify({ url: el.url, name: 'canvas-image' }))}
              />
            </div>
          ))}
        </div>

        {/* SIDEBAR */}
        <aside className={`bg-white border-l border-gray-100 flex flex-col h-full transition-all duration-500 ease-in-out relative shadow-2xl z-30 ${isSidebarOpen ? 'w-[420px]' : 'w-20'}`}>
          <button
            onClick={() => setIsSidebarOpen(v => !v)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-brand-500 z-50 transition-all hover:scale-110"
          >
            <Icon.ChevronRight className={`w-4 h-4 transition-transform duration-500 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSidebarOpen ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-100 px-4 shrink-0 bg-white">
                {[
                  { id: 'chat',    label: 'Chat',    TabIcon: Icon.MessageSquare },
                  { id: 'polls',   label: 'Polls',   TabIcon: Icon.BarChart      },
                  { id: 'summary', label: 'Summary', TabIcon: Icon.Sparkles      },
                ].map(({ id, label, TabIcon }) => (
                  <button
                    key={id} onClick={() => setActiveTab(id)}
                    className={`flex-1 py-5 flex flex-col items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === id ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {label}
                    {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FBFCFE]">

                {/* ── CHAT ── */}
                {activeTab === 'chat' && (
                  <div className="space-y-5 pb-2">
                    {chatLog.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Icon.MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs mt-1">Start a conversation</p>
                      </div>
                    )}
                    {chatLog.map((msg, i) => (
                      <div key={`msg-${i}-${msg.timestamp || i}`} className="w-full group">
                        <p className={`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1 ${isMe(msg.user) ? 'text-right' : 'text-left'}`}>
                          {msg.user}
                        </p>
                        {msg.replyTo && (
                          <div className={`mb-1.5 px-1 flex ${isMe(msg.user) ? 'justify-end' : 'justify-start'}`}>
                            <div className="border-l-2 border-brand-300 pl-2 py-0.5 max-w-[80%]">
                              <p className="text-[8px] font-black text-brand-400 uppercase">{msg.replyTo.user}</p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {msg.replyTo.type === 'voice' ? 'Voice message' : msg.replyTo.type === 'image' ? 'Image' : msg.replyTo.message}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isMe(msg.user) ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="max-w-[85%]">
                            {msg.type === 'text' && (
                              <div className={`px-5 py-3.5 rounded-2xl text-sm shadow-sm break-words leading-relaxed ${isMe(msg.user) ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'}`}>
                                {msg.message}
                              </div>
                            )}
                            {/* ✅ FIX: use getFileUrl() so images show after reload too */}
                            {msg.type === 'image' && getFileUrl(msg) && (
                              <div
                                className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-gray-100 max-w-[220px]"
                                onClick={() => setPreviewImage(getFileUrl(msg))}
                                draggable
                                onDragStart={e => e.dataTransfer.setData('itemData', JSON.stringify({ url: getFileUrl(msg), name: getFileName(msg) }))}
                              >
                                <img src={getFileUrl(msg)} alt={getFileName(msg)} className="w-full h-auto object-cover rounded-2xl hover:opacity-90 transition" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/20 rounded-2xl">
                                  <div className="bg-white/90 rounded-full p-2"><Icon.Image /></div>
                                </div>
                              </div>
                            )}
                            {/* ✅ FIX: voice messages use getFileUrl() so they play after reload */}
                            {msg.type === 'voice' && (
                              <div className="bg-brand-500 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-brand-500/20 min-w-[200px]">
                                <button
                                  onClick={() => {
                                    const audioEl = document.getElementById(`audio-${i}`);
                                    if (!audioEl) return;
                                    if (playingId === i) { audioEl.pause(); setPlayingId(null); }
                                    else { audioEl.play().catch(() => setPlayingId(null)); setPlayingId(i); audioEl.onended = () => setPlayingId(null); }
                                  }}
                                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white shrink-0 hover:bg-white/30 transition-all"
                                >
                                  {playingId === i ? <Icon.Pause /> : <Icon.Play />}
                                </button>
                                {getFileUrl(msg) && <audio id={`audio-${i}`} src={getFileUrl(msg)} />}
                                <div className="flex items-end gap-1 h-7 flex-1">
                                  {Array.from({ length: 14 }, (_, v) => (
                                    <div
                                      key={`bar-${i}-${v}`}
                                      className={`w-0.5 bg-white/50 rounded-full transition-all ${playingId === i ? 'animate-pulse' : ''}`}
                                      style={{ height: `${25 + Math.random() * 75}%` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {msg.type === 'file' && getFileUrl(msg) && (
                              <div
                                draggable
                                onDragStart={e => e.dataTransfer.setData('itemData', JSON.stringify({ url: getFileUrl(msg), name: getFileName(msg) }))}
                                className="bg-white border border-gray-100 px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm hover:border-brand-300 transition cursor-grab max-w-[220px]"
                              >
                                <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500 shrink-0"><Icon.File /></div>
                                <div className="overflow-hidden">
                                  <p className="text-[12px] font-bold text-gray-800 truncate">{getFileName(msg)}</p>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">File</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition opacity-0 group-hover:opacity-100 shrink-0 mb-1"
                          >
                            <Icon.Reply />
                          </button>
                        </div>
                        {msg.timestamp && (
                          <p className={`text-[8px] text-gray-300 mt-1 px-1 ${isMe(msg.user) ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* ── POLLS ── */}
                {activeTab === 'polls' && (
                  <div className="space-y-5">
                    {polls.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <Icon.BarChart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No polls yet</p>
                        <p className="text-xs mt-1">Create one to get feedback from the room</p>
                      </div>
                    )}
                    {polls.map((poll) => {
                      const expired = isPollExpired(poll);
                      const total   = poll.options?.reduce((s, o) => s + (o.votes || 0), 0) || 0;
                      return (
                        <div key={poll.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4 gap-3">
                            <h4 className="font-extrabold text-[14px] text-gray-800 leading-snug flex-1">{poll.question}</h4>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {expired
                                ? <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-3 py-1 rounded-full uppercase">Ended</span>
                                : <span className="bg-green-100 text-green-600 text-[9px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />Live
                                  </span>
                              }
                              {/* ✅ FIX: use ends_at (snake_case from DB) */}
                              <PollCountdown endsAt={poll.ends_at || poll.endsAt} />
                            </div>
                          </div>
                          <div className="space-y-2.5">
                            {poll.options?.map(opt => {
                              const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => !expired && handleVote(opt.id)}
                                  disabled={expired}
                                  className={`w-full text-left px-4 py-3.5 rounded-xl text-[12px] font-bold border transition-all relative overflow-hidden ${expired ? 'border-gray-100 cursor-not-allowed' : 'border-gray-100 hover:border-brand-200 cursor-pointer'}`}
                                >
                                  <div
                                    className={`absolute inset-0 transition-all duration-700 rounded-xl ${expired ? 'bg-gray-100' : 'bg-brand-50'}`}
                                    style={{ width: `${pct}%`, opacity: 0.6 }}
                                  />
                                  <div className="relative flex justify-between items-center">
                                    <span className={expired ? 'text-gray-500' : 'text-gray-700'}>{opt.optionText}</span>
                                    <span className={`font-black ${expired ? 'text-gray-400' : 'text-brand-600'}`}>{pct}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-gray-400 mt-3 text-right font-medium">{total} vote{total !== 1 ? 's' : ''}</p>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setIsPollModalOpen(true)}
                      className="w-full py-6 border-2 border-dashed border-brand-100 text-brand-500 rounded-3xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Icon.Plus /> Create New Poll
                    </button>
                  </div>
                )}

                {/* ── SUMMARY ── ✅ FIX: renders bullet points from Gemini properly */}
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-brand-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-brand-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Icon.Sparkles className="w-4 h-4" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">AI Smart Summary</h3>
                        </div>
                        <button
                          onClick={handleRefreshSummary} disabled={isSummarizing}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                        >
                          <div className={isSummarizing ? 'animate-spin' : ''}><Icon.RefreshCw /></div>
                        </button>
                      </div>
                      {/* ✅ FIX: render each bullet on its own line */}
                      {summaryData.aiSummary
                        ? summaryData.aiSummary.split('\n').filter(l => l.trim()).map((line, i) => (
                            <p key={i} className="text-sm font-medium leading-relaxed text-indigo-100 mb-1">{line}</p>
                          ))
                        : <p className="text-sm font-medium text-indigo-100">No activity yet. Summary appears once messages are sent.</p>
                      }
                    </div>

                    {/* Activity Timeline */}
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">
                        Activity Timeline ({summaryData.messages?.length || 0} messages)
                      </h3>
                      <div className="space-y-3">
                        {summaryData.messages?.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">No messages yet.</p>
                        )}
                        {summaryData.messages?.map((m, i) => (
                          <div key={i} className="flex gap-3 items-start p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: m.color || '#6366f1' }}>
                              {m.user?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-[11px] font-black text-gray-700">{m.user}</p>
                                {m.timestamp && (
                                  <span className="text-[9px] text-gray-300 font-medium shrink-0">
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed break-words">
                                {m.type === 'voice'
                                  ? <span className="flex items-center gap-1 text-brand-400 font-medium"><Icon.Mic /> Voice message</span>
                                  : m.type === 'image'
                                  ? <span className="flex items-center gap-1 text-indigo-400 font-medium"><Icon.Image /> Uploaded an image</span>
                                  : m.type === 'file'
                                  ? <span className="flex items-center gap-1 text-gray-500 font-medium"><Icon.File /> Shared a file: {m.file_name}</span>
                                  : m.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {summaryData.polls?.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Polls in this Room</h3>
                        <div className="space-y-3">
                          {summaryData.polls.map((p, i) => (
                            <div key={i} className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                              <p className="text-[11px] font-black text-gray-700 mb-1">{p.question}</p>
                              {p.options_summary && (
                                <p className="text-[10px] text-gray-400">{p.options_summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat input */}
              {activeTab === 'chat' && (
                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                  <ReplyBanner replyTo={replyTo} onClear={() => setReplyTo(null)} />
                  <div className="flex items-center gap-2 bg-[#F8F9FD] p-2 rounded-2xl border border-gray-100">
                    <label className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-brand-500 cursor-pointer transition rounded-xl hover:bg-brand-50">
                      <Icon.Paperclip />
                      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleUpload(e)} />
                    </label>
                    <input
                      type="text"
                      className="flex-1 bg-transparent py-2 text-sm outline-none font-medium text-gray-600 placeholder:text-gray-300"
                      placeholder={replyTo ? `Reply to ${replyTo.user}...` : 'Message team...'}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    />
                    <button
                      onMouseDown={startRecording} onMouseUp={stopRecording}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-white text-gray-400 shadow-sm hover:text-brand-500'}`}
                      title="Hold to record voice"
                    >
                      <Icon.Mic />
                    </button>
                    <button onClick={sendMessage} className="w-10 h-10 bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center hover:bg-brand-600 transition">
                      <Icon.Send />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-6 h-full">
              {[
                { id: 'chat',    TabIcon: Icon.MessageSquare },
                { id: 'polls',   TabIcon: Icon.BarChart      },
                { id: 'summary', TabIcon: Icon.Sparkles      },
              ].map(({ id, TabIcon }) => (
                <button key={id} onClick={() => { setIsSidebarOpen(true); setActiveTab(id); }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === id ? 'bg-brand-50 text-brand-500 shadow-sm' : 'text-gray-300 hover:text-brand-500'}`}>
                  <TabIcon className="w-5 h-5" />
                </button>
              ))}
              <div className="mt-auto pb-6">
                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                  {displayName ? displayName.substring(0, 2).toUpperCase() : 'ME'}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* POLL MODAL */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-lg font-extrabold text-gray-800 mb-6">Create a Poll</h3>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Question</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 mb-5 font-medium text-gray-700"
              placeholder="What do you want to ask?"
              value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
            />
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Options</label>
            <div className="space-y-2.5 mb-5">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 font-medium text-gray-700"
                    placeholder={`Option ${i + 1}`} value={opt}
                    onChange={e => { const u = [...pollOptions]; u[i] = e.target.value; setPollOptions(u); }}
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition">
                      <Icon.X />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-brand-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition mt-1">
                <Icon.Plus /> Add Option
              </button>
            </div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2 block">
              <Icon.Clock /> Poll Duration
            </label>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setPollDuration(0)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all border-2 ${
                  pollDuration === 0 ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg> No Expiry
              </button>
              <button onClick={() => { if (pollDuration === 0) setPollDuration(30); }}
                className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all border-2 ${
                  pollDuration !== 0 ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 3"/></svg> Set Time
              </button>
            </div>
            {pollDuration !== 0 && (
              <div className="flex items-center justify-center gap-8 mb-6 bg-gray-50 rounded-2xl p-5">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Hours</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPollDuration(d => Math.max(1, d - 60))} className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-brand-500 hover:text-white font-black text-lg transition-all flex items-center justify-center">−</button>
                    <span className="w-12 text-center text-2xl font-black text-gray-800">{Math.floor(pollDuration / 60)}</span>
                    <button onClick={() => setPollDuration(d => Math.min(d + 60, 1440))} className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-brand-500 hover:text-white font-black text-lg transition-all flex items-center justify-center">+</button>
                  </div>
                </div>
                <span className="text-3xl font-black text-gray-300 mt-5">:</span>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Minutes</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPollDuration(d => { const h = Math.floor(d / 60); const m = d % 60; return Math.max(1, h * 60 + (m < 5 ? 0 : m - 5)); })} className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-brand-500 hover:text-white font-black text-lg transition-all flex items-center justify-center">−</button>
                    <span className="w-12 text-center text-2xl font-black text-gray-800">{String(pollDuration % 60).padStart(2, '0')}</span>
                    <button onClick={() => setPollDuration(d => { const h = Math.floor(d / 60); const m = d % 60; return Math.min(1440, h * 60 + (m >= 55 ? 0 : m + 5)); })} className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-brand-500 hover:text-white font-black text-lg transition-all flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            )}
            {pollDuration === 0 && <div className="mb-6" />}
            <div className="flex gap-3">
              <button onClick={() => setIsPollModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleLaunchPoll} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-sm font-black shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition">Launch Poll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Dashboard view ────────────────────────────────────────
  return (
    <>
      <Dashboard
        rooms={rooms} displayName={displayName}
        setIsCreateModalOpen={setIsCreateModalOpen} setIsJoinModalOpen={setIsJoinModalOpen}
        setStep={setStep} setRoomCode={setRoomCode}
        onJoinRoom={enterRoom} onDeleteRoom={handleDeleteRoom}
        onRenameRoom={handleRenameRoom} onChangeCover={handleChangeCover}
        onLogout={handleLogout}
      />
      <CreateModal
        isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}
        step={step} setStep={setStep}
        roomTitle={roomTitle} setRoomTitle={setRoomTitle}
        avatarColor={avatarColor} setAvatarColor={setAvatarColor}
        roomCode={roomCode} setRoomCode={setRoomCode}
        handleCreate={handleCreateRoom}
      />
      <JoinModal
        isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)}
        roomCode={roomCode} setRoomCode={setRoomCode}
        avatarColor={avatarColor} setAvatarColor={setAvatarColor}
        handleJoin={handleJoinRoom}
      />
    </>
  );
}

export default App;