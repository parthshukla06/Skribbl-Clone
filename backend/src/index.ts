import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new SocketIOServer(server, {
  transports: ['polling', 'websocket'],
  cors: {
    origin: CLIENT_URLS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: CLIENT_URLS,
    credentials: true,
  })
);
app.use(express.json());

import { registerRoomHandlers } from './handlers/roomHandler';
import { roomManager } from './services/RoomManager';

// Bind Socket.IO server to RoomManager for timer and broadcast events
roomManager.setIO(io);

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Skribbl Arena Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Room diagnostic endpoint
app.get('/api/rooms/:code', (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const room = roomManager.getRoom(code);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.status(200).json({ room });
});

// Socket.IO lifecycle and room handler registration
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
});

// Start HTTP server
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  Skribbl Arena Backend Server Started`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  CORS Allowed Origins: ${CLIENT_URLS.join(', ')}`);
  console.log(`=========================================`);
});
