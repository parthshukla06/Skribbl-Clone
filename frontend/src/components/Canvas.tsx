import React, { useRef, useEffect, useCallback } from 'react';
import { DrawPoint, DrawStroke } from '../types/game';

interface CanvasProps {
  isDrawer: boolean;
  color: string;
  brushSize: number;
  isEraser: boolean;
  drawHistory: DrawStroke[];
  onEmitStroke: (stroke: DrawStroke) => void;
  incomingStroke: DrawStroke | null;
  clearTrigger: number;
}

export const Canvas: React.FC<CanvasProps> = ({
  isDrawer,
  color,
  brushSize,
  isEraser,
  drawHistory,
  onEmitStroke,
  incomingStroke,
  clearTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<DrawPoint[]>([]);

  // Function to draw a single stroke on the canvas context
  const renderStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawStroke, width: number, height: number) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    // Scale stroke size proportionally with canvas width (reference virtual width: 800px)
    const scaleFactor = Math.max(0.5, width / 800);
    ctx.lineWidth = Math.max(1, stroke.size * scaleFactor);

    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * width, first.y * height);

    if (stroke.points.length === 1) {
      // Single dot
      ctx.lineTo(first.x * width + 0.1, first.y * height + 0.1);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * width, pt.y * height);
      }
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  // Redraw full history
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes in history
    for (const stroke of drawHistory) {
      renderStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }, [drawHistory, renderStroke]);

  // Handle canvas sizing and responsiveness
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();

      // Set internal dimensions to match element layout
      const targetWidth = Math.floor(rect.width);
      // Keep aspect ratio approx 4:3 or container height
      const targetHeight = Math.floor(rect.height);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        redrawAll();
      }
    };

    updateCanvasSize();
    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [redrawAll]);

  // When drawHistory updates (e.g. initial room state load)
  useEffect(() => {
    redrawAll();
  }, [drawHistory, redrawAll]);

  // When clear trigger changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [clearTrigger]);

  // When incoming stroke arrives from another player
  useEffect(() => {
    if (!incomingStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderStroke(ctx, incomingStroke, canvas.width, canvas.height);
  }, [incomingStroke, renderStroke]);

  // Helper to get normalized 0..1 coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  };

  // Start Drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    e.preventDefault();

    const pt = getCoordinates(e);
    if (!pt) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw immediate dot
    const initialStroke: DrawStroke = {
      points: [pt],
      color,
      size: brushSize,
      isEraser,
    };
    renderStroke(ctx, initialStroke, canvas.width, canvas.height);
  };

  // Continue Drawing
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return;
    e.preventDefault();

    const pt = getCoordinates(e);
    if (!pt) return;

    const points = currentPointsRef.current;
    const lastPt = points[points.length - 1];

    // Only add point if moved slightly (reduces packet flood while maintaining high fidelity)
    const distSq = Math.pow(pt.x - lastPt.x, 2) + Math.pow(pt.y - lastPt.y, 2);
    if (distSq < 0.000004) return; // ~0.002 threshold

    points.push(pt);

    // Draw active segment locally
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const segmentStroke: DrawStroke = {
      points: [lastPt, pt],
      color,
      size: brushSize,
      isEraser,
    };
    renderStroke(ctx, segmentStroke, canvas.width, canvas.height);

    // Stream sub-strokes in batches or full stroke on end
    // To ensure real-time streaming to guessers, emit stroke segment
    onEmitStroke(segmentStroke);
  };

  // Stop Drawing
  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return;
    if (e) e.preventDefault();

    isDrawingRef.current = false;
    currentPointsRef.current = [];
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] bg-white rounded-2xl overflow-hidden shadow-2xl border-4 ${
        isDrawer ? 'border-indigo-500/80 cursor-crosshair' : 'border-slate-800 cursor-default'
      }`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full block touch-none"
      />

      {/* Non-drawer overlay watermark or status indicator */}
      {!isDrawer && (
        <div className="pointer-events-none absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/60 backdrop-blur-md text-[11px] font-semibold text-slate-300 border border-slate-700/60">
          Spectator Mode • Real-Time Stream
        </div>
      )}
    </div>
  );
};

export default Canvas;
