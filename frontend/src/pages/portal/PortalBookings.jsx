import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function PortalBookings() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/bookings").then(r => setRows(r.data)); }, []);
  return (
    <div className="p-8">
      <h1 className="font-display text-4xl mb-6">My Bookings</h1>
      <div className="space-y-2">
        {rows.map(b => (
          <div key={b.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`booking-row-${b.id}`}>
            <div><div className="font-display text-xl">{b.booking_type}</div><div className="text-xs text-zinc-500 font-mono">{b.preferred_date} · {b.preferred_time}</div></div>
            <div className="text-xs uppercase tracking-widest text-[#B5FF2E]">{b.status}</div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500">No bookings yet.</div>}
      </div>
    </div>
  );
}
