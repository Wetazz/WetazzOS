import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function OSSuppliers() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ name:"", contact:"", email:"", phone:"", notes:"" });
  const load = () => api.get("/suppliers").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/suppliers", f); toast.success("Supplier added"); setF({name:"",contact:"",email:"",phone:"",notes:""}); load(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Suppliers</h1>
      <form onSubmit={add} className="border border-white/10 p-4 grid md:grid-cols-5 gap-2 mb-6" data-testid="add-supplier-form">
        <input required placeholder="Name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} className="wz-i" data-testid="sup-name"/>
        <input placeholder="Contact" value={f.contact} onChange={e=>setF({...f,contact:e.target.value})} className="wz-i"/>
        <input placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="wz-i"/>
        <input placeholder="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} className="wz-i"/>
        <button data-testid="sup-add-btn" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Add</button>
      </form>
      <div className="grid md:grid-cols-3 gap-3">
        {rows.map(s => (
          <div key={s.id} className="border border-white/10 p-4" data-testid={`supplier-card-${s.id}`}>
            <div className="font-display text-xl">{s.name}</div>
            <div className="text-xs text-zinc-500 font-mono mt-1">{s.email || "—"}</div>
            <div className="text-xs text-zinc-500 font-mono">{s.phone || "—"}</div>
            <div className="text-sm text-zinc-400 mt-2">{s.contact}</div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500 text-sm">No suppliers yet.</div>}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
