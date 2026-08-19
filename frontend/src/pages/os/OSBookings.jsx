import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const STATUSES = ["REQUESTED","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED","REJECTED"];

export default function OSBookings() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({});

  const load = () => api.get("/bookings").then(r => setRows(r.data));
  useEffect(() => { load(); api.get("/staff").then(r=>setStaff(r.data)); }, []);

  const openEdit = (b) => { setEditing(b.id); setF({ status: b.status, assigned_staff_id: b.assigned_staff_id||"", bay: b.bay||"", preferred_date: b.preferred_date, preferred_time: b.preferred_time }); };
  const save = async () => {
    try { await api.patch(`/bookings/${editing}`, f); toast.success("Updated"); setEditing(null); load(); }
    catch(e){ toast.error(e.response?.data?.detail || "Failed"); }
  };
  const quickStatus = async (id, status) => {
    try { await api.patch(`/bookings/${id}`, { status }); toast.success(status); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Bookings</h1>
      <div className="border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5"><tr>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Date/Time</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Customer</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Type</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Service</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Bay</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Status</th>
            <th className="text-right px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Actions</th>
          </tr></thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-t border-white/10 hover:bg-white/5" data-testid={`os-booking-${b.id}`}>
                <td className="px-4 py-2 font-mono text-xs">{b.preferred_date} · {b.preferred_time}</td>
                <td className="px-4 py-2">{b.customer?.first_name} {b.customer?.last_name}</td>
                <td className="px-4 py-2">{b.booking_type}</td>
                <td className="px-4 py-2">{b.service_type}</td>
                <td className="px-4 py-2 text-xs font-mono">{b.bay_kind}{b.bay?` · ${b.bay}`:""}</td>
                <td className="px-4 py-2 text-xs uppercase text-[#B5FF2E]">{b.status}</td>
                <td className="px-4 py-2 text-right">
                  {b.status === "REQUESTED" && <button onClick={()=>quickStatus(b.id, "CONFIRMED")} className="px-2 py-1 bg-[#B5FF2E] text-black uppercase text-[10px] mr-1" data-testid={`bk-confirm-${b.id}`}>Confirm</button>}
                  <button onClick={()=>openEdit(b)} className="px-2 py-1 border border-white/20 uppercase text-[10px]" data-testid={`bk-edit-${b.id}`}>Edit</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="px-4 py-6 text-center text-zinc-500">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={()=>setEditing(null)}>
          <div className="border border-white/10 bg-black p-6 max-w-md w-full space-y-3" onClick={e=>e.stopPropagation()} data-testid="bk-edit-modal">
            <div className="font-display text-xl">Update booking</div>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">Status</div>
              <select className="wz-i w-full" value={f.status} onChange={e=>setF({...f,status:e.target.value})} data-testid="bk-status">
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">Date</div><input type="date" className="wz-i w-full" value={f.preferred_date} onChange={e=>setF({...f,preferred_date:e.target.value})} data-testid="bk-date"/></label>
              <label className="block"><div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">Time</div><input type="time" className="wz-i w-full" value={f.preferred_time} onChange={e=>setF({...f,preferred_time:e.target.value})} data-testid="bk-time"/></label>
            </div>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">Assign staff</div>
              <select className="wz-i w-full" value={f.assigned_staff_id} onChange={e=>setF({...f,assigned_staff_id:e.target.value})} data-testid="bk-staff">
                <option value="">Unassigned</option>
                {staff.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role})</option>)}
              </select>
            </label>
            <label className="block"><div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">Bay label</div><input className="wz-i w-full" value={f.bay} onChange={e=>setF({...f,bay:e.target.value})} data-testid="bk-bay"/></label>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setEditing(null)} className="px-3 py-1 border border-white/20 uppercase text-xs">Cancel</button>
              <button onClick={save} className="px-3 py-1 bg-[#B5FF2E] text-black uppercase text-xs font-bold" data-testid="bk-save">Save</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
