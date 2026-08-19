import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function OSInbox() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [integ, setInteg] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [f, setF] = useState({ customer_id:"", channel:"EMAIL", direction:"OUT", body:"" });
  const load = () => api.get("/communications").then(r=>setRows(r.data));
  useEffect(() => {
    load();
    api.get("/customers").then(r=>setCustomers(r.data));
    api.get("/integrations/status").then(r=>setInteg(r.data)).catch(()=>{});
  }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!f.customer_id) return toast.error("Pick customer");
    try { await api.post("/communications", f); toast.success("Logged"); setF({...f, body:""}); load(); }
    catch { toast.error("Failed"); }
  };

  const filtered = rows.filter(m => filter === "ALL" ? true : m.channel === filter);

  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// UNIFIED COMMS</div>
      <h1 className="font-display text-4xl mb-4">Inbox</h1>

      {integ && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
          {Object.entries(integ).map(([k,v])=>(
            <div key={k} className={`border p-2 ${v.configured?"border-[#B5FF2E]/30":"border-[#FF2E93]/40"}`} data-testid={`inbox-provider-${k}`}>
              <div className="text-[10px] uppercase tracking-widest text-zinc-400">{k}</div>
              <div className={`text-xs font-bold uppercase ${v.configured?"text-[#B5FF2E]":"text-[#FF2E93]"}`}>{v.configured?"Ready":"NOT CONFIGURED"}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={send} className="border border-white/10 p-4 grid md:grid-cols-6 gap-2 mb-6" data-testid="inbox-form">
        <select data-testid="inbox-customer" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})} className="wz-i md:col-span-2"><option value="">Customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
        <select value={f.channel} onChange={e=>setF({...f,channel:e.target.value})} className="wz-i"><option>SMS</option><option>EMAIL</option><option>CHAT</option><option>PHONE</option></select>
        <input placeholder="Message body" value={f.body} onChange={e=>setF({...f,body:e.target.value})} className="wz-i md:col-span-2" data-testid="inbox-body"/>
        <button data-testid="inbox-send" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">Log</button>
      </form>

      <div className="flex gap-2 mb-4 text-xs uppercase tracking-widest">
        {["ALL","EMAIL","SMS","WEBSITE","CHAT","PHONE"].map(k=>(
          <button key={k} onClick={()=>setFilter(k)} data-testid={`inbox-filter-${k}`}
            className={`px-3 py-1 ${filter===k?"bg-[#B5FF2E] text-black":"border border-white/10 text-zinc-400"}`}>{k}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className={`border p-3 ${m.status==="NOT_CONFIGURED"?"border-[#FF2E93]/30 bg-[#FF2E93]/5":"border-white/10"}`} data-testid={`inbox-msg-${m.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="text-sm">{m.customer?.first_name} {m.customer?.last_name} <span className="text-zinc-500 font-mono text-xs">· {m.channel} · {m.direction} · {m.workflow_kind||"MANUAL"}</span></div>
              <div className="text-[10px] text-zinc-500 font-mono">{new Date(m.created_at).toLocaleString("en-AU")}</div>
            </div>
            {m.subject && <div className="text-sm font-bold mt-1">{m.subject}</div>}
            <div className="text-zinc-300 text-sm mt-1 whitespace-pre-line">{m.body}</div>
            {m.status === "NOT_CONFIGURED" && (
              <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#FF2E93]"><AlertTriangle size={10}/> Message stored but NOT sent — {m.provider} provider NOT CONFIGURED</div>
            )}
            {m.status === "QUEUED" && <div className="mt-2 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#B5FF2E]/30 text-[#B5FF2E]">Queued for {m.provider}</div>}
          </div>
        ))}
        {!filtered.length && <div className="text-zinc-500 text-sm">No messages.</div>}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
