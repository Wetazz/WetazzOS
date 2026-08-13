import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

export default function AssessorView() {
  const { token } = useParams();
  const [j, setJ] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get(`/assessor/${token}`).then(r=>setJ(r.data)).catch(e=>setErr(e.response?.data?.detail || "Link invalid or expired")); }, [token]);
  if (err) return <div className="p-16 text-center text-zinc-400">{err}</div>;
  if (!j) return <div className="p-8 text-zinc-500">Loading...</div>;
  const ins = j.insurance || {};
  return (
    <div className="min-h-screen bg-black text-white p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <img src="https://customer-assets-jai6qajn.emergentagent.net/job_workshop-os-3/artifacts/52gfsp8x_1000014390.png" alt="Wetazz" className="h-10 w-10 object-contain"/>
        <div><div className="font-display text-lg text-[#B5FF2E]">WETAZZ · ASSESSOR</div><div className="text-xs text-zinc-400">89 Maxwell St, Wellington NSW</div></div>
        <div className="ml-auto text-right"><div className="font-mono">{j.job_number}</div><div className="text-[10px] uppercase text-[#FF2E93]">{j.status?.replace(/_/g,' ')}</div></div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="border border-white/10 p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Claim</div>
          <div className="text-sm">Insurer: <span className="text-white">{ins.insurer}</span></div>
          <div className="text-sm">Claim #: <span className="font-mono">{ins.claim_number}</span></div>
          <div className="text-sm">Excess: <span className="font-mono">A${(ins.excess||0).toFixed(2)}</span></div>
          <div className="text-sm">Date of loss: <span className="font-mono">{ins.date_of_loss||"—"}</span></div>
        </div>
        <div className="border border-white/10 p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Vehicle</div>
          <div>{j.vehicle?.year} {j.vehicle?.make} {j.vehicle?.model}</div>
          <div className="text-xs font-mono text-zinc-500">VIN {j.vehicle?.vin || "—"} · REGO {j.vehicle?.registration || "—"}</div>
          <div className="text-xs mt-3 text-zinc-400">Customer: {j.customer?.first_name} {j.customer?.last_name}</div>
        </div>
      </div>
      {j.quotes?.length ? (
        <div className="mt-6 border border-white/10 p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Quotes</div>
          {j.quotes.map(q=>(<div key={q.id} className="flex justify-between border-b border-white/5 py-1 text-sm"><span>{q.quote_number} · {q.status}</span><span className="font-mono">A${q.total?.toFixed(2)}</span></div>))}
        </div>
      ) : null}
      {["BEFORE","DURING","AFTER"].map(s=>{
        const bucket = (j.photos||[]).filter(p=>(p.stage||"DURING")===s);
        if (!bucket.length) return null;
        return (<div key={s} className="mt-6"><div className="text-xs uppercase tracking-widest text-[#FF2E93] mb-2">// {s}</div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">{bucket.map(p=><img key={p.id} src={`data:image/jpeg;base64,${p.image_base64}`} className="w-full h-40 object-cover border border-white/10" alt=""/>)}</div>
        </div>);
      })}
      <div className="mt-8 text-xs text-zinc-600 font-mono">Read-only assessor view · WETAZZ OS</div>
    </div>
  );
}
