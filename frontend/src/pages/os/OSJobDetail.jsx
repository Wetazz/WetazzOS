import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Play, Square, Camera, FileText } from "lucide-react";

export default function OSJobDetail() {
  const { jid } = useParams();
  const [job, setJob] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [stage, setStage] = useState("DURING");
  const [showIns, setShowIns] = useState(false);
  const [assessorUrl, setAssessorUrl] = useState("");
  const [ins, setIns] = useState({ insurer:"", claim_number:"", assessor_name:"", assessor_phone:"", assessor_email:"", excess:0, date_of_loss:"", notes:"" });
  const fileRef = useRef(null);

  const load = async () => {
    const j = await api.get(`/jobs/${jid}`); setJob(j.data);
    if (j.data.insurance) setIns(j.data.insurance);
    const p = await api.get(`/jobs/${jid}/photos`); setPhotos(p.data);
  };
  useEffect(() => { load(); }, [jid]);
  if (!job) return <div className="p-8 text-zinc-500">Loading...</div>;

  const start = async () => { try { await api.post(`/jobs/${jid}/labour/start`); toast.success("Timer started"); } catch { toast.error("Failed"); } };
  const stop = async () => { try { const r = await api.post(`/jobs/${jid}/labour/stop`); toast.success(`+${r.data.seconds}s logged`); load(); } catch { toast.error("No active timer"); } };
  const hrs = ((job.labour_seconds || 0) / 3600).toFixed(2);

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 6*1024*1024) return toast.error("Max 6MB");
    const r = new FileReader();
    r.onload = async () => {
      const b64 = r.result.split(",")[1];
      try { await api.post(`/jobs/${jid}/photos`, { image_base64: b64, stage }); toast.success(`${stage} photo uploaded`); load(); }
      catch { toast.error("Upload failed"); }
    };
    r.readAsDataURL(file);
  };

  const saveIns = async () => {
    try { await api.patch(`/jobs/${jid}/insurance`, { ...ins, excess: parseFloat(ins.excess)||0 }); toast.success("Insurance saved"); setShowIns(false); load(); }
    catch { toast.error("Failed"); }
  };

  const printPack = () => window.open(`/os/jobs/${jid}/pack`, "_blank");

  return (
    <div className="p-8 max-w-5xl">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// JOB · {job.job_number}</div>
      <h1 className="font-display text-4xl">{job.customer?.first_name} {job.customer?.last_name}</h1>
      <div className="text-zinc-400">{job.vehicle?.year} {job.vehicle?.make} {job.vehicle?.model} · {job.vehicle?.registration}</div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Metric k="Status" v={job.status.replace(/_/g,' ')} />
        <Metric k="Type" v={job.job_type} />
        <Metric k="Priority" v={job.priority} />
        <Metric k="Labour" v={`${hrs}h @ A$${job.labour_rate}`} />
        <Metric k="Bay" v={job.bay || "—"} />
        <Metric k="Class" v={job.private_or_insurance} />
      </div>

      <div className="mt-6 border border-white/10 p-6">
        <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Labour timer</div>
        <div className="flex gap-2">
          <button data-testid="labour-start" onClick={start} className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm flex items-center gap-2"><Play size={14}/> Start</button>
          <button data-testid="labour-stop" onClick={stop} className="px-4 py-2 bg-[#FF2E93] hover:bg-[#FF5CB5] text-black uppercase text-sm flex items-center gap-2"><Square size={14}/> Stop</button>
        </div>
      </div>

      <div className="mt-6 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-zinc-400">Job photos</div>
          <div className="flex items-center gap-2">
            <select value={stage} onChange={e=>setStage(e.target.value)} data-testid="photo-stage" className="bg-[#0f0f10] border border-white/10 px-2 py-1 text-xs"><option>BEFORE</option><option>DURING</option><option>AFTER</option></select>
            <button data-testid="job-photo-btn" onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 border border-[#B5FF2E] text-[#B5FF2E] hover:bg-[#B5FF2E] hover:text-black uppercase text-xs"><Camera size={14}/> Snap / Upload</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} data-testid="job-photo-input"/>
        </div>
        {["BEFORE","DURING","AFTER"].map(s => {
          const bucket = photos.filter(p => (p.stage||"DURING") === s);
          return (
            <div key={s} className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-[#FF2E93] mb-1">// {s} · {bucket.length}</div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {bucket.map(p => <div key={p.id} className="border border-white/10 aspect-square overflow-hidden" data-testid={`job-photo-${p.id}`}><img src={`data:image/jpeg;base64,${p.image_base64}`} className="w-full h-full object-cover" alt=""/></div>)}
                {!bucket.length && <div className="text-zinc-600 text-xs col-span-6">No {s.toLowerCase()} photos yet.</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-zinc-400">Insurance</div>
          <div className="flex gap-2">
            <button data-testid="ins-edit-btn" onClick={()=>setShowIns(!showIns)} className="px-3 py-1.5 border border-white/20 uppercase text-xs">{job.insurance ? "Edit" : "Add insurance"}</button>
            {job.insurance && <button data-testid="ins-pack-btn" onClick={printPack} className="flex items-center gap-2 px-3 py-1.5 bg-[#FF2E93] hover:bg-[#FF5CB5] text-black uppercase text-xs"><FileText size={14}/> Print pack</button>}
            {job.insurance && <button data-testid="assessor-link-btn" onClick={async()=>{const r=await api.post(`/jobs/${jid}/assessor-link`);const u=window.location.origin+r.data.url;setAssessorUrl(u);navigator.clipboard?.writeText(u);toast.success("Link copied to clipboard");}} className="px-3 py-1.5 border border-[#B5FF2E] text-[#B5FF2E] hover:bg-[#B5FF2E] hover:text-black uppercase text-xs">Assessor link</button>}
          </div>
        </div>
        {job.insurance && !showIns && (
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Insurer</span><div>{job.insurance.insurer}</div></div>
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Claim #</span><div className="font-mono">{job.insurance.claim_number}</div></div>
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Excess</span><div className="font-mono">A${job.insurance.excess?.toFixed(2)}</div></div>
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Assessor</span><div>{job.insurance.assessor_name}</div></div>
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Assessor phone</span><div className="font-mono text-xs">{job.insurance.assessor_phone}</div></div>
            <div><span className="text-zinc-500 text-xs uppercase tracking-widest">Date of loss</span><div className="font-mono text-xs">{job.insurance.date_of_loss}</div></div>
          </div>
        )}
        {showIns && (
          <div className="grid md:grid-cols-3 gap-2" data-testid="ins-form">
            <input placeholder="Insurer" value={ins.insurer} onChange={e=>setIns({...ins,insurer:e.target.value})} className="wz-i"/>
            <input placeholder="Claim #" value={ins.claim_number} onChange={e=>setIns({...ins,claim_number:e.target.value})} className="wz-i"/>
            <input type="number" step="0.01" placeholder="Excess A$" value={ins.excess} onChange={e=>setIns({...ins,excess:e.target.value})} className="wz-i"/>
            <input placeholder="Assessor name" value={ins.assessor_name} onChange={e=>setIns({...ins,assessor_name:e.target.value})} className="wz-i"/>
            <input placeholder="Assessor phone" value={ins.assessor_phone} onChange={e=>setIns({...ins,assessor_phone:e.target.value})} className="wz-i"/>
            <input placeholder="Assessor email" value={ins.assessor_email} onChange={e=>setIns({...ins,assessor_email:e.target.value})} className="wz-i"/>
            <input type="date" placeholder="Date of loss" value={ins.date_of_loss} onChange={e=>setIns({...ins,date_of_loss:e.target.value})} className="wz-i"/>
            <input placeholder="Notes" value={ins.notes} onChange={e=>setIns({...ins,notes:e.target.value})} className="wz-i md:col-span-2"/>
            <button data-testid="ins-save-btn" onClick={saveIns} className="bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold md:col-span-3">Save insurance</button>
          </div>
        )}
        {assessorUrl && <div className="mt-3 text-xs font-mono text-[#B5FF2E] break-all border border-[#B5FF2E]/30 p-2" data-testid="assessor-url">{assessorUrl}</div>}
      </div>

      <div className="mt-6 border border-white/10 p-6">
        <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Notes</div>
        <div className="text-sm text-zinc-300">{job.notes || "—"}</div>
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
function Metric({k,v}){return(<div className="border border-white/10 p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="font-mono text-lg">{v}</div></div>);}
