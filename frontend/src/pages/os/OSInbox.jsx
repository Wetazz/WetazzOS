import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
export default function OSInbox() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ customer_id:"", channel:"EMAIL", direction:"OUT", body:"" });
  const load = () => api.get("/communications").then(r=>setRows(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!f.customer_id) return toast.error("Pick customer");
    try { await api.post("/communications", f); toast.success("Logged"); setF({...f, body:""}); load(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Unified Inbox</h1>
      <form onSubmit={send} className="border border-white/10 p-4 grid md:grid-cols-6 gap-2 mb-6" data-testid="inbox-form">
        <select data-testid="inbox-customer" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})} className="wz-i md:col-span-2"><option value="">Customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
        <select value={f.channel} onChange={e=>setF({...f,channel:e.target.value})} className="wz-i"><option>SMS</option><option>EMAIL</option><option>CHAT</option><option>PHONE</option></select>
        <input placeholder="Message body" value={f.body} onChange={e=>setF({...f,body:e.target.value})} className="wz-i md:col-span-2" data-testid="inbox-body"/>
        <button data-testid="inbox-send" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Log</button>
      </form>
      <div className="space-y-2">
        {rows.map(m => (
          <div key={m.id} className="border border-white/10 p-3" data-testid={`inbox-msg-${m.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="text-sm">{m.customer?.first_name} {m.customer?.last_name} <span className="text-zinc-500 font-mono text-xs">· {m.channel} · {m.direction}</span></div>
              <div className="text-[10px] text-zinc-500 font-mono">{new Date(m.created_at).toLocaleString()}</div>
            </div>
            <div className="text-zinc-300 text-sm mt-1">{m.body}</div>
          </div>
        ))}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
