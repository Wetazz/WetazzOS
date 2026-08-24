import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
import { SignatureModal } from "@/components/SignatureModal";

export default function OSQuotes() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [parts, setParts] = useState([]);
  const [partQuery, setPartQuery] = useState("");
  const [show, setShow] = useState(false);
  const [signing, setSigning] = useState(null);
  const [f, setF] = useState({ customer_id:"", vehicle_id:"", location_id:"", deposit_required:"0", notes:"" });
  const [items, setItems] = useState([{ kind:"LABOUR", description:"Labour", quantity:1, unit_price:135, total:135 }]);

  const load = () => api.get("/quotes").then(r => setRows(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); api.get("/locations").then(r=>setLocations(r.data)); }, []);
  useEffect(() => { if (f.customer_id) api.get("/vehicles", { params: { customer_id: f.customer_id } }).then(r=>setVehicles(r.data)); }, [f.customer_id]);
  useEffect(() => { const t=setTimeout(()=>api.get("/parts", { params: { q: partQuery }}).then(r=>setParts(r.data.slice(0,8))), 150); return ()=>clearTimeout(t); }, [partQuery]);

  const setItem = (i, patch) => setItems(items.map((it, idx) => idx===i ? {...it, ...patch, total: (patch.quantity ?? it.quantity) * (patch.unit_price ?? it.unit_price)} : it));
  const addItem = () => setItems([...items, { kind:"PART", description:"", quantity:1, unit_price:0, total:0 }]);
  const addPartToQuote = (p) => setItems([...items, { kind:"PART", description:`${p.part_number} — ${p.description}`, quantity:1, unit_price:p.selling_price, total:p.selling_price, part_id:p.id, cost:p.cost }]);
  const removeItem = (i) => setItems(items.filter((_,idx)=>idx!==i));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/quotes", { ...f, items, deposit_required: parseFloat(f.deposit_required||0) });
      toast.success("Quote created"); setShow(false); load();
    } catch(e){ toast.error(e.response?.data?.detail || "Failed"); }
  };
  const send = async (id) => { await api.patch(`/quotes/${id}/status`, { status: "SENT" }); toast.success("Sent to customer"); load(); };
  const pdf = async (id) => { try { await openDoc(`/quotes/${id}/pdf`); } catch { toast.error("Could not open PDF"); } };
  const submitSignature = async (dataUrl, name) => {
    try { await api.post(`/quotes/${signing.id}/sign`, { signature_data: dataUrl, signature_name: name, method: "ONSITE" });
      toast.success("Signed & authorised"); setSigning(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to sign"); }
  };

  const subtotal = items.reduce((s,i)=>s + Number(i.total||0), 0);
  const gst = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + gst).toFixed(2);

  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl">Quotes</h1>
        <button data-testid="new-quote-btn" onClick={()=>setShow(true)} className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">+ New quote</button>
      </div>

      {show && (
        <form onSubmit={submit} className="border border-white/10 p-6 mb-8 space-y-4" data-testid="new-quote-form">
          <div className="grid md:grid-cols-3 gap-3">
            <select required data-testid="qt-customer" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value,vehicle_id:""})} className="wz-i"><option value="">Customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
            <select required data-testid="qt-vehicle" value={f.vehicle_id} onChange={e=>setF({...f,vehicle_id:e.target.value})} className="wz-i"><option value="">Vehicle...</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</select>
            <select data-testid="qt-location" value={f.location_id} onChange={e=>setF({...f,location_id:e.target.value})} className="wz-i"><option value="">Location...</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
            <input placeholder="Deposit A$" value={f.deposit_required} onChange={e=>setF({...f,deposit_required:e.target.value})} className="wz-i" data-testid="qt-deposit"/>
          </div>

          <div className="border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-[#B5FF2E] mb-2">// Parts catalog</div>
            <input data-testid="qt-part-search" placeholder="Search parts by number, OEM or description..." value={partQuery} onChange={e=>setPartQuery(e.target.value)} className="wz-i w-full mb-2"/>
            <div className="grid md:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {parts.map(p => (
                <button type="button" key={p.id} onClick={()=>addPartToQuote(p)} data-testid={`qt-part-${p.id}`}
                  className="text-left border border-white/10 hover:border-[#B5FF2E] p-2 flex justify-between text-xs">
                  <span><span className="font-mono text-[#B5FF2E]">{p.part_number}</span> · {p.description}</span>
                  <span className="font-mono">A${p.selling_price?.toFixed(2)} <span className="text-zinc-500">({p.stock} in stock)</span></span>
                </button>
              ))}
              {!parts.length && <div className="text-zinc-500 text-xs p-2">No parts. Add via /os/parts.</div>}
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <select value={it.kind} onChange={e=>setItem(i,{kind:e.target.value})} className="wz-i col-span-2"><option>LABOUR</option><option>PART</option><option>MATERIAL</option><option>OTHER</option></select>
                <input placeholder="Description" value={it.description} onChange={e=>setItem(i,{description:e.target.value})} className="wz-i col-span-5"/>
                <input type="number" step="0.01" value={it.quantity} onChange={e=>setItem(i,{quantity:parseFloat(e.target.value)||0})} className="wz-i col-span-1"/>
                <input type="number" step="0.01" value={it.unit_price} onChange={e=>setItem(i,{unit_price:parseFloat(e.target.value)||0})} className="wz-i col-span-2"/>
                <div className="col-span-1 font-mono text-sm px-2 py-2">A${it.total.toFixed(2)}</div>
                <button type="button" onClick={()=>removeItem(i)} className="col-span-1 border border-white/10 uppercase text-xs">×</button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs uppercase tracking-widest text-[#B5FF2E]" data-testid="qt-add-item">+ Add line</button>
          </div>
          <div className="text-sm font-mono text-right">Subtotal A${subtotal.toFixed(2)} · GST A${gst.toFixed(2)} · <span className="text-[#B5FF2E]">Total A${total.toFixed(2)}</span></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 border border-white/20 uppercase text-sm">Cancel</button><button data-testid="qt-submit" className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">Create quote</button></div>
        </form>
      )}

      <div className="space-y-2">
        {rows.map(q => (
          <div key={q.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`os-quote-${q.id}`}>
            <div>
              <div className="font-display text-lg">{q.quote_number} · {q.customer?.first_name} {q.customer?.last_name}</div>
              <div className="text-xs text-zinc-500 font-mono">{q.vehicle?.make} {q.vehicle?.model} · Total A${q.total?.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs uppercase text-[#B5FF2E]">{q.status}{q.signature ? " · SIGNED" : ""}</div>
              <button data-testid={`qt-pdf-${q.id}`} onClick={()=>pdf(q.id)} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
              {q.status === "DRAFT" && <button data-testid={`qt-send-${q.id}`} onClick={()=>send(q.id)} className="px-3 py-1 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-xs">Send</button>}
              {!q.signature && <button data-testid={`qt-sign-${q.id}`} onClick={()=>setSigning(q)} className="px-3 py-1 border border-[#B5FF2E] text-[#B5FF2E] hover:bg-[#B5FF2E] hover:text-black uppercase text-xs">Sign onsite</button>}
            </div>
          </div>
        ))}
      </div>
      <SignatureModal open={!!signing} onClose={()=>setSigning(null)} onSubmit={submitSignature} title={`Authorise quote ${signing?.quote_number || ""}`} defaultName={signing ? `${signing.customer?.first_name||""} ${signing.customer?.last_name||""}`.trim() : ""} />
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
