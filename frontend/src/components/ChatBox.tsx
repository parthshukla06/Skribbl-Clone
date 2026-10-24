import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Lock, 
  Paintbrush 
} from 'lucide-react';
import { ChatMessage } from '../types/game';

interface ChatBoxProps {
  messages: ChatMessage[];
  isDrawer: boolean;
  hasGuessed: boolean;
  isDrawingPhase: boolean;
  onSendGuess: (guess: string) => void;
  guessFeedback: { text: string; correct: boolean } | null;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  isDrawer,
  hasGuessed,
  isDrawingPhase,
  onSendGuess,
  guessFeedback,
}) => {
  const [inputGuess, setInputGuess] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, guessFeedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputGuess.trim();
    if (!trimmed || isDrawer || hasGuessed || !isDrawingPhase) return;

    onSendGuess(trimmed);
    setInputGuess('');
  };

  return (
    <div className="flex flex-col h-full min-h-[460px] bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Guesses & Room Chat
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
          {messages.length} msgs
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[360px] sm:max-h-[420px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="h-6 w-6 mb-2 text-slate-600" />
            <p className="text-xs">No guesses yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Type your guess below as the drawing appears!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'correct') {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="font-semibold">{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'system') {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-300 text-xs text-center font-medium"
                >
                  <span>{msg.text}</span>
                </div>
              );
            }

            // Normal Guess
            return (
              <div
                key={msg.id}
                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-start gap-2"
              >
                <span className="font-bold text-indigo-400 shrink-0">
                  {msg.senderName}:
                </span>
                <span className="text-slate-200 break-words">{msg.text}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Feedback Toast / Alert (Try Again or Correct Guess) */}
      {guessFeedback && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition ${
          guessFeedback.correct 
            ? 'bg-emerald-950/80 border-t border-emerald-600/50 text-emerald-300' 
            : 'bg-amber-950/80 border-t border-amber-600/50 text-amber-300 animate-shake'
        }`}>
          {guessFeedback.correct ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-amber-400" />
          )}
          <span>{guessFeedback.text}</span>
        </div>
      )}

      {/* Guess Input Form or State Banner */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        {isDrawer ? (
          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs flex items-center justify-center gap-2">
            <Paintbrush className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold">You are drawing! Watch players guess.</span>
          </div>
        ) : hasGuessed ? (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold">You guessed correctly! 🎉</span>
          </div>
        ) : !isDrawingPhase ? (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs flex items-center justify-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Waiting for drawer to pick a word...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              id="guess-input"
              type="text"
              value={inputGuess}
              onChange={(e) => setInputGuess(e.target.value)}
              placeholder="Type your guess here..."
              maxLength={40}
              autoFocus
              className="flex-1 h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              id="btn-submit-guess"
              type="submit"
              disabled={!inputGuess.trim()}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-40 cursor-pointer active:scale-95"
            >
              <span>Guess</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
