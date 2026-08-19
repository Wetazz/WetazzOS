import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function OSDashboard() {
  const [d, setD] = useState(null);
  const [integ, setInteg] = useState(null);
  useEffect(() => {
    api.get("/analytics/dashboard").then(r => setD(r.data));
    api.get("/integrations/status").then(r => setInteg(r.data)).catch(()=>{});
  }, []);
  if (!d) return <div className="p-8 text-zinc-500">Loading...</div>;

  const tiles = [
    { k: "Open jobs", v: d.open_jobs, to: "/os/jobs" },
    { k: "Ready for collection", v: d.ready_jobs, to: "/os/jobs" },
    { k: "Bookings today", v: d.bookings_today, to: "/os/bookings" },
    { k: "Quotes awaiting", v: d.quotes_awaiting_approval, to: "/os/quotes" },
    { k: "Deposits outstanding", v: `A$${d.deposits_outstanding_amount.toFixed(2)}`, sub:`${d.deposits_outstanding_count} quotes`, to: "/os/quotes" },
    { k: "Receivable", v: `A$${d.outstanding_receivable.toFixed(2)}`, to: "/os/invoices" },
    { k: "Revenue collected", v: `A$${d.revenue_collected.toFixed(2)}`, to: "/os/accounting" },
    { k: "New leads", v: d.new_leads, to: "/os/leads" },
    { k: "Conversion rate", v: `${d.conversion_rate}%`, to: "/os/quotes" },
    { k: "Jobs overdue (>30d)", v: d.jobs_overdue, to: "/os/jobs" },
    { k: "Customers", v: d.customers, to: "/os/customers" },
    { k: "Vehicles", v: d.vehicles, to: "/os/vehicles" },
  ];

  const notConfigured = integ ? Object.entries(integ).filter(([k,v])=>!v.configured).map(([k])=>k) : [];

  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ · CONTROL ROOM</div>
      <h1 className="font-display text-4xl mb-6">Dashboard</h1>

      {integ && notConfigured.length > 0 && (
        <div className="border border-[#FF2E93]/40 bg-[#FF2E93]/5 p-4 mb-6 flex items-start gap-3" data-testid="dash-provider-banner">
          <AlertTriangle size={16} className="text-[#FF2E93] mt-0.5"/>
          <div>
            <div className="text-xs uppercase tracking-widest text-[#FF2E93] font-bold">Providers not configured</div>
            <div className="text-xs text-zinc-400 mt-1">
              {notConfigured.map(k => (
                <span key={k} className="inline-block mr-3 uppercase font-mono">{k}: <span className="text-[#FF2E93]">NOT CONFIGURED</span></span>
              ))}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">System-generated messages for these channels are stored but not sent. Configure via backend .env.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map(t => (
          <Link key={t.k} to={t.to} className="border border-white/10 p-5 hover:border-[#B5FF2E] transition-colors" data-testid={`dash-tile-${t.k.replace(/[^a-z0-9]/gi,'-').toLowerCase()}`}>
            <div className="text-xs uppercase tracking-widest text-zinc-400">{t.k}</div>
            <div className="font-display text-3xl mt-2 text-[#B5FF2E]">{t.v}</div>
            {t.sub && <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{t.sub}</div>}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="border border-white/10 p-6">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Jobs by status</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(d.status_counts).map(([s, c]) => (
              <div key={s} className="border border-white/10 p-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{s.replace(/_/g,' ')}</div>
                <div className="font-mono text-xl">{c}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-white/10 p-6">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Workshop workload</div>
          <div className="space-y-2">
            {Object.entries(d.staff_workload).map(([name, cnt]) => (
              <div key={name} className="flex items-center justify-between border-b border-white/5 py-2">
                <div className="text-sm">{name || "Unassigned"}</div>
                <div className="font-mono text-lg text-[#B5FF2E]">{cnt} <span className="text-xs text-zinc-500">open</span></div>
              </div>
            ))}
            {!Object.keys(d.staff_workload).length && <div className="text-zinc-500 text-sm">No staff yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
