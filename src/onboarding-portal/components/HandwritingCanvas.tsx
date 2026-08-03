import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle } from 'lucide-react';

interface HandwritingCanvasProps {
  label?: string;
  subLabel?: string;
  height?: number;
  width?: number;
  existingDataUrl?: string | null;
  onSaveSignature: (dataUrl: string | null) => void;
  onClear?: () => void;
  confirmButtonText?: string;
  disabled?: boolean;
  signerName?: string;
  defaultInitialText?: string;
}

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  label,
  subLabel,
  height = 120,
  existingDataUrl,
  onSaveSignature,
  onClear,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(Boolean(existingDataUrl));
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize and redraw existing signature if available
  const renderExistingImage = useCallback((url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasStrokes(true);
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (existingDataUrl) {
      renderExistingImage(existingDataUrl);
      setHasStrokes(true);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      setHasStrokes(false);
    }
  }, [existingDataUrl, renderExistingImage]);

  const exportCroppedDrawing = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const alpha = pixels.data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 8) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const padding = 16;
    const sourceX = Math.max(0, minX - padding);
    const sourceY = Math.max(0, minY - padding);
    const sourceWidth = Math.min(canvas.width - sourceX, maxX - minX + 1 + padding * 2);
    const sourceHeight = Math.min(canvas.height - sourceY, maxY - minY + 1 + padding * 2);

    const cropped = document.createElement('canvas');
    cropped.width = sourceWidth;
    cropped.height = sourceHeight;
    const croppedCtx = cropped.getContext('2d');
    if (!croppedCtx) return null;

    croppedCtx.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );
    return cropped.toDataURL('image/png');
  };

  const getCanvasPos = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Pointer event handlers for drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasStrokes(true);

    const pos = getCanvasPos(e, canvas);
    setLastPoint(pos);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#810912';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#810912';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e, canvas);

    if (lastPoint) {
      const midX = (lastPoint.x + pos.x) / 2;
      const midY = (lastPoint.y + pos.y) / 2;
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    setLastPoint(pos);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPoint(null);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release pointer errors
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const drawing = exportCroppedDrawing(canvas);
      setHasStrokes(Boolean(drawing));
      if (drawing) {
        onSaveSignature(drawing);
      }
    }
  };

  const handleClear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasStrokes(false);
    setLastPoint(null);
    onSaveSignature(null);
    if (onClear) onClear();
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Header with Title & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          {label && (
            <span className="text-xs font-extrabold text-[#1b1c1c] uppercase tracking-wider block">
              {label}
            </span>
          )}
          {subLabel && <p className="text-[11px] text-[#59413f]">{subLabel}</p>}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-xs text-[#810912] hover:underline flex items-center gap-1 cursor-pointer px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas Drawing Surface */}
      <div className="relative w-full rounded-xl border-2 border-dashed border-[#810912]/30 bg-[#FAF6EF] overflow-hidden group touch-none select-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={height * 2}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ height: `${height}px` }}
          className={`w-full block touch-none ${
            disabled ? 'cursor-default opacity-70' : 'cursor-crosshair'
          }`}
        />

        {!hasStrokes && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#810912]/50 gap-1 p-3 text-center">
            <PenTool className="w-5 h-5 animate-pulse text-[#810912]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#810912]">
              Handwrite Signature / Initial Here
            </span>
            <span className="text-[10px] text-[#59413f]">
              Use mouse, touchpad, stylus, or touchscreen
            </span>
          </div>
        )}

        {hasStrokes && (
          <div className="absolute bottom-2 right-2 pointer-events-none flex items-center gap-1.5 bg-[#E6F4EA] border border-[#34A853]/50 text-[#137333] px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
            <CheckCircle className="w-3.5 h-3.5 text-[#34A853]" />
            <span>Mark Recorded & Verified</span>
          </div>
        )}
      </div>
    </div>
  );
};
