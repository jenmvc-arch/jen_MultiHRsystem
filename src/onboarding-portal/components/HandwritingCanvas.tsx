import React, { useRef, useState, useEffect } from 'react';
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
}

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  label,
  subLabel,
  height = 120,
  existingDataUrl,
  onSaveSignature,
  onClear,
  confirmButtonText = 'Confirm Initial',
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(!!existingDataUrl);

  // Initialize canvas with existing data if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (existingDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = existingDataUrl;
      setHasStrokes(true);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasStrokes(false);
    }
  }, [existingDataUrl]);

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

    const padding = 12;
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

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Scale coordinate to canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    // Prevent scrolling on touch devices while drawing
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasStrokes(true);

    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#810912';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const drawing = exportCroppedDrawing(canvas);
      setHasStrokes(Boolean(drawing));
      if (drawing) onSaveSignature(drawing);
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
    onSaveSignature(null);
    if (onClear) onClear();
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {(label || subLabel) && (
        <div className="flex justify-between items-center">
          <div>
            {label && <span className="text-xs font-extrabold text-[#1b1c1c] uppercase tracking-wider block">{label}</span>}
            {subLabel && <p className="text-[11px] text-[#59413f]">{subLabel}</p>}
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-xs text-[#810912] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Drawing</span>
          </button>
        </div>
      )}

      <div className="relative w-full rounded-xl border-2 border-dashed border-[#810912]/30 bg-[#FAF6EF] overflow-hidden group">
        <canvas
          ref={canvasRef}
          width={600}
          height={height * 2}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ height: `${height}px` }}
          className={`w-full touch-none block ${disabled ? 'cursor-default' : 'cursor-crosshair'}`}
        />

        {!hasStrokes && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#810912]/40 gap-1.5 p-4 text-center">
            <PenTool className="w-6 h-6 animate-bounce" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Handwrite Signature / Initial Here
            </span>
            <span className="text-[10px] text-[#59413f]/70">
              Use mouse, touchpad, or touchscreen stylus
            </span>
          </div>
        )}

        {hasStrokes && (
          <div className="absolute bottom-1.5 right-2 pointer-events-none flex items-center gap-1 bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] px-2 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle className="w-3 h-3" />
            <span>Handwriting Recorded</span>
          </div>
        )}
      </div>
    </div>
  );
};
