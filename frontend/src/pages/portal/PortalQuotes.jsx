import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
import { SignatureModal } from "@/components/SignatureModal";

export default function PortalQuotes() {
  const [rows, setRows] = useState([]);
  const [signing, setSigning] = useState(null); // quote being signed
  const load = () => api.get("/quotes").then(r => setRows(r.data));
  useEffect(() => { load(); }, []);

  const reject = async (id) => {
    try { await api.patch(`/quotes/${id}/status`, { status: "REJECTED" }); toast.success("Quote declined"); load(); }
    catch { toast.error("Failed"); }
  };
  const submitSignature = async (dataUrl, name) => {
    try {
      await api.post(`/quotes/${signing.id}/sign`, { signature_data: dataUrl, signature_name: name, method: "PORTAL" });
      toast.success("Quote approved & signed"); setSigning(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to sign"); }
  };
  const payDeposit = async (q) => {
    try {
      const r = await api.post("/payments/checkout", { kind: "DEPOSIT", reference_id: q.id, amount: q.deposit_required, origin_url: window.location.origin });
      window.location.href = r.data.checkout_url;
    } catch { toast.error("Checkout failed"); }
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
            {q.signature && <div className="text-xs text-emerald-400 mt-1">Signed by {q.signature.name}</div>}
            <div className="flex flex-wrap gap-2 mt-3">
              <button data-testid={`quote-pdf-${q.id}`} onClick={()=>openDoc(`/quotes/${q.id}/pdf`).catch(()=>toast.error("Could not open PDF"))} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
              {["SENT","VIEWED"].includes(q.status) && <button data-testid={`quote-approve-${q.id}`} onClick={()=>setSigning(q)} className="px-3 py-1 bg-[#B5FF2E] text-black uppercase text-xs">Approve &amp; sign</button>}
              {["SENT","VIEWED"].includes(q.status) && <button data-testid={`quote-reject-${q.id}`} onClick={()=>reject(q.id)} className="px-3 py-1 border border-white/20 uppercase text-xs">Reject</button>}
              {q.status === "APPROVED" && q.deposit_required > 0 && !q.deposit_paid && <button data-testid={`quote-deposit-${q.id}`} onClick={()=>payDeposit(q)} className="px-3 py-1 bg-[#FF2E93] hover:bg-[#FF5CB5] text-black uppercase text-xs">Pay deposit</button>}
              {q.deposit_paid > 0 && <span className="px-3 py-1 border border-emerald-500/30 text-emerald-400 uppercase text-xs">Deposit paid A${q.deposit_paid?.toFixed(2)}</span>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No quotes yet.</div>}
      </div>
      <SignatureModal open={!!signing} onClose={()=>setSigning(null)} onSubmit={submitSignature}
        title={`Approve quote ${signing?.quote_number || ""}`} />
    </div>
  );
}
