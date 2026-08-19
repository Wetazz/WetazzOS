import { useEffect, useState } from "react";
import { api, openDoc } from "@/lib/api";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";

export default function OSReleaseForms() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ customer_id:"", vehicle_id:"", location_id:"", odometer:"", work_summary:"", amount_due:"0", notes:"" });

  const load = () => api.get("/release-forms").then(r => setRows(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); api.get("/locations").then(r=>setLocations(r.data)); }, []);
  useEffect(() => { if (f.customer_id) api.get("/vehicles", { params: { customer_id: f.customer_id } }).then(r=>setVehicles(r.data)); }, [f.customer_id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.customer_id || !f.vehicle_id) { toast.error("Select customer and vehicle"); return; }
    try {
      await api.post("/release-forms", { ...f, amount_due: parseFloat(f.amount_due || 0) });
      toast.success("Release form created"); setShow(false);
      setF({ customer_id:"", vehicle_id:"", location_id:"", odometer:"", work_summary:"", amount_due:"0", notes:"" });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const sign = async (id) => { await api.patch(`/release-forms/${id}/sign`, { signature_name: "Signed in workshop" }); toast.success("Marked signed"); load(); };
  const pdf = async (id) => { try { await openDoc(`/release-forms/${id}/pdf`); } catch { toast.error("Could not open PDF"); } };

  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl flex items-center gap-3"><FileSignature className="text-[#B5FF2E]" /> Vehicle Release Forms</h1>
        <button data-testid="new-release-btn" onClick={()=>setShow(!show)} className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">+ New release</button>
      </div>

      {show && (
        <form onSubmit={submit} className="border border-white/10 p-6 mb-8 space-y-4" data-testid="new-release-form">
          <div className="grid md:grid-cols-3 gap-3">
            <select required data-testid="rf-customer" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value,vehicle_id:""})} className="wz-i"><option value="">Customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
            <select required data-testid="rf-vehicle" value={f.vehicle_id} onChange={e=>setF({...f,vehicle_id:e.target.value})} className="wz-i"><option value="">Vehicle...</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} {v.registration?`· ${v.registration}`:""}</option>)}</select>
            <select data-testid="rf-location" value={f.location_id} onChange={e=>setF({...f,location_id:e.target.value})} className="wz-i"><option value="">Location...</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input placeholder="Odometer (km)" value={f.odometer} onChange={e=>setF({...f,odometer:e.target.value})} className="wz-i" data-testid="rf-odometer"/>
            <input placeholder="Amount due on collection A$" value={f.amount_due} onChange={e=>setF({...f,amount_due:e.target.value})} className="wz-i" data-testid="rf-amount"/>
          </div>
          <textarea placeholder="Summary of work carried out" rows={3} value={f.work_summary} onChange={e=>setF({...f,work_summary:e.target.value})} className="wz-i w-full" data-testid="rf-summary"/>
          <div className="flex gap-2 justify-end"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 border border-white/20 uppercase text-sm">Cancel</button><button data-testid="rf-submit" className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">Create release form</button></div>
        </form>
      )}

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`os-release-${r.id}`}>
            <div>
              <div className="font-display text-lg">{r.release_number} · {r.customer?.first_name} {r.customer?.last_name}</div>
              <div className="text-xs text-zinc-500 font-mono">{r.vehicle?.make} {r.vehicle?.model} {r.vehicle?.registration?`· ${r.vehicle.registration}`:""} {r.amount_due?`· Due A$${r.amount_due?.toFixed?.(2) ?? r.amount_due}`:""}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`text-xs uppercase ${r.status==="SIGNED"?"text-emerald-400":"text-zinc-400"}`}>{r.status}</div>
              <button data-testid={`rf-pdf-${r.id}`} onClick={()=>pdf(r.id)} className="px-3 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs">PDF / Print</button>
              {r.status!=="SIGNED" && <button data-testid={`rf-sign-${r.id}`} onClick={()=>sign(r.id)} className="px-3 py-1 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-xs">Mark signed</button>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No release forms yet.</div>}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
