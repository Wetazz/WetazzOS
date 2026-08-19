import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
export default function OSInvoices() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/invoices").then(r => setRows(r.data)); }, []);
  const pdf = async (id) => { try { await openDoc(`/invoices/${id}/pdf`); } catch { toast.error("Could not open PDF"); } };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Invoices</h1>
      <div className="space-y-2">
        {rows.map(i => (
          <div key={i.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`os-invoice-${i.id}`}>
            <div>
              <div className="font-display text-lg">{i.invoice_number} · {i.customer?.first_name} {i.customer?.last_name}</div>
              <div className="text-xs font-mono text-zinc-500">Total A${i.total?.toFixed(2)} · Balance A${i.balance?.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs uppercase text-[#B5FF2E]">{i.status}</div>
              <button data-testid={`inv-pdf-${i.id}`} onClick={()=>pdf(i.id)} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No invoices yet.</div>}
      </div>
    </div>
  );
}
