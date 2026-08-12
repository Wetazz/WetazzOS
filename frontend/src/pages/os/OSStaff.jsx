import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
export default function OSStaff() {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ first_name:"", last_name:"", email:"", phone:"", password:"", role:"TECHNICIAN", hourly_cost:45, selling_rate:135 });
  const load = () => api.get("/staff").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/staff", f); toast.success("Added"); setF({...f, email:"", password:""}); load(); }
    catch(e){ toast.error(e.response?.data?.detail || "Failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Staff</h1>
      <form onSubmit={add} className="border border-white/10 p-4 grid md:grid-cols-4 gap-2 mb-6" data-testid="add-staff-form">
        <input required placeholder="First" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})} className="wz-i"/>
        <input required placeholder="Last" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})} className="wz-i"/>
        <input required type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="wz-i"/>
        <input required type="password" placeholder="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} className="wz-i"/>
        <select value={f.role} onChange={e=>setF({...f,role:e.target.value})} className="wz-i"><option>ADMIN</option><option>SERVICE_ADVISOR</option><option>TECHNICIAN</option><option>STAFF</option></select>
        <input type="number" placeholder="Hourly cost" value={f.hourly_cost} onChange={e=>setF({...f,hourly_cost:parseFloat(e.target.value)||0})} className="wz-i"/>
        <input type="number" placeholder="Selling rate" value={f.selling_rate} onChange={e=>setF({...f,selling_rate:parseFloat(e.target.value)||0})} className="wz-i"/>
        <button data-testid="staff-add-btn" className="bg-[#FF3B30] uppercase text-sm font-bold">Add staff</button>
      </form>
      <div className="border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5"><tr><th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Name</th><th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Email</th><th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Role</th><th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Rate</th></tr></thead>
          <tbody>{rows.map(s=>(<tr key={s.id} className="border-t border-white/10"><td className="px-4 py-2">{s.first_name} {s.last_name}</td><td className="px-4 py-2 font-mono text-xs">{s.email}</td><td className="px-4 py-2 text-xs uppercase text-[#FF3B30]">{s.role}</td><td className="px-4 py-2 font-mono">A${s.selling_rate || 135}/h</td></tr>))}</tbody>
        </table>
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
