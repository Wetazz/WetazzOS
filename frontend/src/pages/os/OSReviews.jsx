import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Star } from "lucide-react";
export default function OSReviews() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [f, setF] = useState({ customer_id:"", job_id:"" });
  const load = () => api.get("/reviews").then(r=>setRows(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); api.get("/jobs").then(r=>setJobs(r.data)); }, []);
  const send = async (e) => {
    e.preventDefault();
    try { await api.post("/reviews/request", f); toast.success("Review request created"); load(); }
    catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">Reviews</h1>
      <form onSubmit={send} className="border border-white/10 p-4 grid md:grid-cols-4 gap-2 mb-6" data-testid="review-req-form">
        <select required value={f.customer_id} onChange={e=>setF({...f,customer_id:e.target.value})} className="wz-i"><option value="">Customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select>
        <select required value={f.job_id} onChange={e=>setF({...f,job_id:e.target.value})} className="wz-i"><option value="">Job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.job_number}</option>)}</select>
        <button data-testid="review-req-submit" className="bg-[#FF3B30] uppercase text-sm font-bold">Request review</button>
      </form>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`review-row-${r.id}`}>
            <div>
              <div className="text-sm">{r.customer?.first_name} {r.customer?.last_name}</div>
              <div className="text-[10px] font-mono text-zinc-500">{r.status} · Requested {new Date(r.requested_at).toLocaleDateString()}</div>
              {r.feedback && <div className="text-sm text-zinc-300 mt-1">"{r.feedback}"</div>}
            </div>
            <div className="flex items-center gap-1">
              {r.rating ? Array.from({length: 5}).map((_,i)=><Star key={i} size={16} className={i<r.rating? "text-[#FF3B30] fill-[#FF3B30]":"text-zinc-700"} />) : <span className="text-xs text-zinc-500 uppercase">Pending</span>}
            </div>
          </div>
        ))}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.5rem .7rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
