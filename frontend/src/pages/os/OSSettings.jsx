import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { toast } from "sonner";
import { Building2, MapPin, FileText, Star, Trash2 } from "lucide-react";

export default function OSSettings() {
  const user = getUser();
  const canEdit = ["OWNER", "ADMIN"].includes(user?.role);
  const [s, setS] = useState(null);
  const [locations, setLocations] = useState([]);
  const [nl, setNl] = useState({ name:"", address:"", suburb:"", state:"NSW", postcode:"", phone:"", is_primary:false });

  const loadLoc = () => api.get("/locations").then(r => setLocations(r.data));
  useEffect(() => { api.get("/settings").then(r => setS(r.data)); loadLoc(); }, []);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  const saveSettings = async () => {
    try { const r = await api.patch("/settings", s); setS(r.data); toast.success("Settings saved"); }
    catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
  };
  const addLocation = async (e) => {
    e.preventDefault();
    if (!nl.name.trim()) { toast.error("Location name required"); return; }
    try { await api.post("/locations", nl); toast.success("Location added"); setNl({ name:"", address:"", suburb:"", state:"NSW", postcode:"", phone:"", is_primary:false }); loadLoc(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const makePrimary = async (id) => { await api.patch(`/locations/${id}`, { is_primary: true }); loadLoc(); };
  const removeLoc = async (id) => { await api.delete(`/locations/${id}`); toast.success("Location removed"); loadLoc(); };

  if (!s) return <div className="p-8 text-zinc-500">Loading settings…</div>;

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <h1 className="font-display text-4xl">Settings</h1>

      <section data-testid="settings-business">
        <div className="flex items-center gap-2 text-[#B5FF2E] uppercase text-xs tracking-widest mb-4"><Building2 size={14}/> Business identity</div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Business name" v={s.business_name} onChange={set("business_name")} tid="set-name" disabled={!canEdit}/>
          <Field label="ABN" v={s.abn} onChange={set("abn")} tid="set-abn" disabled={!canEdit}/>
          <Field label="Phone" v={s.phone} onChange={set("phone")} tid="set-phone" disabled={!canEdit}/>
          <Field label="Email (document sender)" v={s.email} onChange={set("email")} tid="set-email" disabled={!canEdit}/>
          <Field label="Address" v={s.address} onChange={set("address")} tid="set-address" disabled={!canEdit}/>
          <Field label="Website" v={s.website} onChange={set("website")} tid="set-website" disabled={!canEdit}/>
        </div>
      </section>

      <section data-testid="settings-terms">
        <div className="flex items-center gap-2 text-[#B5FF2E] uppercase text-xs tracking-widest mb-4"><FileText size={14}/> Terms &amp; conditions (used on documents)</div>
        <TermsArea label="Quote terms" v={s.terms_quote} onChange={set("terms_quote")} tid="set-terms-quote" disabled={!canEdit}/>
        <TermsArea label="Invoice terms" v={s.terms_invoice} onChange={set("terms_invoice")} tid="set-terms-invoice" disabled={!canEdit}/>
        <TermsArea label="Release form terms" v={s.terms_release} onChange={set("terms_release")} tid="set-terms-release" disabled={!canEdit}/>
      </section>

      {canEdit && <button data-testid="settings-save" onClick={saveSettings} className="px-6 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold">Save settings</button>}

      <section data-testid="settings-locations">
        <div className="flex items-center gap-2 text-[#B5FF2E] uppercase text-xs tracking-widest mb-4"><MapPin size={14}/> Workshop locations</div>
        <div className="space-y-2 mb-6">
          {locations.map(l => (
            <div key={l.id} className="border border-white/10 p-4 flex items-center justify-between" data-testid={`location-${l.id}`}>
              <div>
                <div className="font-display text-lg flex items-center gap-2">{l.name} {l.is_primary && <span className="text-[10px] bg-[#B5FF2E]/20 text-[#B5FF2E] px-2 py-0.5 uppercase tracking-widest">Primary</span>}</div>
                <div className="text-xs text-zinc-500 font-mono">{[l.address, l.suburb, l.state, l.postcode].filter(Boolean).join(", ")}</div>
              </div>
              {canEdit && <div className="flex items-center gap-2">
                {!l.is_primary && <button data-testid={`loc-primary-${l.id}`} onClick={()=>makePrimary(l.id)} className="px-2 py-1 border border-white/20 hover:border-[#B5FF2E] uppercase text-xs flex items-center gap-1"><Star size={12}/> Set primary</button>}
                {!l.is_primary && <button data-testid={`loc-remove-${l.id}`} onClick={()=>removeLoc(l.id)} className="px-2 py-1 border border-white/20 hover:border-[#FF2E93] text-zinc-400 hover:text-[#FF2E93]"><Trash2 size={12}/></button>}
              </div>}
            </div>
          ))}
          {!locations.length && <div className="text-zinc-500 text-sm">No locations configured.</div>}
        </div>
        {canEdit && (
          <form onSubmit={addLocation} className="border border-white/10 p-4 grid md:grid-cols-3 gap-3" data-testid="add-location-form">
            <input placeholder="Name *" value={nl.name} onChange={e=>setNl({...nl,name:e.target.value})} className="wz-i" data-testid="loc-name"/>
            <input placeholder="Street address" value={nl.address} onChange={e=>setNl({...nl,address:e.target.value})} className="wz-i"/>
            <input placeholder="Suburb" value={nl.suburb} onChange={e=>setNl({...nl,suburb:e.target.value})} className="wz-i"/>
            <input placeholder="State" value={nl.state} onChange={e=>setNl({...nl,state:e.target.value})} className="wz-i"/>
            <input placeholder="Postcode" value={nl.postcode} onChange={e=>setNl({...nl,postcode:e.target.value})} className="wz-i"/>
            <input placeholder="Phone" value={nl.phone} onChange={e=>setNl({...nl,phone:e.target.value})} className="wz-i"/>
            <label className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-widest"><input type="checkbox" checked={nl.is_primary} onChange={e=>setNl({...nl,is_primary:e.target.checked})}/> Set as primary</label>
            <button data-testid="loc-add-btn" className="px-4 py-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold md:col-span-1">Add location</button>
          </form>
        )}
      </section>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem;width:100%}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}

function Field({ label, v, onChange, tid, disabled }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <input data-testid={tid} value={v || ""} onChange={onChange} disabled={disabled} className="wz-i disabled:opacity-60"/>
    </div>
  );
}
function TermsArea({ label, v, onChange, tid, disabled }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <textarea data-testid={tid} value={v || ""} onChange={onChange} disabled={disabled} rows={5} className="wz-i disabled:opacity-60 font-mono text-xs"/>
    </div>
  );
}
