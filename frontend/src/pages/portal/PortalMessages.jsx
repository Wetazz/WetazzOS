import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PortalMessages() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/me/messages").then(r => setRows(r.data)); }, []);
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-4xl mb-6">My Messages</h1>
      <div className="text-xs text-zinc-500 mb-4">Every SMS, email, phone note and in-app message we&apos;ve exchanged.</div>
      <div className="space-y-2">
        {rows.map(m => (
          <div key={m.id} className={`border p-4 ${m.direction==="IN"?"border-[#FF2E93]/40":"border-white/10"}`} data-testid={`pm-${m.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-mono text-zinc-400">{m.channel} · {m.direction==="IN"?"From you":"From Wetazz"} · {m.workflow_kind||"MANUAL"}</div>
              <div className="text-[10px] font-mono text-zinc-500">{new Date(m.created_at).toLocaleString("en-AU")}</div>
            </div>
            {m.subject && <div className="text-sm font-bold mt-1">{m.subject}</div>}
            <div className="text-sm text-zinc-200 mt-1 whitespace-pre-line">{m.body}</div>
            {m.status === "NOT_CONFIGURED" && <div className="mt-2 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#FF2E93] text-[#FF2E93]">Awaiting provider setup</div>}
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500 text-sm">No messages yet.</div>}
      </div>
    </div>
  );
}
