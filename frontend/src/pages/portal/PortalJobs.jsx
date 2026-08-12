import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function PortalJobs() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/jobs").then(r => setRows(r.data)); }, []);
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Jobs</h1>
      <div className="space-y-2">
        {rows.map(j => (
          <div key={j.id} className="border border-white/10 p-4" data-testid={`job-row-${j.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="font-display text-xl">{j.job_number} · {j.job_type}</div>
              <div className="text-xs uppercase tracking-widest text-[#FF3B30]">{j.status}</div>
            </div>
            <div className="text-xs text-zinc-500 font-mono">{j.vehicle?.year || ""} {j.vehicle?.make} {j.vehicle?.model} · {j.vehicle?.registration}</div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No jobs yet.</div>}
      </div>
    </div>
  );
}
