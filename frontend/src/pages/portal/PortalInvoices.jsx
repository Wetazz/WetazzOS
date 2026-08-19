import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
export default function PortalInvoices() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/invoices").then(r => setRows(r.data)); }, []);
  const pay = async (inv) => {
    try {
      const r = await api.post("/payments/checkout", { kind: "INVOICE", reference_id: inv.id, amount: inv.balance, origin_url: window.location.origin });
      window.location.href = r.data.checkout_url;
    } catch(e){ toast.error("Checkout failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Invoices</h1>
      <div className="space-y-3">
        {rows.map(i => (
          <div key={i.id} className="border border-white/10 p-5" data-testid={`invoice-row-${i.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-xl">{i.invoice_number}</div>
              <div className="text-xs uppercase tracking-widest text-[#B5FF2E]">{i.status}</div>
            </div>
            <div className="font-mono text-lg mt-1">Total A${i.total?.toFixed(2)} · Balance A${i.balance?.toFixed(2)}</div>
            <div className="flex gap-2 mt-3">
              <button data-testid={`invoice-pdf-${i.id}`} onClick={()=>openDoc(`/invoices/${i.id}/pdf`).catch(()=>toast.error("Could not open PDF"))} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
              {i.balance > 0 && <button data-testid={`invoice-pay-${i.id}`} onClick={()=>pay(i)} className="px-4 py-1 bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-xs font-bold text-black">Pay balance</button>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No invoices yet.</div>}
      </div>
    </div>
  );
}
