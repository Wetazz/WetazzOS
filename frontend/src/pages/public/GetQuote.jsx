import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2 } from "lucide-react";

export default function GetQuote() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [desc, setDesc] = useState("");
  const [preview, setPreview] = useState(null);
  const [b64, setB64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      setPreview(data);
      const raw = data.split(",")[1];
      setB64(raw);
    };
    reader.readAsDataURL(file);
  };

  const analyse = async () => {
    if (!b64) { toast.error("Upload a photo first"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post("/ai/photo-estimate", { image_base64: b64, vehicle_make: make, vehicle_model: model, description: desc });
      setResult(r.data);
    } catch (e) { toast.error(e.response?.data?.detail || "AI failed"); }
    setLoading(false);
  };

  const est = result?.estimate;
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ AI</div>
      <h1 className="font-display text-5xl mb-2">Preliminary AI Estimate</h1>
      <p className="text-zinc-400 mb-8 max-w-2xl">Upload a photo of the damage. Our AI will return a preliminary range for parts, labour and materials. Final pricing requires a physical inspection.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-white/10 p-6 space-y-4" data-testid="ai-quote-form">
          <div className="grid grid-cols-2 gap-3">
            <input data-testid="ai-make" className="wz-input2" placeholder="Vehicle make" value={make} onChange={e=>setMake(e.target.value)} />
            <input data-testid="ai-model" className="wz-input2" placeholder="Model" value={model} onChange={e=>setModel(e.target.value)} />
          </div>
          <textarea data-testid="ai-desc" className="wz-input2" rows={3} placeholder="Describe what happened..." value={desc} onChange={e=>setDesc(e.target.value)} />
          <label className="block cursor-pointer">
            <div className="border border-dashed border-white/20 aspect-video flex items-center justify-center relative overflow-hidden hover:border-[#B5FF2E] transition-colors">
              {preview ? (
                <div className="relative w-full h-full wz-scan">
                  <img src={preview} className="w-full h-full object-cover" alt="damage" />
                  <div className="absolute inset-0 wz-grid-bg opacity-40" />
                </div>
              ) : (
                <div className="text-center text-zinc-500">
                  <Upload className="mx-auto mb-2" />
                  <div className="text-sm uppercase tracking-widest">Click to upload photo</div>
                </div>
              )}
            </div>
            <input data-testid="ai-file" type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <button data-testid="ai-analyse-btn" onClick={analyse} disabled={loading || !b64}
            className="w-full bg-[#B5FF2E] hover:bg-[#C8FF5A] py-3 font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="animate-spin" size={16}/> Analysing...</> : <><Sparkles size={16}/> Analyse damage</>}
          </button>
        </div>
        <div className="border border-white/10 p-6" data-testid="ai-quote-result">
          <div className="text-xs font-mono text-[#B5FF2E] tracking-widest mb-3">// AI RESPONSE</div>
          {!result && <div className="text-zinc-500 text-sm">Upload a photo and hit Analyse. The estimate will appear here.</div>}
          {result && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-2">{result.disclaimer}</div>
              {est ? (
                <>
                  <Row k="Summary" v={est.summary} />
                  <Row k="Damaged components" v={(est.damaged_components || []).join(", ")} />
                  <Row k="Repair categories" v={(est.repair_categories || []).join(", ")} />
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                    <Metric k="Labour (hrs)" v={est.preliminary_labour_hours} />
                    <Metric k="Materials" v={`A$${est.preliminary_materials_aud}`} />
                    <Metric k="Parts" v={`A$${est.preliminary_parts_aud}`} />
                    <Metric k="Confidence" v={est.confidence} />
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-xs uppercase tracking-widest text-zinc-400">Estimated range</div>
                    <div className="font-display text-4xl text-[#B5FF2E]">A${est.price_low_aud} – A${est.price_high_aud}</div>
                  </div>
                  {est.notes && <div className="text-zinc-400 text-sm">{est.notes}</div>}
                </>
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-zinc-400 font-mono">{result.raw}</pre>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`.wz-input2{width:100%;background:#0f0f10;border:1px solid #27272a;padding:.65rem .85rem;color:white;outline:none;font-family:inherit}.wz-input2:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
function Row({k,v}){return v?(<div><div className="text-[11px] uppercase tracking-widest text-zinc-500">{k}</div><div className="text-sm">{v}</div></div>):null;}
function Metric({k,v}){return(<div className="border border-white/10 p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="font-mono text-lg text-white">{v ?? "—"}</div></div>);}
