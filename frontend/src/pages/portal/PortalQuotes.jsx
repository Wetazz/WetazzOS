import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
export default function PortalQuotes() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/quotes").then(r => setRows(r.data));
  useEffect(() => { load(); }, []);
  const act = async (id, status) => {
    try { await api.patch(`/quotes/${id}/status`, { status }); toast.success("Updated"); load(); }
    catch(e){ toast.error("Failed"); }
  };
  const payDeposit = async (q) => {
    try {
      const r = await api.post("/payments/checkout", { kind: "DEPOSIT", reference_id: q.id, amount: q.deposit_required, origin_url: window.location.origin });
      window.location.href = r.data.checkout_url;
    } catch(e){ toast.error("Checkout failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Quotes</h1>
      <div className="space-y-3">
        {rows.map(q => (
          <div key={q.id} className="border border-white/10 p-5" data-testid={`quote-row-${q.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-xl">{q.quote_number}</div>
              <div className="text-xs uppercase tracking-widest text-[#B5FF2E]">{q.status}</div>
            </div>
            <div className="font-mono text-lg mt-1">Total A${q.total?.toFixed(2)} · GST A${q.gst?.toFixed(2)}</div>
            {q.deposit_required > 0 && <div className="text-xs text-zinc-400 font-mono">Deposit required A${q.deposit_required?.toFixed(2)}</div>}
            <div className="flex gap-2 mt-3">
              <button data-testid={`quote-pdf-${q.id}`} onClick={()=>openDoc(`/quotes/${q.id}/pdf`).catch(()=>toast.error("Could not open PDF"))} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
              {["SENT","VIEWED"].includes(q.status) && <button data-testid={`quote-approve-${q.id}`} onClick={()=>act(q.id,"APPROVED")} className="px-3 py-1 bg-[#B5FF2E] text-black uppercase text-xs">Approve</button>}
              {["SENT","VIEWED"].includes(q.status) && <button data-testid={`quote-reject-${q.id}`} onClick={()=>act(q.id,"REJECTED")} className="px-3 py-1 border border-white/20 uppercase text-xs">Reject</button>}
              {q.status === "APPROVED" && q.deposit_required > 0 && !q.deposit_paid && <button data-testid={`quote-deposit-${q.id}`} onClick={()=>payDeposit(q)} className="px-3 py-1 bg-[#FF2E93] hover:bg-[#FF5CB5] text-black uppercase text-xs">Pay deposit</button>}
              {q.deposit_paid > 0 && <span className="px-3 py-1 border border-emerald-500/30 text-emerald-400 uppercase text-xs">Deposit paid A${q.deposit_paid?.toFixed(2)}</span>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No quotes yet.</div>}
      </div>
    </div>
  );
}
