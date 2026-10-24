export interface Player {
  id: string; // socket.id
  name: string;
  isHost: boolean;
  avatar: string;
  score: number;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number; // in seconds
  wordCount: number;
  isPrivate: boolean;
}

export interface DrawPoint {
  x: number; // Normalized coordinate 0.0 to 1.0
  y: number; // Normalized coordinate 0.0 to 1.0
}

export interface DrawStroke {
  points: DrawPoint[];
  color: string;
  size: number;
  isEraser: boolean;
}

export type RoomStatus = 'lobby' | 'selecting_word' | 'drawing' | 'turn_end' | 'game_over';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'guess' | 'correct' | 'system';
  timestamp: number;
}

export interface GameState {
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string;
  currentDrawerName: string;
  currentDrawerIndex: number;
  turnState: 'selecting_word' | 'drawing' | 'turn_end';
  maskedWord: string;
  wordLength: number;
  timeLeft: number;
  guessedPlayerIds: string[];
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  status: RoomStatus;
  createdAt: number;
  game?: GameState;
  finalResults?: PlayerRanking[];
  drawHistory: DrawStroke[];
  chatHistory: ChatMessage[];
}

export interface PlayerRanking {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface CreateRoomPayload {
  playerName: string;
  avatar?: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  avatar?: string;
}

export interface LeaveRoomPayload {
  roomCode?: string;
}

export interface GetRoomStatePayload {
  roomCode: string;
}

export interface StartGamePayload {
  roomCode?: string;
}

export interface ChooseWordPayload {
  roomCode?: string;
  word: string;
}

export interface DrawStrokePayload {
  roomCode?: string;
  stroke: DrawStroke;
}

export interface ClearCanvasPayload {
  roomCode?: string;
}

export interface SubmitGuessPayload {
  roomCode?: string;
  guess: string;
}

export interface GuessResultPayload {
  correct: boolean;
  message: string;
}

export interface RoomErrorPayload {
  message: string;
  code?: string;
}
