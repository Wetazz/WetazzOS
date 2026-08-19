import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2, X, AlertTriangle } from "lucide-react";

const MAX = 12;

export default function GetQuote() {
  const [f, setF] = useState({ full_name:"", contact_number:"", registration:"", make:"", model:"", year:"", vehicle_details:"", description:"" });
  const [photos, setPhotos] = useState([]); // {preview, b64}
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); return; }
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} is too large (max 8MB)`); return; }
      const reader = new FileReader();
      reader.onload = () => setPhotos((p) => p.length >= MAX ? p : [...p, { preview: reader.result, b64: reader.result.split(",")[1] }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const removePhoto = (i) => setPhotos(photos.filter((_, idx) => idx !== i));

  const analyse = async () => {
    const required = { full_name:"full name", contact_number:"contact number", registration:"registration", make:"make", model:"model", year:"year" };
    for (const [k, label] of Object.entries(required)) if (!f[k]?.trim()) { toast.error(`Please enter your ${label}`); return; }
    if (!photos.length) { toast.error("Upload at least one photo of the damage"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post("/ai/photo-estimate", {
        images_base64: photos.map((p) => p.b64),
        full_name: f.full_name, contact_number: f.contact_number, registration: f.registration,
        vehicle_make: f.make, vehicle_model: f.model, vehicle_year: f.year,
        vehicle_details: f.vehicle_details, description: f.description,
      });
      setResult(r.data);
      if (!r.data.estimate) toast.message("Estimate returned as text — see details below");
    } catch (e) { toast.error(e.response?.data?.detail || "AI estimate failed"); }
    setLoading(false);
  };

  const est = result?.estimate;
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ AI</div>
      <h1 className="font-display text-5xl mb-2">AI Damage Estimate</h1>
      <p className="text-zinc-400 mb-8 max-w-2xl">Tell us about your vehicle and upload up to {MAX} photos of the damage. Our AI reviews the images and returns an indicative estimate. This is <span className="text-amber-400">not confirmed workshop pricing</span> — final pricing follows a physical inspection.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-white/10 p-6 space-y-4" data-testid="ai-quote-form">
          <div className="grid grid-cols-2 gap-3">
            <input data-testid="ai-full-name" className="wz-input2" placeholder="Full name *" value={f.full_name} onChange={set("full_name")} />
            <input data-testid="ai-contact" className="wz-input2" placeholder="Contact number *" value={f.contact_number} onChange={set("contact_number")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input data-testid="ai-rego" className="wz-input2" placeholder="Rego *" value={f.registration} onChange={set("registration")} />
            <input data-testid="ai-make" className="wz-input2" placeholder="Make *" value={f.make} onChange={set("make")} />
            <input data-testid="ai-model" className="wz-input2" placeholder="Model *" value={f.model} onChange={set("model")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input data-testid="ai-year" className="wz-input2" placeholder="Year *" value={f.year} onChange={set("year")} />
            <input data-testid="ai-vehicle-details" className="wz-input2" placeholder="Colour / variant / trim" value={f.vehicle_details} onChange={set("vehicle_details")} />
          </div>
          <textarea data-testid="ai-desc" className="wz-input2" rows={3} placeholder="Describe what happened..." value={f.description} onChange={set("description")} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-widest text-zinc-400">Photos ({photos.length}/{MAX})</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square border border-white/10 overflow-hidden group" data-testid={`ai-photo-${i}`}>
                  <img src={p.preview} className="w-full h-full object-cover" alt={`damage ${i+1}`} />
                  <button type="button" data-testid={`ai-photo-remove-${i}`} onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-[#FF2E93] p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                </div>
              ))}
              {photos.length < MAX && (
                <label className="aspect-square border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#B5FF2E] transition-colors" data-testid="ai-upload-tile">
                  <Upload className="text-zinc-500" size={18} />
                  <input data-testid="ai-file" type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                </label>
              )}
            </div>
          </div>

          <button data-testid="ai-analyse-btn" onClick={analyse} disabled={loading}
            className="w-full bg-[#B5FF2E] hover:bg-[#C8FF5A] py-3 font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 text-black">
            {loading ? <><Loader2 className="animate-spin" size={16}/> Analysing {photos.length} photo{photos.length!==1?"s":""}...</> : <><Sparkles size={16}/> Get AI estimate</>}
          </button>
        </div>

        <div className="border border-white/10 p-6" data-testid="ai-quote-result">
          <div className="text-xs font-mono text-[#B5FF2E] tracking-widest mb-3">// AI RESPONSE</div>
          {!result && <div className="text-zinc-500 text-sm">Fill in your details, add photos and hit <span className="text-white">Get AI estimate</span>. Your estimate will appear here.</div>}
          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-2" data-testid="ai-disclaimer">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{result.disclaimer}</span>
              </div>
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
                    <div className="text-xs uppercase tracking-widest text-zinc-400">AI estimated range</div>
                    <div className="font-display text-4xl text-[#B5FF2E]">A${est.price_low_aud} – A${est.price_high_aud}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">Indicative only — not a confirmed quote</div>
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
