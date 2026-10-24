import { Server } from 'socket.io';
import { 
  Player, 
  RoomSettings, 
  RoomState, 
  DrawStroke, 
  GameState,
  ChatMessage,
  PlayerRanking,
} from '../types/game';
import { getRandomWords, maskWord } from '../constants/words';

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const WORD_SELECTION_TIME = 15; // 15 seconds to choose a word
const TURN_TRANSITION_TIME = 4000; // 4 seconds reveal pause before next turn
// Guessers earn ceil(1000 * remaining/draw duration); the drawer earns half that rate.
const GUESS_SCORE_MAX = 1000;
const DRAWER_SCORE_MAX = 500;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 60,
  wordCount: 3,
  isPrivate: true,
};

interface RoomInternalData {
  secretWord: string;
  wordChoices: string[];
}

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomState> = new Map();
  // Maps socketId -> roomCode for fast lookup
  private socketToRoom: Map<string, string> = new Map();
  // Authoritative server-only data (secret words, word choices)
  private internalData: Map<string, RoomInternalData> = new Map();
  // Active countdown timers
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  // Socket.IO Server reference
  private io?: Server;

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public setIO(io: Server): void {
    this.io = io;
  }

  /**
   * Generates a unique 6-character uppercase alphanumeric room code.
   */
  public generateUniqueRoomCode(): string {
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
        code += CHARACTERS[randomIndex];
      }
      attempts++;
      if (attempts > 1000) {
        throw new Error('Failed to generate unique room code. System at capacity.');
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Creates a new room with default settings and sets creator as host.
   */
  public createRoom(socketId: string, playerName: string, avatar?: string): { room: RoomState; player: Player } {
    if (this.socketToRoom.has(socketId)) {
      this.leaveRoom(socketId);
    }

    const sanitizedName = this.sanitizeName(playerName);
    const roomCode = this.generateUniqueRoomCode();

    const hostPlayer: Player = {
      id: socketId,
      name: sanitizedName,
      isHost: true,
      avatar: avatar || `avatar-${Math.floor(Math.random() * 8) + 1}`,
      score: 0,
    };

    const newRoom: RoomState = {
      code: roomCode,
      hostId: socketId,
      players: [hostPlayer],
      settings: { ...DEFAULT_ROOM_SETTINGS },
      status: 'lobby',
      createdAt: Date.now(),
      drawHistory: [],
      chatHistory: [],
    };

    this.rooms.set(roomCode, newRoom);
    this.socketToRoom.set(socketId, roomCode);
    this.internalData.set(roomCode, { secretWord: '', wordChoices: [] });

    console.log(`[RoomManager] Room created: ${roomCode} by host "${sanitizedName}" (${socketId})`);
    return { room: newRoom, player: hostPlayer };
  }

  /**
   * Joins an existing room.
   */
  public joinRoom(roomCode: string, socketId: string, playerName: string, avatar?: string): { room: RoomState; player: Player } {
    const formattedCode = roomCode.trim().toUpperCase();
    const sanitizedName = this.sanitizeName(playerName);

    const room = this.rooms.get(formattedCode);
    if (!room) {
      throw new Error(`Room "${formattedCode}" does not exist.`);
    }

    if (room.players.length >= room.settings.maxPlayers) {
      throw new Error(`Room "${formattedCode}" is full (${room.players.length}/${room.settings.maxPlayers} players).`);
    }

    const existingPlayer = room.players.find((p) => p.id === socketId);
    if (existingPlayer) {
      return { room, player: existingPlayer };
    }

    if (this.socketToRoom.has(socketId)) {
      this.leaveRoom(socketId);
    }

    let finalName = sanitizedName;
    const nameMatches = room.players.filter((p) => p.name.toLowerCase() === sanitizedName.toLowerCase());
    if (nameMatches.length > 0) {
      finalName = `${sanitizedName} (${nameMatches.length + 1})`;
    }

    const newPlayer: Player = {
      id: socketId,
      name: finalName,
      isHost: false,
      avatar: avatar || `avatar-${Math.floor(Math.random() * 8) + 1}`,
      score: 0,
    };

    room.players.push(newPlayer);
    this.socketToRoom.set(socketId, formattedCode);

    console.log(`[RoomManager] Player "${finalName}" (${socketId}) joined room ${formattedCode}. Total players: ${room.players.length}`);
    return { room, player: newPlayer };
  }

  /**
   * Removes a player from their room.
   * Handles host migration, active drawer disconnect, and cleanup.
   */
  public leaveRoom(socketId: string, specifiedRoomCode?: string): {
    room?: RoomState;
    player?: Player;
    newHostId?: string;
    roomDeleted: boolean;
    roomCode?: string;
  } {
    const roomCode = specifiedRoomCode ? specifiedRoomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);

    if (!roomCode) {
      return { roomDeleted: false };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToRoom.delete(socketId);
      this.clearRoomTimer(roomCode);
      this.internalData.delete(roomCode);
      return { roomDeleted: false };
    }

    const playerIndex = room.players.findIndex((p) => p.id === socketId);
    if (playerIndex === -1) {
      this.socketToRoom.delete(socketId);
      return { roomDeleted: false, roomCode };
    }

    const [removedPlayer] = room.players.splice(playerIndex, 1);
    this.socketToRoom.delete(socketId);

    console.log(`[RoomManager] Player "${removedPlayer.name}" (${socketId}) left room ${roomCode}. Remaining: ${room.players.length}`);

    // If room is empty, clean up everything
    if (room.players.length === 0) {
      this.clearRoomTimer(roomCode);
      this.rooms.delete(roomCode);
      this.internalData.delete(roomCode);
      console.log(`[RoomManager] Room ${roomCode} is now empty and has been deleted.`);
      return {
        roomDeleted: true,
        player: removedPlayer,
        roomCode,
      };
    }

    // Host reassignment if the host left
    let newHostId: string | undefined;
    if (removedPlayer.isHost || room.hostId === socketId) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      newHostId = room.players[0].id;
      console.log(`[RoomManager] Host left room ${roomCode}. New host assigned: "${room.players[0].name}" (${newHostId})`);
    }

    // Results are a completed-match snapshot; departures should not restart its turn lifecycle.
    if (room.status === 'game_over') {
      return {
        room,
        player: removedPlayer,
        newHostId,
        roomDeleted: false,
        roomCode,
      };
    }

    // In-game disconnect handling
    if (room.status !== 'lobby') {
      if (room.players.length < 2) {
        // Less than 2 players left: abort match and return to lobby
        this.clearRoomTimer(roomCode);
        room.status = 'lobby';
        room.game = undefined;
        room.drawHistory = [];
        console.log(`[RoomManager] Room ${roomCode} has fewer than 2 players. Returning to lobby.`);
        if (this.io) {
          this.io.to(roomCode).emit('room_state', { room });
          this.io.to(roomCode).emit('room_error', { 
            message: 'Game aborted: At least 2 players are required to continue. Returned to lobby.' 
          });
        }
      } else if (room.game && room.game.currentDrawerId === socketId) {
        // Active drawer left mid-turn! Abort turn and rotate to next drawer
        console.log(`[RoomManager] Active drawer left room ${roomCode}. Advancing turn.`);
        this.clearRoomTimer(roomCode);
        if (this.io) {
          this.io.to(roomCode).emit('turn_end', {
            reason: `${removedPlayer.name} (the drawer) disconnected.`,
          });
        }
        setTimeout(() => {
          this.advanceToNextTurn(roomCode);
        }, 2000);
      } else if (room.game) {
        // If a guesser left before the drawer's index, adjust currentDrawerIndex
        if (playerIndex < room.game.currentDrawerIndex) {
          room.game.currentDrawerIndex = Math.max(0, room.game.currentDrawerIndex - 1);
        }

        // Check if remaining non-drawers have all guessed
        const nonDrawersCount = room.players.length - 1;
        if (room.game.guessedPlayerIds.length >= nonDrawersCount && nonDrawersCount > 0) {
          this.endTurn(roomCode, 'All remaining players guessed the word!');
        }
      }
    }

    return {
      room,
      player: removedPlayer,
      newHostId,
      roomDeleted: false,
      roomCode,
    };
  }

  /**
   * Starts the game session. Validates host status and minimum player count.
   */
  public startGame(socketId: string, roomCode?: string): RoomState {
    const code = roomCode ? roomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);
    if (!code) {
      throw new Error('Room not found for this player.');
    }

    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room "${code}" does not exist.`);
    }

    // Authorization check: Only current host can start
    if (room.hostId !== socketId) {
      throw new Error('Only the room host can start the game.');
    }

    // Minimum player check: Require at least 2 players
    if (room.players.length < 2) {
      throw new Error('At least 2 players are required to start the game.');
    }

    if (room.status !== 'lobby' && room.status !== 'game_over') {
      throw new Error('A game is already in progress.');
    }

    this.clearRoomTimer(code);
    this.internalData.set(code, { secretWord: '', wordChoices: [] });
    room.players.forEach((player) => {
      player.score = 0;
    });
    room.finalResults = undefined;

    // Initialize GameState
    const firstDrawer = room.players[0];
    room.status = 'selecting_word';
    room.drawHistory = [];
    room.chatHistory = [];

    const gameState: GameState = {
      currentRound: 1,
      totalRounds: room.settings.rounds || 3,
      currentDrawerId: firstDrawer.id,
      currentDrawerName: firstDrawer.name,
      currentDrawerIndex: 0,
      turnState: 'selecting_word',
      maskedWord: '',
      wordLength: 0,
      timeLeft: WORD_SELECTION_TIME,
      guessedPlayerIds: [],
    };

    room.game = gameState;

    console.log(`[RoomManager] Game started in room ${code}. Host: ${socketId}, First Drawer: "${firstDrawer.name}" (${firstDrawer.id})`);
    
    // Initiate word selection phase
    this.startWordSelectionPhase(code);

    return room;
  }

  /**
   * Starts word selection phase: generates 3 words, sends choices ONLY to drawer,
   * starts selection countdown timer.
   */
  public startWordSelectionPhase(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.game || !this.io) return;

    this.clearRoomTimer(roomCode);

    room.status = 'selecting_word';
    room.game.turnState = 'selecting_word';
    room.game.timeLeft = WORD_SELECTION_TIME;
    room.game.maskedWord = '';
    room.game.wordLength = 0;
    room.game.guessedPlayerIds = [];
    room.drawHistory = [];

    const drawer = room.players[room.game.currentDrawerIndex];
    if (!drawer) {
      this.advanceToNextTurn(roomCode);
      return;
    }

    room.game.currentDrawerId = drawer.id;
    room.game.currentDrawerName = drawer.name;

    // Pick 3 random words
    const wordChoices = getRandomWords(room.settings.wordCount || 3);
    this.internalData.set(roomCode, {
      secretWord: '',
      wordChoices,
    });

    console.log(`[RoomManager] Room ${roomCode}: Sending word choices to drawer "${drawer.name}" (${drawer.id}):`, wordChoices);

    // 1. Send choices ONLY to the drawer
    this.io.to(drawer.id).emit('word_choices', {
      words: wordChoices,
      chooseTime: WORD_SELECTION_TIME,
    });

    // 2. Broadcast turn_start to room
    this.io.to(roomCode).emit('turn_start', {
      currentDrawerId: drawer.id,
      currentDrawerName: drawer.name,
      currentRound: room.game.currentRound,
      totalRounds: room.game.totalRounds,
      turnState: 'selecting_word',
      timeLeft: WORD_SELECTION_TIME,
    });

    // 3. Broadcast updated room state
    this.io.to(roomCode).emit('room_state', { room });

    // 4. Start 15s timer for word selection
    let remainingTime = WORD_SELECTION_TIME;
    const timer = setInterval(() => {
      remainingTime -= 1;
      if (room.game) {
        room.game.timeLeft = remainingTime;
      }

      if (this.io) {
        this.io.to(roomCode).emit('timer_tick', { timeLeft: remainingTime });
      }

      if (remainingTime <= 0) {
        this.clearRoomTimer(roomCode);
        // If drawer didn't pick, auto-pick the first word
        console.log(`[RoomManager] Room ${roomCode}: Word selection timed out. Auto-selecting "${wordChoices[0]}"`);
        this.chooseWord(drawer.id, wordChoices[0], roomCode);
      }
    }, 1000);

    this.activeTimers.set(roomCode, timer);
  }

  /**
   * Handles drawer selecting a word. Transitions game into drawing phase.
   */
  public chooseWord(socketId: string, chosenWord: string, roomCode?: string): void {
    const code = roomCode ? roomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);
    if (!code) {
      throw new Error('Room not found.');
    }

    const room = this.rooms.get(code);
    if (!room || !room.game || !this.io) {
      throw new Error('Active game session not found.');
    }

    // Security check: Only the active drawer can pick the word
    if (room.game.currentDrawerId !== socketId) {
      throw new Error('Only the current drawer can choose a word.');
    }

    if (room.game.turnState !== 'selecting_word') {
      return; // Already selected
    }

    const internal = this.internalData.get(code);
    const sanitizedWord = (chosenWord || '').trim().toLowerCase();

    // Word must be one of the offered choices (or fallback if empty)
    if (internal && internal.wordChoices.length > 0 && !internal.wordChoices.includes(sanitizedWord)) {
      throw new Error('Invalid word selection.');
    }

    this.clearRoomTimer(code);

    const finalWord = sanitizedWord || internal?.wordChoices[0] || 'apple';
    this.internalData.set(code, {
      secretWord: finalWord,
      wordChoices: internal?.wordChoices || [],
    });

    // Setup drawing phase
    const drawDuration = room.settings.drawTime || 60;
    room.status = 'drawing';
    room.drawHistory = [];
    room.game.turnState = 'drawing';
    room.game.timeLeft = drawDuration;
    room.game.maskedWord = maskWord(finalWord);
    room.game.wordLength = finalWord.replace(/[\s-]/g, '').length;
    room.game.guessedPlayerIds = [];

    console.log(`[RoomManager] Room ${code}: Drawer selected secret word "${finalWord}". Starting ${drawDuration}s drawing phase.`);

    // 1. Send drawing_start to DRAWER ONLY (includes secretWord)
    this.io.to(socketId).emit('drawing_start', {
      currentDrawerId: room.game.currentDrawerId,
      currentDrawerName: room.game.currentDrawerName,
      currentRound: room.game.currentRound,
      totalRounds: room.game.totalRounds,
      turnState: 'drawing',
      maskedWord: room.game.maskedWord,
      wordLength: room.game.wordLength,
      timeLeft: drawDuration,
      secretWord: finalWord, // Secret word delivered ONLY to drawer
      guessedPlayerIds: [],
    });

    // 2. Send drawing_start to all GUESSERS (secretWord is strictly omitted)
    const drawerSocket = this.io.sockets.sockets.get(socketId);
    if (drawerSocket) {
      drawerSocket.to(code).emit('drawing_start', {
        currentDrawerId: room.game.currentDrawerId,
        currentDrawerName: room.game.currentDrawerName,
        currentRound: room.game.currentRound,
        totalRounds: room.game.totalRounds,
        turnState: 'drawing',
        maskedWord: room.game.maskedWord,
        wordLength: room.game.wordLength,
        timeLeft: drawDuration,
        guessedPlayerIds: [],
        // Notice: secretWord is completely absent here!
      });
    }

    // 3. Broadcast updated room state
    this.io.to(code).emit('room_state', { room });

    // 4. Start authoritative 60-second drawing countdown timer
    let remainingTime = drawDuration;
    const timer = setInterval(() => {
      remainingTime -= 1;
      if (room.game) {
        room.game.timeLeft = remainingTime;
      }

      if (this.io) {
        this.io.to(code).emit('timer_tick', { timeLeft: remainingTime });
      }

      if (remainingTime <= 0) {
        this.clearRoomTimer(code);
        console.log(`[RoomManager] Room ${code}: Turn timer expired for word "${finalWord}".`);
        this.endTurn(code, 'Time is up!');
      }
    }, 1000);

    this.activeTimers.set(code, timer);
  }

  /**
   * Processes a player's guess.
   * Validates against secret word, emits private response and public chat message.
   */
  public submitGuess(socketId: string, rawGuess: string, roomCode?: string): void {
    const code = roomCode ? roomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room || !room.game || room.status !== 'drawing') return;

    const player = room.players.find((p) => p.id === socketId);
    if (!player) return;

    // Requirement 8: Prevent the active drawer from submitting guesses
    if (room.game.currentDrawerId === socketId) {
      if (this.io) {
        this.io.to(socketId).emit('room_error', { message: 'Drawers cannot submit guesses.' });
      }
      return;
    }

    // Check if player has already guessed the word in this turn
    if (room.game.guessedPlayerIds.includes(socketId)) {
      if (this.io) {
        this.io.to(socketId).emit('guess_result', { correct: true, message: 'You have already guessed the word!' });
      }
      return;
    }

    const trimmed = (rawGuess || '').trim();
    if (!trimmed) return;

    const secretWord = this.internalData.get(code)?.secretWord || '';
    
    // Normalize both strings: lower-case, collapse multiple spaces
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const isCorrect = normalize(trimmed) === normalize(secretWord);

    if (isCorrect) {
      // Correct Guess!
      room.game.guessedPlayerIds.push(socketId);
      const turnDuration = Math.max(1, room.settings.drawTime || 60);
      const remainingTime = Math.max(0, Math.min(room.game.timeLeft, turnDuration));
      const guesserPoints = Math.ceil(GUESS_SCORE_MAX * remainingTime / turnDuration);
      const drawerPoints = Math.ceil(DRAWER_SCORE_MAX * remainingTime / turnDuration);
      player.score += guesserPoints;
      const drawer = room.players.find((candidate) => candidate.id === room.game?.currentDrawerId);
      if (drawer) {
        drawer.score += drawerPoints;
      }

      // Private feedback to the guesser
      if (this.io) {
        this.io.to(socketId).emit('guess_result', {
          correct: true,
          message: 'Correct Guess! 🎉',
        });

        // Safe broadcast to room (NEVER reveals the secret word!)
        const chatMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          senderId: 'system',
          senderName: 'Arena',
          text: `${player.name} guessed the word! 🎉`,
          type: 'correct',
          timestamp: Date.now(),
        };

        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push(chatMsg);
        this.io.to(code).emit('chat_message', chatMsg);
        this.io.to(code).emit('room_state', { room });
      }

      // Check if all non-drawers have guessed correctly
      const nonDrawersCount = room.players.length - 1;
      if (room.game.guessedPlayerIds.length >= nonDrawersCount && nonDrawersCount > 0) {
        console.log(`[RoomManager] Room ${code}: All ${nonDrawersCount} guessers have guessed the word! Ending turn early.`);
        this.endTurn(code, 'All players guessed the word! 🎉');
      }
    } else {
      // Incorrect Guess
      // Private feedback to the guesser
      if (this.io) {
        this.io.to(socketId).emit('guess_result', {
          correct: false,
          message: 'Try Again!',
        });

        // Broadcast incorrect guess to room chat (safe since it is not the secret word)
        const chatMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          senderId: socketId,
          senderName: player.name,
          text: trimmed,
          type: 'guess',
          timestamp: Date.now(),
        };

        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push(chatMsg);
        this.io.to(code).emit('chat_message', chatMsg);
      }
    }
  }

  /**
   * Receives and validates drawing stroke from active drawer.
   * Broadcasts to other players in real-time.
   */
  public handleDrawStroke(socketId: string, stroke: DrawStroke, roomCode?: string): void {
    const code = roomCode ? roomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room || !room.game || room.status !== 'drawing') return;

    // Security check: Only active drawer can draw
    if (room.game.currentDrawerId !== socketId) {
      return;
    }

    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
      return;
    }

    // Append to room's stroke history (limit to 5000 strokes to protect memory)
    if (room.drawHistory.length < 5000) {
      room.drawHistory.push(stroke);
    }

    // Broadcast stroke to everyone in room except sender
    if (this.io) {
      const drawerSocket = this.io.sockets.sockets.get(socketId);
      if (drawerSocket) {
        drawerSocket.to(code).emit('draw_stroke', { stroke });
      }
    }
  }

  /**
   * Clears canvas. Only permitted for active drawer.
   */
  public handleClearCanvas(socketId: string, roomCode?: string): void {
    const code = roomCode ? roomCode.trim().toUpperCase() : this.socketToRoom.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room || !room.game || room.status !== 'drawing') return;

    // Security check: Only active drawer can clear canvas
    if (room.game.currentDrawerId !== socketId) {
      return;
    }

    room.drawHistory = [];

    // Broadcast clear_canvas to everyone in room
    if (this.io) {
      this.io.to(code).emit('clear_canvas', {});
    }
  }

  /**
   * Concludes the current turn, keeps the word private, pauses briefly, and advances.
   */
  public endTurn(roomCode: string, reason: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.game || !this.io) return;

    this.clearRoomTimer(roomCode);

    room.status = 'turn_end';
    room.game.turnState = 'turn_end';

    // Calculate next drawer's name for preview
    const nextIndex = (room.game.currentDrawerIndex + 1) % room.players.length;
    const nextDrawer = room.players[nextIndex];

    console.log(`[RoomManager] Room ${roomCode}: Turn ended (${reason}). Next: "${nextDrawer?.name}"`);

    // The selected word remains private, including during the turn transition.
    this.io.to(roomCode).emit('turn_end', {
      reason,
      nextDrawerName: nextDrawer?.name,
    });

    const endChatMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: 'system',
      senderName: 'Arena',
      text: `Turn ended! ${reason}`,
      type: 'system',
      timestamp: Date.now(),
    };
    if (!room.chatHistory) room.chatHistory = [];
    room.chatHistory.push(endChatMsg);
    this.io.to(roomCode).emit('chat_message', endChatMsg);
    this.internalData.set(roomCode, { secretWord: '', wordChoices: [] });

    this.io.to(roomCode).emit('room_state', { room });

    // Pause for 4 seconds so players see the revealed word, then advance
    const transitionTimer = setTimeout(() => {
      this.advanceToNextTurn(roomCode);
    }, TURN_TRANSITION_TIME);

    this.activeTimers.set(roomCode, transitionTimer);
  }

  /**
   * Advances to next turn or next round.
   */
  public advanceToNextTurn(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.game || !this.io) return;

    this.clearRoomTimer(roomCode);

    // Verify minimum player count
    if (room.players.length < 2) {
      room.status = 'lobby';
      room.game = undefined;
      room.drawHistory = [];
      this.io.to(roomCode).emit('room_state', { room });
      this.io.to(roomCode).emit('room_error', { 
        message: 'Game ended: Not enough players to continue. Returned to lobby.' 
      });
      return;
    }

    // Advance drawer index
    let nextIndex = room.game.currentDrawerIndex + 1;
    let nextRound = room.game.currentRound;

    if (nextIndex >= room.players.length) {
      // Completed full rotation of all players in current round
      nextIndex = 0;
      nextRound += 1;
      console.log(`[RoomManager] Room ${roomCode}: Round ${room.game.currentRound} complete. Advancing to Round ${nextRound}`);
    }

    // Check if maximum rounds reached
    if (nextRound > room.game.totalRounds) {
      console.log(`[RoomManager] Room ${roomCode}: All ${room.game.totalRounds} rounds completed! Game Over.`);
      room.status = 'game_over';
      room.game.turnState = 'turn_end';
      room.finalResults = this.createFinalResults(room);
      this.internalData.set(roomCode, { secretWord: '', wordChoices: [] });
      this.io.to(roomCode).emit('game_over', { 
        reason: this.getWinnerAnnouncement(room.finalResults),
        results: room.finalResults,
      });
      this.io.to(roomCode).emit('room_state', { room });
      return;
    }

    // Update game round and drawer index
    room.game.currentRound = nextRound;
    room.game.currentDrawerIndex = nextIndex;

    // Start next word selection phase
    this.startWordSelectionPhase(roomCode);
  }

  /**
   * Clears any active timer for a room.
   */
  private clearRoomTimer(roomCode: string): void {
    const timer = this.activeTimers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      clearTimeout(timer);
      this.activeTimers.delete(roomCode);
    }
  }

  private createFinalResults(room: RoomState): PlayerRanking[] {
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    let previousScore: number | undefined;
    let currentRank = 0;

    return sortedPlayers.map((player, index) => {
      if (player.score !== previousScore) {
        currentRank = index + 1;
        previousScore = player.score;
      }
      return {
        playerId: player.id,
        playerName: player.name,
        score: player.score,
        rank: currentRank,
      };
    });
  }

  private getWinnerAnnouncement(results: PlayerRanking[]): string {
    const winners = results.filter((result) => result.rank === 1);
    const names = winners.map((winner) => winner.playerName).join(' and ');
    return `Match finished! ${names} ${winners.length === 1 ? 'wins' : 'tie for the win'}!`;
  }

  /**
   * Fetches room by code.
   */
  public getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode.trim().toUpperCase());
  }

  /**
   * Fetches room by player socketId.
   */
  public getRoomBySocketId(socketId: string): RoomState | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  /**
   * Helper to sanitize and validate player names.
   */
  public sanitizeName(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return 'Player';
    }
    return trimmed.slice(0, 20);
  }
}

export const roomManager = RoomManager.getInstance();
