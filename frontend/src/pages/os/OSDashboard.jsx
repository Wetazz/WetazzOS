import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function OSDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/analytics/dashboard").then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-8 text-zinc-500">Loading...</div>;
  const tiles = [
    { k: "Open jobs", v: d.open_jobs },
    { k: "Ready for collection", v: d.ready_jobs },
    { k: "Bookings today", v: d.bookings_today },
    { k: "Receivable", v: `A$${d.outstanding_receivable.toFixed(2)}` },
    { k: "Revenue collected", v: `A$${d.revenue_collected.toFixed(2)}` },
    { k: "Customers", v: d.customers },
    { k: "Vehicles", v: d.vehicles },
  ];
  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ · CONTROL ROOM</div>
      <h1 className="font-display text-4xl mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map(t => (
          <div key={t.k} className="border border-white/10 p-5" data-testid={`dash-tile-${t.k.replace(/ /g,'-').toLowerCase()}`}>
            <div className="text-xs uppercase tracking-widest text-zinc-400">{t.k}</div>
            <div className="font-display text-3xl mt-2 text-[#B5FF2E]">{t.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 border border-white/10 p-6">
        <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Jobs by status</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(d.status_counts).map(([s, c]) => (
            <div key={s} className="border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">{s.replace(/_/g,' ')}</div>
              <div className="font-mono text-xl">{c}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
