import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLS = ["ENQUIRY","BOOKED","INSPECTION","ESTIMATE","QUOTE_SENT","AUTHORISED","IN_PROGRESS","WAITING_PARTS","QUALITY_CONTROL","READY_FOR_COLLECTION","COMPLETED"];

function Card({ job }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="border border-white/10 bg-[#141414] p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-[#FF3B30] transition-colors" data-testid={`kanban-card-${job.id}`}>
      <div className="font-mono text-xs text-[#FF3B30]">{job.job_number}</div>
      <div className="text-sm mt-1">{job.customer?.first_name} {job.customer?.last_name}</div>
      <div className="text-xs text-zinc-500 mt-0.5 font-mono">{job.vehicle?.make} {job.vehicle?.model} · {job.vehicle?.registration || "—"}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{job.job_type}</div>
    </div>
  );
}

function Column({ status, jobs, onMoveTo }) {
  return (
    <div className="w-64 shrink-0 border border-white/10 bg-black/40 flex flex-col" data-testid={`kanban-col-${status}`}>
      <div className="p-3 border-b border-white/10 flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-widest text-[#FF3B30]">{status.replace(/_/g,' ')}</div>
        <div className="font-mono text-xs text-zinc-500">{jobs.length}</div>
      </div>
      <div className="p-2 min-h-[120px]" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{const id=e.dataTransfer.getData("id"); if(id) onMoveTo(id, status);}}>
        <SortableContext items={jobs.map(j=>j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map(j => (
            <div key={j.id} draggable onDragStart={(e)=>e.dataTransfer.setData("id", j.id)}>
              <Card job={j} />
            </div>
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function OSJobsKanban() {
  const [jobs, setJobs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ customer_id:"", vehicle_id:"", job_type:"MECHANICAL", private_or_insurance:"PRIVATE", priority:"NORMAL", notes:"" });
  const [vehicles, setVehicles] = useState([]);
  const sensors = useSensors(useSensor(PointerSensor));

  const load = () => api.get("/jobs").then(r => setJobs(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); }, []);
  useEffect(() => { if (f.customer_id) api.get("/vehicles", { params: { customer_id: f.customer_id } }).then(r=>setVehicles(r.data)); }, [f.customer_id]);

  const moveTo = async (id, status) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
    try { await api.patch(`/jobs/${id}/status`, { status }); toast.success("Moved"); }
    catch { toast.error("Failed"); load(); }
  };

  const createJob = async (e) => {
    e.preventDefault();
    try { await api.post("/jobs", f); toast.success("Job created"); setShowCreate(false); setF({customer_id:"",vehicle_id:"",job_type:"MECHANICAL",private_or_insurance:"PRIVATE",priority:"NORMAL",notes:""}); load(); }
    catch(e){ toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display text-4xl">Jobs Kanban</h1>
        <button data-testid="new-job-btn" onClick={()=>setShowCreate(true)} className="px-4 py-2 bg-[#FF3B30] hover:bg-[#FF5B52] uppercase text-sm font-bold">+ New job</button>
      </div>

      {showCreate && (
        <form onSubmit={createJob} className="border border-white/10 p-5 mb-6 grid md:grid-cols-6 gap-3" data-testid="new-job-form">
          <select required data-testid="job-customer" value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value,vehicle_id:""})} className="wz-i"><option value="">Customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
          <select required data-testid="job-vehicle" value={f.vehicle_id} onChange={e=>setF({...f,vehicle_id:e.target.value})} className="wz-i"><option value="">Vehicle...</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} {v.registration}</option>)}</select>
          <select data-testid="job-type" value={f.job_type} onChange={e=>setF({...f,job_type:e.target.value})} className="wz-i"><option>MECHANICAL</option><option>PAINT</option><option>PANEL</option><option>SMASH</option><option>INSPECTION</option></select>
          <select data-testid="job-priv-ins" value={f.private_or_insurance} onChange={e=>setF({...f,private_or_insurance:e.target.value})} className="wz-i"><option>PRIVATE</option><option>INSURANCE</option></select>
          <input placeholder="Notes" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} className="wz-i md:col-span-2"/>
          <button data-testid="job-create-submit" className="bg-[#FF3B30] hover:bg-[#FF5B52] uppercase text-sm font-bold md:col-span-1">Create</button>
          <button type="button" onClick={()=>setShowCreate(false)} className="border border-white/20 uppercase text-sm md:col-span-1">Cancel</button>
        </form>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners}>
        <div className="flex gap-3 overflow-x-auto pb-4" data-testid="kanban-board">
          {COLS.map(s => <Column key={s} status={s} jobs={jobs.filter(j=>j.status===s)} onMoveTo={moveTo} />)}
        </div>
      </DndContext>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
