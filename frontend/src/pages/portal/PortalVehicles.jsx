import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function PortalVehicles() {
  const [rows, setRows] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [f, setF] = useState({ make:"", model:"", year:"", registration:"", colour:"" });
  const load = async () => {
    const me = await api.get("/auth/me"); // to be safe
    const v = await api.get("/vehicles");
    setRows(v.data);
    // Get customer id
    if (v.data[0]) setCustomerId(v.data[0].customer_id);
    else {
      // fetch customer for this user
      try { const cs = await api.get("/customers", { params: { q: me.data.email } }); if (cs.data[0]) setCustomerId(cs.data[0].id); } catch (_e) { /* ignore */ }
    }
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!customerId) {
      // Create customer by loading portal home? For simplicity, sign-up already created customer, retrieve via /customers... but only staff can. Use vehicle create anyway if 0 vehicles, need customer_id.
      // Fallback: get user email then... skip: use special endpoint via portal
      const me = await api.get("/auth/me"); toast.error("Missing customer profile. Please contact workshop."); return;
    }
    try {
      await api.post("/vehicles", { customer_id: customerId, ...f, year: f.year? parseInt(f.year): null });
      toast.success("Vehicle added"); setF({make:"",model:"",year:"",registration:"",colour:""}); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Vehicles</h1>
      <form onSubmit={add} className="border border-white/10 p-6 grid md:grid-cols-6 gap-3 mb-8" data-testid="add-vehicle-form">
        <input data-testid="veh-make" required placeholder="Make" value={f.make} onChange={e=>setF({...f,make:e.target.value})} className="wz-i"/>
        <input data-testid="veh-model" required placeholder="Model" value={f.model} onChange={e=>setF({...f,model:e.target.value})} className="wz-i"/>
        <input data-testid="veh-year" placeholder="Year" value={f.year} onChange={e=>setF({...f,year:e.target.value})} className="wz-i"/>
        <input data-testid="veh-rego" placeholder="Rego" value={f.registration} onChange={e=>setF({...f,registration:e.target.value})} className="wz-i"/>
        <input data-testid="veh-colour" placeholder="Colour" value={f.colour} onChange={e=>setF({...f,colour:e.target.value})} className="wz-i"/>
        <button data-testid="veh-add-btn" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Add</button>
      </form>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(v => (
          <div key={v.id} className="border border-white/10 p-6" data-testid={`vehicle-${v.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-2xl">{v.year} {v.make} {v.model}</div>
              <div className="font-mono text-xs text-[#B5FF2E]">{v.registration || "—"}</div>
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-1">VIN {v.vin || "—"} · {v.colour || "—"}</div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No vehicles yet.</div>}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
