import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function OSVehicles() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { api.get("/vehicles", { params: { q } }).then(r => setRows(r.data)); }, [q]);
  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl">Vehicles</h1>
        <input data-testid="vehicle-search" placeholder="Rego / VIN / Make..." value={q} onChange={e=>setQ(e.target.value)} className="bg-[#0f0f10] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#B5FF2E]"/>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {rows.map(v => (
          <div key={v.id} className="border border-white/10 p-4" data-testid={`vehicle-card-${v.id}`}>
            <div className="font-display text-xl">{v.year || ""} {v.make} {v.model}</div>
            <div className="font-mono text-xs text-[#B5FF2E] mt-1">{v.registration || "NO REGO"}</div>
            <div className="text-xs text-zinc-500 font-mono">VIN {v.vin || "—"}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-2">{v.verification}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
