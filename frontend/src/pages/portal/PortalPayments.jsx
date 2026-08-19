import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PortalPayments() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/me/payments").then(r => setRows(r.data)); }, []);
  const total = rows.filter(r=>r.payment_status==="paid").reduce((s,r)=>s+r.amount, 0);
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-4xl mb-6">My Payments</h1>
      <div className="border border-white/10 p-5 mb-4">
        <div className="text-xs uppercase tracking-widest text-zinc-400">Total paid</div>
        <div className="font-mono text-3xl text-[#B5FF2E] mt-1">A${total.toFixed(2)}</div>
      </div>
      <div className="space-y-2">
        {rows.map(p => (
          <div key={p.session_id} className="border border-white/10 p-4" data-testid={`pp-${p.session_id}`}>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-lg">{p.kind}</div>
              <div className="text-xs uppercase tracking-widest text-[#B5FF2E]">{p.payment_status}</div>
            </div>
            <div className="font-mono text-lg mt-1">A${p.amount?.toFixed(2)}</div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">{new Date(p.created_at).toLocaleString("en-AU")}</div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500 text-sm">No payments yet.</div>}
      </div>
    </div>
  );
}
