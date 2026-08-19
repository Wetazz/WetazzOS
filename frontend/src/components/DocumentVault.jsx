import { useEffect, useState, useRef } from "react";
import { api, API } from "@/lib/api";
import { toast } from "sonner";
import { Upload, FileText, Trash2 } from "lucide-react";

export default function DocumentVault({ entityType, entityId, canDelete = true }) {
  const [rows, setRows] = useState([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/documents", { params: { entity_type: entityType, entity_id: entityId }}).then(r => setRows(r.data));
  useEffect(() => { if (entityId) load(); }, [entityType, entityId]);

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 15*1024*1024) return toast.error("Max 15MB");
    setBusy(true);
    const r = new FileReader();
    r.onload = async () => {
      const b64 = r.result.split(",")[1];
      try {
        await api.post("/documents", { entity_type: entityType, entity_id: entityId, filename: file.name, mime_type: file.type, label, content_base64: b64 });
        toast.success("Uploaded"); setLabel(""); load();
      } catch(e){ toast.error(e.response?.data?.detail || "Upload failed"); }
      setBusy(false);
    };
    r.readAsDataURL(file);
  };

  const del = async (id) => { if (!confirm("Delete this document?")) return; await api.delete(`/documents/${id}`); load(); };
  const download = (id, name) => {
    const token = localStorage.getItem("wz_token");
    fetch(`${API}/documents/${id}/download`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.blob()).then(b=>{ const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); });
  };

  return (
    <div className="border border-white/10 p-5" data-testid={`doc-vault-${entityType}-${entityId}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-zinc-400">Documents · {rows.length}</div>
        <div className="flex items-center gap-2">
          <input placeholder="Label (optional)" value={label} onChange={e=>setLabel(e.target.value)} className="bg-[#0f0f10] border border-white/10 px-2 py-1 text-xs" data-testid="doc-label"/>
          <button onClick={()=>fileRef.current?.click()} disabled={busy} className="flex items-center gap-2 px-3 py-1.5 border border-[#B5FF2E] text-[#B5FF2E] hover:bg-[#B5FF2E] hover:text-black uppercase text-xs disabled:opacity-50" data-testid="doc-upload-btn"><Upload size={14}/> {busy?"Uploading...":"Upload"}</button>
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} data-testid="doc-file-input"/>
        </div>
      </div>
      <div className="space-y-1">
        {rows.map(d => (
          <div key={d.id} className="flex items-center justify-between border-b border-white/5 py-2" data-testid={`doc-row-${d.id}`}>
            <button onClick={()=>download(d.id, d.filename)} className="flex items-center gap-2 text-sm hover:text-[#B5FF2E]"><FileText size={14}/> {d.filename}{d.label && <span className="text-zinc-500 text-xs">· {d.label}</span>}</button>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <span>{(d.size_bytes/1024).toFixed(0)}KB</span>
              <span>{new Date(d.created_at).toLocaleDateString("en-AU")}</span>
              {canDelete && <button onClick={()=>del(d.id)} className="text-zinc-500 hover:text-[#FF2E93]" data-testid={`doc-delete-${d.id}`}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-zinc-500 text-sm py-3">No documents yet.</div>}
      </div>
    </div>
  );
}
