import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Users, 
  ArrowRight, 
  PlusCircle, 
  LogIn, 
  AlertCircle, 
  Dice5,
  ShieldAlert
} from 'lucide-react';

export const AVATARS = [
  { id: 'avatar-1', label: 'Painter', emoji: '🎨', bg: 'from-indigo-500 to-blue-600' },
  { id: 'avatar-2', label: 'Fox', emoji: '🦊', bg: 'from-amber-500 to-orange-600' },
  { id: 'avatar-3', label: 'Spark', emoji: '⚡', bg: 'from-cyan-400 to-blue-600' },
  { id: 'avatar-4', label: 'Rocket', emoji: '🚀', bg: 'from-violet-500 to-purple-700' },
  { id: 'avatar-5', label: 'Pixel', emoji: '👾', bg: 'from-emerald-400 to-teal-600' },
  { id: 'avatar-6', label: 'Nova', emoji: '🦄', bg: 'from-fuchsia-500 to-pink-600' },
  { id: 'avatar-7', label: 'Ninja', emoji: '🐱', bg: 'from-rose-500 to-red-600' },
  { id: 'avatar-8', label: 'Tiger', emoji: '🐯', bg: 'from-amber-400 to-yellow-600' },
];

const RANDOM_NAMES = [
  'DoodleNinja', 'PixelArtist', 'ColorMaster', 'SketchWizard', 
  'BrushBoss', 'SpeedyPencil', 'CanvasKing', 'NeonDraw'
];

interface HomeProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (avatarId: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  initialRoomCode?: string;
  isLoading: boolean;
  errorMessage: string | null;
  clearError: () => void;
  isConnected: boolean;
}

export const Home: React.FC<HomeProps> = ({
  playerName,
  setPlayerName,
  selectedAvatar,
  setSelectedAvatar,
  onCreateRoom,
  onJoinRoom,
  initialRoomCode = '',
  isLoading,
  errorMessage,
  clearError,
  isConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [joinCode, setJoinCode] = useState<string>(initialRoomCode.toUpperCase());
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRandomizeName = () => {
    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const randomNum = Math.floor(Math.random() * 90) + 10;
    setPlayerName(`${randomName}${randomNum}`);
    clearError();
    setLocalError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!playerName.trim()) {
      setLocalError('Please choose a player nickname to enter the arena.');
      return;
    }

    onCreateRoom();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!playerName.trim()) {
      setLocalError('Please choose a player nickname before joining.');
      return;
    }

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setLocalError('Please enter a 6-character room code.');
      return;
    }

    if (cleanCode.length !== 6) {
      setLocalError('Room codes are exactly 6 characters long.');
      return;
    }

    onJoinRoom(cleanCode);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Hero Badge & Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Real-Time Multiplayer Lobby
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          Step into{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Skribbl Arena
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Create a private multiplayer room or jump into an existing match with friends.
        </p>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Server Disconnect Warning */}
        {!isConnected && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Connecting to game server on port 5000... Please verify the backend is online.</span>
          </div>
        )}

        {/* Global/Server Error Alert */}
        {(errorMessage || localError) && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">{errorMessage || localError}</span>
            </div>
          </div>
        )}

        {/* Profile Customization Section */}
        <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="player-name-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Your Player Nickname
            </label>
            <div className="relative flex items-center">
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value.slice(0, 20));
                  clearError();
                  setLocalError(null);
                }}
                maxLength={20}
                placeholder="Enter nickname (e.g. DoodleMaster)"
                className="w-full h-12 pl-4 pr-12 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                title="Randomize Nickname"
                className="absolute right-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Dice5 className="h-4 w-4 text-indigo-400" />
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Between 1 and 20 characters
            </span>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`h-12 w-full rounded-xl flex items-center justify-center text-xl transition transform active:scale-95 cursor-pointer relative ${
                      isSelected 
                        ? 'ring-2 ring-indigo-400 bg-indigo-950/60 shadow-lg shadow-indigo-500/20 scale-105' 
                        : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <span>{av.emoji}</span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Selection: Create Room vs Join Room */}
        <div className="border-t border-slate-800/80 pt-6">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                clearError();
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create Room
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                clearError();
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Join Room
            </button>
          </div>

          {/* Create Room Form Tab */}
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/70 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Default Room Capacity</span>
                  <span className="font-semibold text-white">8 Players</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Match Settings</span>
                  <span className="font-semibold text-white">3 Rounds • 60s Turns</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Privacy</span>
                  <span className="font-semibold text-emerald-400">Private (Invite Link / Code)</span>
                </div>
              </div>

              <button
                id="btn-create-room"
                type="submit"
                disabled={isLoading || !isConnected}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Room...
                  </span>
                ) : (
                  <>
                    <Palette className="h-4 w-4" />
                    Create New Arena
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Join Room Form Tab */
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="room-code-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Enter 6-Character Room Code
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
                    setJoinCode(cleaned);
                    clearError();
                    setLocalError(null);
                  }}
                  maxLength={6}
                  placeholder="e.g. ABC123"
                  className="w-full h-12 px-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-600 text-center font-mono text-lg font-black tracking-widest uppercase focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              <button
                id="btn-join-room"
                type="submit"
                disabled={isLoading || !isConnected || joinCode.length !== 6}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining Room...
                  </span>
                ) : (
                  <>
                    <span>Enter Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Users className="h-4 w-4" />
        <span>Invite up to 8 friends in a private lobby</span>
      </div>
    </div>
  );
};

export default Home;
