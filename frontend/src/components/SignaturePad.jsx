import { useRef, useEffect, useState } from "react";
import { Eraser } from "lucide-react";

export const SignaturePad = ({ onChange, height = 180 }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [height]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setEmpty(false); };
  const end = () => { if (!drawing.current) return; drawing.current = false; onChange && onChange(empty ? null : canvasRef.current.toDataURL("image/png")); };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEmpty(true); onChange && onChange(null);
  };

  return (
    <div>
      <div className="relative border-2 border-dashed border-zinc-300 bg-white" style={{ height }}>
        <canvas ref={canvasRef} data-testid="signature-canvas" className="w-full h-full touch-none cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {empty && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-sm">Sign here</div>}
      </div>
      <button type="button" data-testid="signature-clear" onClick={clear} className="mt-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-black flex items-center gap-1"><Eraser size={12} /> Clear</button>
    </div>
  );
};
