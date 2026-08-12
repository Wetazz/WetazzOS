import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function OSBookings() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/bookings").then(r => setRows(r.data)); }, []);
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
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Status</th>
          </tr></thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-t border-white/10 hover:bg-white/5" data-testid={`os-booking-${b.id}`}>
                <td className="px-4 py-2 font-mono text-xs">{b.preferred_date} · {b.preferred_time}</td>
                <td className="px-4 py-2">{b.customer?.first_name} {b.customer?.last_name}</td>
                <td className="px-4 py-2">{b.booking_type}</td>
                <td className="px-4 py-2">{b.service_type}</td>
                <td className="px-4 py-2 text-xs uppercase text-[#FF3B30]">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
