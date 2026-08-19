import { useEffect, useState } from "react";
import { api, API } from "@/lib/api";
import { FileText } from "lucide-react";

export default function PortalDocuments() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/me/documents").then(r => setRows(r.data)); }, []);
  const download = (id, name) => {
    const token = localStorage.getItem("wz_token");
    fetch(`${API}/documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.blob()).then(b=>{ const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); });
  };
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-4xl mb-6">My Documents</h1>
      <div className="text-xs text-zinc-500 mb-4">Every file we&apos;ve shared with you across your vehicles, jobs, quotes and invoices.</div>
      <div className="space-y-1">
        {rows.map(d => (
          <button key={d.id} onClick={()=>download(d.id, d.filename)} className="w-full flex items-center justify-between border border-white/10 p-3 text-left hover:border-[#B5FF2E]" data-testid={`pd-${d.id}`}>
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-[#B5FF2E]"/>
              <div>
                <div className="text-sm">{d.filename}</div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase">{d.entity_type} · {d.label||"—"}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-zinc-500">{(d.size_bytes/1024).toFixed(0)}KB · {new Date(d.created_at).toLocaleDateString("en-AU")}</div>
          </button>
        ))}
        {!rows.length && <div className="text-zinc-500 text-sm">No documents yet.</div>}
      </div>
    </div>
  );
}
