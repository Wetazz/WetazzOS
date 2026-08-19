import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function OSLeads() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/leads").then(r=>setRows(r.data)); }, []);
  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// PIPELINE</div>
      <h1 className="font-display text-4xl mb-6">Leads</h1>
      <div className="border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5"><tr>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Date</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Customer</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Source</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Subject</th>
            <th className="text-left px-4 py-2 uppercase text-xs text-zinc-400 tracking-widest">Stage</th>
          </tr></thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-t border-white/10 hover:bg-white/5" data-testid={`lead-row-${l.id}`}>
                <td className="px-4 py-2 font-mono text-xs">{new Date(l.created_at).toLocaleDateString("en-AU")}</td>
                <td className="px-4 py-2">{l.customer && <Link to={`/os/customers/${l.customer_id}`} className="hover:text-[#B5FF2E]">{l.customer.first_name} {l.customer.last_name}</Link>}<div className="text-[10px] font-mono text-zinc-500">{l.customer?.email||l.customer?.phone}</div></td>
                <td className="px-4 py-2 text-xs uppercase">{l.source}</td>
                <td className="px-4 py-2 text-xs">{l.subject||l.enquiry?.slice(0,60)}</td>
                <td className="px-4 py-2 text-xs uppercase text-[#B5FF2E]">{l.stage}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-zinc-500">No leads yet. Public bookings and Contact form enquiries land here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
