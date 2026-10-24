import React from 'react';
import { 
  Paintbrush, 
  Eraser, 
  Trash2 
} from 'lucide-react';

export const PALETTE_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#64748b', // Slate Gray
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#78350f', // Brown
];

export const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 7 },
  { label: 'L', size: 14 },
  { label: 'XL', size: 24 },
];

interface DrawingToolbarProps {
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isEraser: boolean;
  setIsEraser: (isEraser: boolean) => void;
  onClearCanvas: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  color,
  setColor,
  brushSize,
  setBrushSize,
  isEraser,
  setIsEraser,
  onClearCanvas,
}) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      {/* Primary Tools: Brush vs Eraser */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
        <button
          type="button"
          onClick={() => setIsEraser(false)}
          title="Paint Brush"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            !isEraser
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Paintbrush className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Brush</span>
        </button>

        <button
          type="button"
          onClick={() => setIsEraser(true)}
          title="Eraser"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            isEraser
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eraser className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Eraser</span>
        </button>
      </div>

      {/* Color Palette */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PALETTE_COLORS.map((c) => {
          const isSelected = !isEraser && color === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-lg transition transform cursor-pointer border ${
                c === '#ffffff' ? 'border-slate-400' : 'border-slate-700/80'
              } ${
                isSelected 
                  ? 'scale-115 ring-2 ring-indigo-400 shadow-md shadow-indigo-500/30 z-10' 
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
              title={`Color: ${c}`}
            />
          );
        })}
      </div>

      {/* Size Presets & Clear Canvas */}
      <div className="flex items-center gap-2">
        {/* Brush Size Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          {BRUSH_SIZES.map((b) => {
            const isSelected = brushSize === b.size;
            return (
              <button
                key={b.size}
                type="button"
                onClick={() => setBrushSize(b.size)}
                title={`Size: ${b.label} (${b.size}px)`}
                className={`h-7 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-slate-800 text-indigo-400 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Clear Canvas Button */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Are you sure you want to clear the entire canvas?')) {
              onClearCanvas();
            }
          }}
          title="Clear Entire Canvas"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 text-xs font-bold transition cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
};

export default DrawingToolbar;
