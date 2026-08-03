import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle, Type, Sparkles } from 'lucide-react';

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
  signerName,
  defaultInitialText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [typedText, setTypedText] = useState<string>(defaultInitialText || '');
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

  // Generate stylized typed initial/signature
  const generateTypedSignature = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = '#810912';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isInitial = trimmed.length <= 4;
    const fontSize = isInitial ? 48 : 34;
    ctx.font = `italic bold ${fontSize}px "Caveat", "Brush Script MT", "Segoe Script", "Apple Chancery", cursive`;

    ctx.fillText(trimmed, canvas.width / 2, canvas.height / 2 - 4);

    // Subtle signature underline
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#810912';
    const textWidth = ctx.measureText(trimmed).width;
    const lineStartX = Math.max(20, (canvas.width - textWidth) / 2 - 10);
    const lineEndX = Math.min(canvas.width - 20, (canvas.width + textWidth) / 2 + 10);
    ctx.moveTo(lineStartX, canvas.height / 2 + (isInitial ? 24 : 18));
    ctx.lineTo(lineEndX, canvas.height / 2 + (isInitial ? 24 : 18));
    ctx.stroke();

    ctx.restore();

    setHasStrokes(true);
    const drawing = exportCroppedDrawing(canvas);
    if (drawing) {
      onSaveSignature(drawing);
    }
  };

  const quickInitial = signerName
    ? signerName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'SL';

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
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#f0eded] p-0.5 rounded-lg border border-[#e0bfbc]/40 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'draw'
                  ? 'bg-white text-[#810912] shadow-xs'
                  : 'text-[#59413f] hover:text-[#1b1c1c]'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Draw</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('type')}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'type'
                  ? 'bg-white text-[#810912] shadow-xs'
                  : 'text-[#59413f] hover:text-[#1b1c1c]'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>Type</span>
            </button>
          </div>

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

      {/* Quick Initial Helper Bar for Type Mode */}
      {activeTab === 'type' && (
        <div className="flex items-center gap-2 p-2 bg-[#FAF6EF] border border-[#e0bfbc] rounded-lg animate-in fade-in duration-150">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={`Type initials (e.g. ${quickInitial})`}
            disabled={disabled}
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#e0bfbc] rounded-md font-medium text-[#1b1c1c] focus:outline-hidden focus:border-[#810912] focus:ring-1 focus:ring-[#810912]"
          />
          <button
            type="button"
            onClick={() => generateTypedSignature(typedText || quickInitial)}
            disabled={disabled || (!typedText && !quickInitial)}
            className="px-3 py-1.5 bg-[#810912] hover:bg-[#a32626] text-white text-xs font-bold rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Generate Mark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTypedText(quickInitial);
              generateTypedSignature(quickInitial);
            }}
            disabled={disabled}
            className="px-2.5 py-1.5 bg-white border border-[#810912]/30 hover:bg-[#810912]/10 text-[#810912] text-xs font-bold rounded-md transition-all cursor-pointer shrink-0"
            title={`Quickly insert ${quickInitial}`}
          >
            ⚡ {quickInitial}
          </button>
        </div>
      )}

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
              {activeTab === 'draw'
                ? 'Handwrite Signature / Initial Here'
                : 'Click "Generate Mark" or draw with pen above'}
            </span>
            <span className="text-[10px] text-[#59413f]">
              {activeTab === 'draw'
                ? 'Use mouse, touchpad, stylus, or touchscreen'
                : `Type initials (e.g. ${quickInitial}) above to generate signature`}
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
