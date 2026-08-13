import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
export default function OSCustomers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ first_name:"", last_name:"", email:"", phone:"" });
  const load = () => api.get("/customers", { params: { q } }).then(r => setRows(r.data));
  useEffect(() => { load(); }, [q]);
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/customers", f); toast.success("Customer added"); setF({first_name:"",last_name:"",email:"",phone:""}); load(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-4xl">Customers</h1>
        <input data-testid="customer-search" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} className="wz-i" />
      </div>
      <form onSubmit={add} className="border border-white/10 p-5 grid md:grid-cols-5 gap-3 mb-8" data-testid="add-customer-form">
        <input required data-testid="cust-first" placeholder="First" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})} className="wz-i"/>
        <input required data-testid="cust-last" placeholder="Last" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})} className="wz-i"/>
        <input data-testid="cust-email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="wz-i"/>
        <input data-testid="cust-phone" placeholder="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} className="wz-i"/>
        <button data-testid="cust-add" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Add</button>
      </form>
      <div className="border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5"><tr><th className="text-left px-4 py-2 uppercase text-xs tracking-widest text-zinc-400">Name</th><th className="text-left px-4 py-2 uppercase text-xs tracking-widest text-zinc-400">Email</th><th className="text-left px-4 py-2 uppercase text-xs tracking-widest text-zinc-400">Phone</th><th className="text-left px-4 py-2 uppercase text-xs tracking-widest text-zinc-400">Status</th></tr></thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-t border-white/10 hover:bg-white/5" data-testid={`customer-row-${c.id}`}>
                <td className="px-4 py-2">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.email}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-2 text-xs uppercase text-[#B5FF2E]">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
