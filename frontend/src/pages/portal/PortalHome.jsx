import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { Link } from "react-router-dom";

export default function PortalHome() {
  const user = getUser();
  const [d, setD] = useState({ vehicles: 0, bookings: 0, jobs: 0, quotes: 0, invoices: 0 });
  useEffect(() => {
    (async () => {
      const [v, b, j, q, i] = await Promise.all([
        api.get("/vehicles"), api.get("/bookings"), api.get("/jobs"), api.get("/quotes"), api.get("/invoices"),
      ]);
      setD({ vehicles: v.data.length, bookings: b.data.length, jobs: j.data.length, quotes: q.data.length, invoices: i.data.length });
    })();
  }, []);
  const tiles = [
    { k: "Vehicles", v: d.vehicles, to: "/portal/vehicles" },
    { k: "Bookings", v: d.bookings, to: "/portal/bookings" },
    { k: "Jobs", v: d.jobs, to: "/portal/jobs" },
    { k: "Quotes", v: d.quotes, to: "/portal/quotes" },
    { k: "Invoices", v: d.invoices, to: "/portal/invoices" },
  ];
  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// MY GARAGE</div>
      <h1 className="font-display text-4xl mb-8">Welcome back, {user?.first_name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tiles.map(t => (
          <Link key={t.k} to={t.to} className="border border-white/10 p-6 hover:border-[#B5FF2E] transition-colors" data-testid={`portal-tile-${t.k.toLowerCase()}`}>
            <div className="text-xs uppercase tracking-widest text-zinc-400">{t.k}</div>
            <div className="font-display text-4xl mt-2">{t.v}</div>
          </Link>
        ))}
      </div>
      <div className="mt-10 border border-white/10 p-6 flex items-center justify-between">
        <div><div className="font-display text-xl">Need to book something?</div><div className="text-sm text-zinc-400">Or get an instant AI quote from a photo.</div></div>
        <div className="flex gap-2"><Link to="/book" className="px-5 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold">Book</Link><Link to="/quote" className="px-5 py-2 border border-white/20 uppercase text-sm font-bold">AI quote</Link></div>
      </div>
    </div>
  );
}
