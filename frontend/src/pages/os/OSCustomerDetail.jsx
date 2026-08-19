import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import DocumentVault from "@/components/DocumentVault";

const TABS = ["Overview","Vehicles","Bookings","Jobs","Quotes","Invoices","Payments","Messages","Documents","Reviews"];

export default function OSCustomerDetail() {
  const { cid } = useParams();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({});

  const load = () => api.get(`/customers/${cid}`).then(r => { setC(r.data); setF(r.data); });
  useEffect(() => { load(); }, [cid]);
  if (!c) return <div className="p-8 text-zinc-500">Loading...</div>;

  const save = async () => {
    try {
      await api.patch(`/customers/${cid}`, {
        first_name: f.first_name, last_name: f.last_name, business_name: f.business_name,
        email: f.email, phone: f.phone, address: f.address,
        preferred_contact: f.preferred_contact, notes: f.notes, status: f.status,
      });
      toast.success("Customer updated"); setEdit(false); load();
    } catch { toast.error("Failed"); }
  };

  const totals = {
    lifetime: c.invoices.reduce((s,i)=>s+(i.amount_paid||0),0),
    outstanding: c.invoices.reduce((s,i)=>s+(i.balance||0),0),
    deposits: (c.payments||[]).filter(p=>p.kind==="DEPOSIT" && p.payment_status==="paid").reduce((s,p)=>s+p.amount,0),
  };

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/os/customers" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-[#B5FF2E] mb-3" data-testid="cd-back"><ArrowLeft size={12}/> Back to customers</Link>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-1">// CUSTOMER · {c.status}</div>
          <h1 className="font-display text-4xl">{c.first_name} {c.last_name}</h1>
          {c.business_name && <div className="text-zinc-400">{c.business_name}</div>}
        </div>
        <button onClick={()=>setEdit(!edit)} className="px-4 py-2 border border-white/20 uppercase text-xs" data-testid="cd-edit-btn">{edit?"Cancel":"Edit"}</button>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mt-6">
        <Metric k="Lifetime value" v={`A$${totals.lifetime.toFixed(2)}`} />
        <Metric k="Outstanding" v={`A$${totals.outstanding.toFixed(2)}`} />
        <Metric k="Deposits paid" v={`A$${totals.deposits.toFixed(2)}`} />
        <Metric k="Vehicles" v={c.vehicles.length} />
      </div>

      {edit ? (
        <div className="border border-white/10 p-5 mt-6 grid md:grid-cols-3 gap-3" data-testid="cd-edit-form">
          <Input k="First name" v={f.first_name} on={v=>setF({...f,first_name:v})} testid="cd-first" />
          <Input k="Last name" v={f.last_name} on={v=>setF({...f,last_name:v})} testid="cd-last" />
          <Input k="Business name" v={f.business_name||""} on={v=>setF({...f,business_name:v})} testid="cd-business" />
          <Input k="Email" v={f.email||""} on={v=>setF({...f,email:v})} testid="cd-email" />
          <Input k="Phone" v={f.phone||""} on={v=>setF({...f,phone:v})} testid="cd-phone" />
          <Input k="Address" v={f.address||""} on={v=>setF({...f,address:v})} testid="cd-address" />
          <div className="col-span-1">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Preferred contact</div>
            <select className="wz-i w-full" value={f.preferred_contact||"EMAIL"} onChange={e=>setF({...f,preferred_contact:e.target.value})}>
              <option>SMS</option><option>EMAIL</option><option>PHONE</option>
            </select>
          </div>
          <div className="col-span-1">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Status</div>
            <select className="wz-i w-full" value={f.status||"ACTIVE"} onChange={e=>setF({...f,status:e.target.value})}>
              <option>ACTIVE</option><option>LEAD</option><option>DORMANT</option><option>BLOCKED</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Notes</div>
            <textarea rows={3} className="wz-i w-full" value={f.notes||""} onChange={e=>setF({...f,notes:e.target.value})} data-testid="cd-notes"/>
          </div>
          <button onClick={save} className="md:col-span-3 flex items-center justify-center gap-2 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black uppercase text-sm font-bold py-2" data-testid="cd-save"><Save size={14}/> Save</button>
        </div>
      ) : (
        <div className="border border-white/10 p-5 mt-6 grid md:grid-cols-3 gap-4 text-sm">
          <Info k="Email" v={c.email || "—"} />
          <Info k="Phone" v={c.phone || "—"} />
          <Info k="Preferred" v={c.preferred_contact || "—"} />
          <Info k="Address" v={c.address || "—"} />
          <Info k="Type" v={c.customer_type || "—"} />
          <Info k="Created" v={new Date(c.created_at).toLocaleDateString("en-AU")} />
          {c.notes && <div className="md:col-span-3"><div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Notes</div><div className="text-zinc-300">{c.notes}</div></div>}
        </div>
      )}

      <div className="flex gap-1 border-b border-white/10 mt-8 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)} data-testid={`cd-tab-${t.toLowerCase()}`}
            className={`px-4 py-2 text-xs uppercase tracking-widest ${tab===t?"text-[#B5FF2E] border-b-2 border-[#B5FF2E]":"text-zinc-400 hover:text-white"}`}>
            {t} <span className="text-zinc-600 ml-1">{
              t==="Vehicles"?c.vehicles.length : t==="Jobs"?c.jobs.length : t==="Quotes"?c.quotes.length :
              t==="Invoices"?c.invoices.length : t==="Bookings"?c.bookings.length : t==="Messages"?c.communications.length :
              t==="Reviews"?c.reviews.length : t==="Payments"?(c.payments||[]).length : ""}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab==="Overview" && (
          <div className="space-y-3">
            <SectionList title="Recent bookings" rows={c.bookings.slice(0,3)} render={b=>`${b.preferred_date} ${b.preferred_time} · ${b.booking_type} · ${b.status}`} />
            <SectionList title="Recent jobs" rows={c.jobs.slice(0,3)} render={j=>`${j.job_number} · ${j.job_type} · ${j.status}`} />
            <SectionList title="Recent quotes" rows={c.quotes.slice(0,3)} render={q=>`${q.quote_number} · A$${q.total?.toFixed(2)} · ${q.status}`} />
            <SectionList title="Recent invoices" rows={c.invoices.slice(0,3)} render={i=>`${i.invoice_number} · A$${i.total?.toFixed(2)} · balance A$${i.balance?.toFixed(2)} · ${i.status}`} />
          </div>
        )}
        {tab==="Vehicles" && <div className="grid md:grid-cols-3 gap-3">{c.vehicles.map(v=>(
          <Link key={v.id} to={`/os/vehicles/${v.id}`} className="border border-white/10 hover:border-[#B5FF2E] p-4 block" data-testid={`cd-veh-${v.id}`}>
            <div className="font-display">{v.year||""} {v.make} {v.model}</div>
            <div className="font-mono text-xs text-[#B5FF2E] mt-1">{v.registration||"NO REGO"}</div>
          </Link>
        ))}{!c.vehicles.length && <div className="text-zinc-500 text-sm">No vehicles.</div>}</div>}
        {tab==="Bookings" && <List rows={c.bookings} render={b=>`${b.preferred_date} · ${b.preferred_time} · ${b.booking_type} · ${b.service_type} · ${b.status}`} test="cd-booking" />}
        {tab==="Jobs" && <List rows={c.jobs} render={j=>`${j.job_number} · ${j.job_type} · ${j.status}`} link={j=>`/os/jobs/${j.id}`} test="cd-job"/>}
        {tab==="Quotes" && <List rows={c.quotes} render={q=>`${q.quote_number} · A$${q.total?.toFixed(2)} · ${q.status}`} test="cd-quote"/>}
        {tab==="Invoices" && <List rows={c.invoices} render={i=>`${i.invoice_number} · A$${i.total?.toFixed(2)} · balance A$${i.balance?.toFixed(2)} · ${i.status}`} test="cd-invoice"/>}
        {tab==="Payments" && <List rows={c.payments||[]} render={p=>`${p.kind} · A$${p.amount?.toFixed(2)} · ${p.payment_status}`} test="cd-payment"/>}
        {tab==="Messages" && <div className="space-y-2">{c.communications.map(m=>(
          <div key={m.id} className="border border-white/10 p-3" data-testid={`cd-msg-${m.id}`}>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-zinc-400 font-mono">{m.channel} · {m.direction} · {m.workflow_kind||"MANUAL"}</div>
              <div className="text-[10px] font-mono text-zinc-500">{new Date(m.created_at).toLocaleString("en-AU")}</div>
            </div>
            {m.subject && <div className="text-sm font-bold mt-1">{m.subject}</div>}
            <div className="text-sm text-zinc-300 mt-1">{m.body}</div>
            {m.status === "NOT_CONFIGURED" && <div className="mt-2 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#FF2E93] text-[#FF2E93]">Not sent · Provider NOT CONFIGURED</div>}
            {m.status === "QUEUED" && <div className="mt-2 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 border border-[#B5FF2E]/30 text-[#B5FF2E]">Queued</div>}
          </div>
        ))}{!c.communications.length && <div className="text-zinc-500 text-sm">No messages yet.</div>}</div>}
        {tab==="Documents" && <DocumentVault entityType="customer" entityId={cid} />}
        {tab==="Reviews" && <List rows={c.reviews} render={r=>`${r.status} · ${r.rating?"★".repeat(r.rating):"pending"} · ${r.feedback||"—"}`} test="cd-review"/>}
      </div>

      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.85rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}

function Metric({k,v}){return(<div className="border border-white/10 p-4"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="font-mono text-2xl mt-1 text-[#B5FF2E]">{v}</div></div>);}
function Info({k,v}){return(<div><div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{k}</div><div className="text-zinc-200">{v}</div></div>);}
function Input({k,v,on,testid}){return(<div><div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">{k}</div><input className="wz-i w-full" value={v} onChange={e=>on(e.target.value)} data-testid={testid}/></div>);}
function List({rows,render,link,test}){return(<div className="space-y-1">{rows.map(r=>{const el=(<div key={r.id} className="border border-white/10 p-3 text-sm hover:border-[#B5FF2E]" data-testid={`${test}-${r.id}`}>{render(r)}</div>);return link?<Link key={r.id} to={link(r)}>{el}</Link>:el;})}{!rows.length && <div className="text-zinc-500 text-sm">None yet.</div>}</div>);}
function SectionList({title,rows,render}){return(<div className="border border-white/10 p-4"><div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">{title}</div>{rows.length?rows.map(r=><div key={r.id} className="text-sm text-zinc-300 py-0.5">{render(r)}</div>):<div className="text-zinc-600 text-xs">None yet.</div>}</div>);}
