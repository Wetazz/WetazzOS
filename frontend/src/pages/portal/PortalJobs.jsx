import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function JobRow({ j }) {
  const [photos, setPhotos] = useState([]);
  const [open, setOpen] = useState(false);
  const loadP = async () => { if (!photos.length) { const r = await api.get(`/jobs/${j.id}/photos`); setPhotos(r.data); } setOpen(!open); };
  return (
    <div className="border border-white/10 p-4" data-testid={`job-row-${j.id}`}>
      <div className="flex items-baseline justify-between">
        <div className="font-display text-xl">{j.job_number} · {j.job_type}</div>
        <div className="text-xs uppercase tracking-widest text-[#B5FF2E]">{j.status}</div>
      </div>
      <div className="text-xs text-zinc-500 font-mono">{j.vehicle?.year || ""} {j.vehicle?.make} {j.vehicle?.model} · {j.vehicle?.registration}</div>
      <button onClick={loadP} className="mt-2 text-xs uppercase tracking-widest text-[#B5FF2E]" data-testid={`portal-photos-${j.id}`}>{open?"Hide":"View"} photos</button>
      {open && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {photos.map(p => <img key={p.id} src={`data:image/jpeg;base64,${p.image_base64}`} className="w-full h-24 object-cover border border-white/10" alt=""/>)}
          {!photos.length && <div className="col-span-6 text-zinc-500 text-xs">No photos yet.</div>}
        </div>
      )}
    </div>
  );
}

export default function PortalJobs() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/jobs").then(r => setRows(r.data)); }, []);
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Jobs</h1>
      <div className="space-y-2">
        {rows.map(j => <JobRow key={j.id} j={j} />)}
        {!rows.length && <div className="text-zinc-500">No jobs yet.</div>}
      </div>
    </div>
  );
}
