import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import socket from './services/socket';
import { 
  RoomState, 
  RoomErrorPayload, 
  DrawStroke, 
  GameState, 
  ChatMessage, 
  GuessResultPayload 
} from './types/game';
import Home, { AVATARS } from './components/Home';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [socketId, setSocketId] = useState<string>(socket.id || '');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('skribbl_player_name') || 'Artist' + Math.floor(Math.random() * 900 + 100);
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem('skribbl_avatar') || AVATARS[0].id;
  });
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-Game State
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [incomingStroke, setIncomingStroke] = useState<DrawStroke | null>(null);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [turnEndReason, setTurnEndReason] = useState<string | null>(null);
  const [nextDrawerName, setNextDrawerName] = useState<string | null>(null);

  // Chat & Guessing State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [guessFeedback, setGuessFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  // Check URL search params for ?room=CODE invite link
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setUrlRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // Sync player name and avatar to localStorage
  useEffect(() => {
    localStorage.setItem('skribbl_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('skribbl_avatar', selectedAvatar);
  }, [selectedAvatar]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Guess feedback auto-clear
  useEffect(() => {
    if (guessFeedback) {
      const timer = setTimeout(() => setGuessFeedback(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [guessFeedback]);

  // Socket.IO event listeners
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id || '');
      setErrorMessage(null);
      console.log('[Socket] Connected with ID:', socket.id);
    }

    function onDisconnect(reason: string) {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    }

    function onConnectError(err: Error) {
      setIsConnected(false);
      console.error('[Socket] Connection error:', err.message);
    }

    function onRoomCreated(data: { room: RoomState }) {
      setIsLoading(false);
      setErrorMessage(null);
      setCurrentRoom(data.room);
      setChatMessages(data.room.chatHistory || []);
      setToastMessage(`Arena created! Room Code: ${data.room.code}`);
    }

    function onRoomJoined(data: { room: RoomState }) {
      setIsLoading(false);
      setErrorMessage(null);
      setCurrentRoom(data.room);
      setChatMessages(data.room.chatHistory || []);
      setToastMessage(`Joined Arena ${data.room.code}!`);
    }

    function onPlayerJoined(data: { player: { name: string }; room: RoomState }) {
      setCurrentRoom(data.room);
      setToastMessage(`👋 ${data.player.name} joined the arena!`);
    }

    function onPlayerLeft(data: { playerName: string; room: RoomState }) {
      setCurrentRoom(data.room);
      setToastMessage(`🚪 ${data.playerName} left the arena.`);
    }

    function onRoomState(data: { room: RoomState }) {
      setCurrentRoom(data.room);
      if (data.room.chatHistory && data.room.chatHistory.length > 0) {
        setChatMessages(data.room.chatHistory);
      }
    }

    function onRoomError(error: RoomErrorPayload) {
      setIsLoading(false);
      setErrorMessage(error.message);
    }

    // Game Specific Events
    function onWordChoices(data: { words: string[]; chooseTime: number }) {
      console.log('[Socket] Received word choices (drawer only):', data.words);
      setWordChoices(data.words);
      setGuessFeedback(null);
    }

    function onTurnStart(data: { 
      currentDrawerId: string; 
      currentDrawerName: string; 
      currentRound: number; 
      totalRounds: number; 
      turnState: 'selecting_word'; 
      timeLeft: number; 
    }) {
      setTurnEndReason(null);
      setNextDrawerName(null);
      setGuessFeedback(null);
      setChatMessages([]);
      setClearTrigger((prev) => prev + 1);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        const newGame: GameState = {
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          currentDrawerId: data.currentDrawerId,
          currentDrawerName: data.currentDrawerName,
          currentDrawerIndex: prev.game ? prev.game.currentDrawerIndex : 0,
          turnState: 'selecting_word',
          maskedWord: '',
          wordLength: 0,
          timeLeft: data.timeLeft,
          guessedPlayerIds: [],
        };
        return {
          ...prev,
          status: 'selecting_word',
          game: newGame,
          drawHistory: [],
        };
      });
      setToastMessage(`Round ${data.currentRound}: ${data.currentDrawerName} is picking a word!`);
    }

    function onDrawingStart(data: GameState) {
      setWordChoices([]);
      setGuessFeedback(null);
      setClearTrigger((prev) => prev + 1);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'drawing',
          game: data,
          drawHistory: [],
        };
      });
      setToastMessage(`🎨 Drawing started! ${data.currentDrawerName} is sketching.`);
    }

    function onDrawStroke(data: { stroke: DrawStroke }) {
      setIncomingStroke(data.stroke);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          drawHistory: [...prev.drawHistory, data.stroke],
        };
      });
    }

    function onClearCanvas() {
      setClearTrigger((prev) => prev + 1);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          drawHistory: [],
        };
      });
    }

    function onTimerTick(data: { timeLeft: number }) {
      setCurrentRoom((prev) => {
        if (!prev || !prev.game) return prev;
        return {
          ...prev,
          game: {
            ...prev.game,
            timeLeft: data.timeLeft,
          },
        };
      });
    }

    function onTurnEnd(data: { reason: string; nextDrawerName?: string }) {
      setTurnEndReason(data.reason);
      setNextDrawerName(data.nextDrawerName || null);
      setCurrentRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'turn_end',
        };
      });
    }

    function onGameOver(data: { reason: string }) {
      setToastMessage(`🏆 ${data.reason}`);
    }

    // Chat and Guessing Events
    function onChatMessage(msg: ChatMessage) {
      setChatMessages((prev) => [...prev, msg]);
    }

    function onGuessResult(res: GuessResultPayload) {
      setGuessFeedback({
        text: res.message,
        correct: res.correct,
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('room_state', onRoomState);
    socket.on('room_error', onRoomError);

    socket.on('word_choices', onWordChoices);
    socket.on('turn_start', onTurnStart);
    socket.on('drawing_start', onDrawingStart);
    socket.on('draw_stroke', onDrawStroke);
    socket.on('clear_canvas', onClearCanvas);
    socket.on('timer_tick', onTimerTick);
    socket.on('turn_end', onTurnEnd);
    socket.on('game_over', onGameOver);

    socket.on('chat_message', onChatMessage);
    socket.on('guess_result', onGuessResult);

    if (socket.connected) {
      setIsConnected(true);
      setSocketId(socket.id || '');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('room_state', onRoomState);
      socket.off('room_error', onRoomError);

      socket.off('word_choices', onWordChoices);
      socket.off('turn_start', onTurnStart);
      socket.off('drawing_start', onDrawingStart);
      socket.off('draw_stroke', onDrawStroke);
      socket.off('clear_canvas', onClearCanvas);
      socket.off('timer_tick', onTimerTick);
      socket.off('turn_end', onTurnEnd);
      socket.off('game_over', onGameOver);

      socket.off('chat_message', onChatMessage);
      socket.off('guess_result', onGuessResult);
    };
  }, []);

  const handleCreateRoom = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setChatMessages([]);
    socket.emit('create_room', {
      playerName: playerName.trim(),
      avatar: selectedAvatar,
    });
  };

  const handleJoinRoom = (roomCode: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setChatMessages([]);
    socket.emit('join_room', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
      avatar: selectedAvatar,
    });
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socket.emit('leave_room', { roomCode: currentRoom.code });
      setCurrentRoom(null);
      setWordChoices([]);
      setChatMessages([]);
      setGuessFeedback(null);
      setToastMessage('You left the room.');
    }
  };

  const handleStartGame = () => {
    if (currentRoom) {
      socket.emit('start_game', { roomCode: currentRoom.code });
    }
  };

  const handlePlayAgain = () => {
    if (currentRoom) {
      socket.emit('start_game', { roomCode: currentRoom.code });
    }
  };

  const handleChooseWord = (word: string) => {
    if (currentRoom) {
      socket.emit('choose_word', { roomCode: currentRoom.code, word });
      setWordChoices([]);
    }
  };

  const handleEmitStroke = (stroke: DrawStroke) => {
    if (currentRoom) {
      socket.emit('draw_stroke', { roomCode: currentRoom.code, stroke });
    }
  };

  const handleEmitClear = () => {
    if (currentRoom) {
      socket.emit('clear_canvas', { roomCode: currentRoom.code });
    }
  };

  const handleSendGuess = (guess: string) => {
    if (currentRoom) {
      socket.emit('submit_guess', {
        roomCode: currentRoom.code,
        guess,
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white bg-grid-pattern">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div 
            onClick={() => {
              if (currentRoom) {
                if (window.confirm('Leave the current match and return to the main screen?')) {
                  handleLeaveRoom();
                }
              }
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 group-hover:scale-105 transition">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Skribbl Arena
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {currentRoom && currentRoom.status !== 'lobby' ? 'Live Match' : 'Lobby'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Socket Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-300 hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-rose-300 font-medium hidden sm:inline">Connecting...</span>
                </>
              )}
            </div>

            {/* In Room Indicator */}
            {currentRoom && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-xs text-indigo-300 font-mono">
                <span>Room: <strong className="text-white">{currentRoom.code}</strong></span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col justify-center items-center">
        {!currentRoom ? (
          <Home
            playerName={playerName}
            setPlayerName={setPlayerName}
            selectedAvatar={selectedAvatar}
            setSelectedAvatar={setSelectedAvatar}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            initialRoomCode={urlRoomCode}
            isLoading={isLoading}
            errorMessage={errorMessage}
            clearError={() => setErrorMessage(null)}
            isConnected={isConnected}
          />
        ) : currentRoom.status === 'lobby' ? (
          <Lobby
            room={currentRoom}
            currentSocketId={socketId}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
          />
        ) : (
          <GameArena
            room={currentRoom}
            currentSocketId={socketId}
            onEmitStroke={handleEmitStroke}
            onEmitClear={handleEmitClear}
            onChooseWord={handleChooseWord}
            onLeaveRoom={handleLeaveRoom}
            incomingStroke={incomingStroke}
            clearTrigger={clearTrigger}
            wordChoices={wordChoices}
            turnEndReason={turnEndReason}
            nextDrawerName={nextDrawerName}
            chatMessages={chatMessages}
            onSendGuess={handleSendGuess}
            guessFeedback={guessFeedback}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/40 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>Skribbl Arena &copy; {new Date().getFullYear()}</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>Web3Task Full Stack Technical Evaluation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              Socket.IO Real-Time Stream
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
