import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Play, Square } from "lucide-react";

export default function OSJobDetail() {
  const { jid } = useParams();
  const [job, setJob] = useState(null);
  const load = () => api.get(`/jobs/${jid}`).then(r => setJob(r.data));
  useEffect(() => { load(); }, [jid]);
  if (!job) return <div className="p-8 text-zinc-500">Loading...</div>;
  const start = async () => { try { await api.post(`/jobs/${jid}/labour/start`); toast.success("Timer started"); } catch { toast.error("Failed"); } };
  const stop = async () => { try { const r = await api.post(`/jobs/${jid}/labour/stop`); toast.success(`+${r.data.seconds}s logged`); load(); } catch { toast.error("No active timer"); } };
  const hrs = ((job.labour_seconds || 0) / 3600).toFixed(2);

  return (
    <div className="p-8 max-w-5xl">
      <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// JOB · {job.job_number}</div>
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
          <button data-testid="labour-start" onClick={start} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 uppercase text-sm flex items-center gap-2"><Play size={14}/> Start</button>
          <button data-testid="labour-stop" onClick={stop} className="px-4 py-2 bg-[#FF3B30] hover:bg-[#FF5B52] uppercase text-sm flex items-center gap-2"><Square size={14}/> Stop</button>
        </div>
      </div>
      <div className="mt-6 border border-white/10 p-6">
        <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Notes</div>
        <div className="text-sm text-zinc-300">{job.notes || "—"}</div>
      </div>
    </div>
  );
}
function Metric({k,v}){return(<div className="border border-white/10 p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="font-mono text-lg">{v}</div></div>);}
