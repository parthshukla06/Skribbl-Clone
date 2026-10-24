import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/RoomManager';
import { 
  CreateRoomPayload, 
  JoinRoomPayload, 
  LeaveRoomPayload, 
  GetRoomStatePayload,
  StartGamePayload,
  ChooseWordPayload,
  DrawStrokePayload,
  ClearCanvasPayload,
  SubmitGuessPayload 
} from '../types/game';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  /**
   * Handle room creation
   */
  socket.on('create_room', (payload: CreateRoomPayload) => {
    try {
      if (!payload || typeof payload !== 'object') {
        socket.emit('room_error', { message: 'Invalid payload for room creation.' });
        return;
      }

      const playerName = payload.playerName?.trim();
      if (!playerName) {
        socket.emit('room_error', { message: 'Player name is required.' });
        return;
      }

      const { room } = roomManager.createRoom(socket.id, playerName, payload.avatar);

      // Join the Socket.IO channel
      socket.join(room.code);

      // Notify the host
      socket.emit('room_created', { room });
      socket.emit('room_state', { room });
    } catch (error: any) {
      console.error(`[Socket.IO] create_room error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: error.message || 'Failed to create room.' });
    }
  });

  /**
   * Handle joining an existing room
   */
  socket.on('join_room', (payload: JoinRoomPayload) => {
    try {
      if (!payload || typeof payload !== 'object') {
        socket.emit('room_error', { message: 'Invalid payload for joining room.' });
        return;
      }

      const roomCode = payload.roomCode?.trim()?.toUpperCase();
      const playerName = payload.playerName?.trim();

      if (!roomCode) {
        socket.emit('room_error', { message: 'Room code is required.' });
        return;
      }

      if (!playerName) {
        socket.emit('room_error', { message: 'Player name is required.' });
        return;
      }

      const { room, player } = roomManager.joinRoom(roomCode, socket.id, playerName, payload.avatar);

      // Join the Socket.IO channel
      socket.join(room.code);

      // Notify joining player
      socket.emit('room_joined', { room });
      socket.emit('room_state', { room });

      // Notify other players in the room
      socket.to(room.code).emit('player_joined', { player, room });
      // Broadcast updated room state to the entire room
      io.to(room.code).emit('room_state', { room });
    } catch (error: any) {
      console.error(`[Socket.IO] join_room error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: error.message || 'Failed to join room.' });
    }
  });

  /**
   * Handle starting the game
   */
  socket.on('start_game', (payload?: StartGamePayload) => {
    try {
      const room = roomManager.startGame(socket.id, payload?.roomCode);
      io.to(room.code).emit('room_state', { room });
    } catch (error: any) {
      console.error(`[Socket.IO] start_game error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: error.message || 'Failed to start game.' });
    }
  });

  /**
   * Handle word selection from the drawer
   */
  socket.on('choose_word', (payload: ChooseWordPayload) => {
    try {
      if (!payload || !payload.word) {
        socket.emit('room_error', { message: 'Word is required.' });
        return;
      }

      roomManager.chooseWord(socket.id, payload.word, payload.roomCode);
    } catch (error: any) {
      console.error(`[Socket.IO] choose_word error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: error.message || 'Failed to choose word.' });
    }
  });

  /**
   * Handle drawing stroke streaming from active drawer
   */
  socket.on('draw_stroke', (payload: DrawStrokePayload) => {
    try {
      if (!payload || !payload.stroke) return;
      roomManager.handleDrawStroke(socket.id, payload.stroke, payload.roomCode);
    } catch (error: any) {
      console.error(`[Socket.IO] draw_stroke error for socket ${socket.id}:`, error);
    }
  });

  /**
   * Handle canvas clear request from active drawer
   */
  socket.on('clear_canvas', (payload?: ClearCanvasPayload) => {
    try {
      roomManager.handleClearCanvas(socket.id, payload?.roomCode);
    } catch (error: any) {
      console.error(`[Socket.IO] clear_canvas error for socket ${socket.id}:`, error);
    }
  });

  /**
   * Handle guess submission from guessers
   */
  socket.on('submit_guess', (payload: SubmitGuessPayload) => {
    try {
      if (!payload || !payload.guess) return;
      roomManager.submitGuess(socket.id, payload.guess, payload.roomCode);
    } catch (error: any) {
      console.error(`[Socket.IO] submit_guess error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: error.message || 'Failed to submit guess.' });
    }
  });

  /**
   * Handle leaving a room
   */
  socket.on('leave_room', (payload?: LeaveRoomPayload) => {
    try {
      const roomCode = payload?.roomCode;
      const { room, player, newHostId, roomDeleted, roomCode: effectiveRoomCode } = roomManager.leaveRoom(socket.id, roomCode);

      if (effectiveRoomCode) {
        socket.leave(effectiveRoomCode);

        if (!roomDeleted && room && player) {
          // Broadcast to remaining room members
          io.to(effectiveRoomCode).emit('player_left', {
            playerId: player.id,
            playerName: player.name,
            newHostId,
            room,
          });
          io.to(effectiveRoomCode).emit('room_state', { room });
        }
      }
    } catch (error: any) {
      console.error(`[Socket.IO] leave_room error for socket ${socket.id}:`, error);
    }
  });

  /**
   * Handle client request for current room state
   */
  socket.on('get_room_state', (payload: GetRoomStatePayload) => {
    try {
      if (!payload || !payload.roomCode) {
        socket.emit('room_error', { message: 'Room code is required.' });
        return;
      }

      const room = roomManager.getRoom(payload.roomCode);
      if (!room) {
        socket.emit('room_error', { message: `Room "${payload.roomCode}" not found.` });
        return;
      }

      socket.emit('room_state', { room });
    } catch (error: any) {
      console.error(`[Socket.IO] get_room_state error for socket ${socket.id}:`, error);
      socket.emit('room_error', { message: 'Failed to retrieve room state.' });
    }
  });

  /**
   * Handle socket disconnect
   */
  socket.on('disconnect', (reason) => {
    try {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
      const { room, player, newHostId, roomDeleted, roomCode } = roomManager.leaveRoom(socket.id);

      if (roomCode && !roomDeleted && room && player) {
        io.to(roomCode).emit('player_left', {
          playerId: player.id,
          playerName: player.name,
          newHostId,
          room,
        });
        io.to(roomCode).emit('room_state', { room });
      }
    } catch (error: any) {
      console.error(`[Socket.IO] disconnect cleanup error for socket ${socket.id}:`, error);
    }
  });
}
