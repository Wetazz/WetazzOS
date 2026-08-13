import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function OSParts() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ part_number:"", oem_number:"", description:"", manufacturer:"", supplier_id:"", cost:0, selling_price:0, stock:0, minimum_stock:0, location:"", fitment:"" });
  const load = () => api.get("/parts", { params: { q } }).then(r => setRows(r.data));
  useEffect(() => { load(); api.get("/suppliers").then(r=>setSuppliers(r.data)); }, [q]);
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/parts", { ...f, cost: parseFloat(f.cost)||0, selling_price: parseFloat(f.selling_price)||0, stock: parseFloat(f.stock)||0, minimum_stock: parseFloat(f.minimum_stock)||0 }); toast.success("Part added"); setF({part_number:"",oem_number:"",description:"",manufacturer:"",supplier_id:"",cost:0,selling_price:0,stock:0,minimum_stock:0,location:"",fitment:""}); load(); }
    catch(e){ toast.error(e.response?.data?.detail || "Failed"); }
  };
  const adjust = async (id, delta) => {
    try { await api.post(`/parts/${id}/adjust-stock`, { delta, reason: delta>0?"receive":"issue" }); load(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl">Parts Catalog</h1>
        <input data-testid="parts-search" placeholder="Search part / OEM / desc..." value={q} onChange={e=>setQ(e.target.value)} className="wz-i w-64"/>
      </div>
      <form onSubmit={add} className="border border-white/10 p-4 grid md:grid-cols-6 gap-2 mb-6" data-testid="add-part-form">
        <input required placeholder="Part #" value={f.part_number} onChange={e=>setF({...f,part_number:e.target.value})} className="wz-i" data-testid="part-num"/>
        <input placeholder="OEM #" value={f.oem_number} onChange={e=>setF({...f,oem_number:e.target.value})} className="wz-i"/>
        <input required placeholder="Description" value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="wz-i md:col-span-2" data-testid="part-desc"/>
        <select value={f.supplier_id} onChange={e=>setF({...f,supplier_id:e.target.value})} className="wz-i"><option value="">Supplier...</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input placeholder="Manufacturer" value={f.manufacturer} onChange={e=>setF({...f,manufacturer:e.target.value})} className="wz-i"/>
        <input type="number" step="0.01" placeholder="Cost A$" value={f.cost} onChange={e=>setF({...f,cost:e.target.value})} className="wz-i" data-testid="part-cost"/>
        <input type="number" step="0.01" placeholder="Sell A$" value={f.selling_price} onChange={e=>setF({...f,selling_price:e.target.value})} className="wz-i" data-testid="part-sell"/>
        <input type="number" placeholder="Stock" value={f.stock} onChange={e=>setF({...f,stock:e.target.value})} className="wz-i" data-testid="part-stock"/>
        <input type="number" placeholder="Min stock" value={f.minimum_stock} onChange={e=>setF({...f,minimum_stock:e.target.value})} className="wz-i"/>
        <input placeholder="Location" value={f.location} onChange={e=>setF({...f,location:e.target.value})} className="wz-i"/>
        <button data-testid="part-add-btn" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Add</button>
      </form>
      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5"><tr>
            {["Part #","OEM","Description","Supplier","Cost","Sell","Margin","Stock","Loc","Actions"].map(h=><th key={h} className="text-left px-3 py-2 uppercase text-[10px] tracking-widest text-zinc-400">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className={`border-t border-white/10 ${p.stock <= p.minimum_stock ? "bg-amber-500/5" : ""}`} data-testid={`part-row-${p.id}`}>
                <td className="px-3 py-2 font-mono text-xs text-[#B5FF2E]">{p.part_number}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">{p.oem_number || "—"}</td>
                <td className="px-3 py-2">{p.description}</td>
                <td className="px-3 py-2 text-xs">{p.supplier?.name || "—"}</td>
                <td className="px-3 py-2 font-mono">A${p.cost?.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-white">A${p.selling_price?.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-emerald-400">{p.cost>0 ? ((p.selling_price-p.cost)/p.cost*100).toFixed(0)+"%":"—"}</td>
                <td className="px-3 py-2 font-mono">{p.stock}{p.stock<=p.minimum_stock && <span className="text-amber-400 ml-1">⚠</span>}</td>
                <td className="px-3 py-2 text-xs">{p.location || "—"}</td>
                <td className="px-3 py-2 flex gap-1"><button onClick={()=>adjust(p.id,1)} className="px-2 py-0.5 border border-white/10 text-xs" data-testid={`stock-plus-${p.id}`}>+1</button><button onClick={()=>adjust(p.id,-1)} className="px-2 py-0.5 border border-white/10 text-xs">-1</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500 text-sm">No parts yet. Add your first part above.</td></tr>}
          </tbody>
        </table>
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
