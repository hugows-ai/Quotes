import { useRef, useEffect, useState, useCallback } from 'react';
import { Pen, Eraser, Trash2, Download, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  initialData?: string;
  onSave: (data: string) => void;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const MAX_HISTORY = 50;

export function DrawingCanvas({ initialData, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isInitializedRef = useRef(false);
  const initialDataRef = useRef(initialData);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(dataUrl);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const restoreCanvas = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onSave(dataUrl);
    };
    img.src = dataUrl;
  }, [onSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let isResizing = false;

    const resizeCanvas = () => {
      if (isResizing) return;
      isResizing = true;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { isResizing = false; return; }
      let prevData: string | null = null;
      if (isInitializedRef.current) prevData = canvas.toDataURL('image/png');
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!isInitializedRef.current) {
        if (initialDataRef.current) {
          const img = new window.Image();
          img.onload = () => { ctx.drawImage(img, 0, 0); saveToHistory(); isInitializedRef.current = true; isResizing = false; };
          img.onerror = () => { saveToHistory(); isInitializedRef.current = true; isResizing = false; };
          img.src = initialDataRef.current;
        } else { saveToHistory(); isInitializedRef.current = true; isResizing = false; }
      } else if (prevData) {
        const img = new window.Image();
        img.onload = () => { ctx.drawImage(img, 0, 0); isResizing = false; };
        img.onerror = () => { isResizing = false; };
        img.src = prevData;
      } else { isResizing = false; }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(resizeCanvas));
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const previousState = historyRef.current[historyIndexRef.current];
    if (previousState) restoreCanvas(previousState);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [restoreCanvas]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const nextState = historyRef.current[historyIndexRef.current];
    if (nextState) restoreCanvas(nextState);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [restoreCanvas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPosRef.current = getCanvasCoordinates(e);
  }, [getCanvasCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPosRef.current) return;
    const pos = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
  }, [isDrawing, tool, color, brushSize, getCanvasCoordinates]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPosRef.current = null;
      saveToHistory();
      const canvas = canvasRef.current;
      if (canvas) onSave(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, onSave, saveToHistory]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    onSave(canvas.toDataURL('image/png'));
  }, [onSave, saveToHistory]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `desenho-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
    setColor(newColor);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap shrink-0">
        <Button variant={tool === 'pen' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setTool('pen')}>
          <Pen className="h-4 w-4" />
        </Button>
        <Button variant={tool === 'eraser' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setTool('eraser')}>
          <Eraser className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110", color === c ? "border-primary ring-2 ring-primary/30" : "border-muted")}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 relative overflow-hidden", !PRESET_COLORS.includes(color) ? "border-primary ring-2 ring-primary/30" : "border-muted")}
              style={{ background: `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)` }}
            >
              <span className="sr-only">Cor personalizada</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">Cor personalizada</p>
              <div className="flex items-center gap-2">
                <Input type="color" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                <Input type="text" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} placeholder="#000000" className="w-24 h-10 font-mono text-sm" />
              </div>
              <div className="w-full h-8 rounded border" style={{ backgroundColor: customColor }} />
            </div>
          </PopoverContent>
        </Popover>
        <div className="w-px h-6 bg-border mx-1" />
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Tamanho:</span>
          <Slider value={[brushSize]} onValueChange={([value]) => setBrushSize(value)} min={1} max={20} step={1} className="w-24" />
          <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)">
          <Redo className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={downloadCanvas} title="Baixar desenho">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={clearCanvas} title="Limpar tudo">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas - touch-action:none prevents scrolling while drawing */}
      <div 
        ref={containerRef}
        className="flex-1 relative cursor-crosshair overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
}
