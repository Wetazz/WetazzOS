import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import DocumentVault from "@/components/DocumentVault";

const TABS = ["Overview","Jobs","Quotes","Invoices","Bookings","Photos","Communications","Documents"];

export default function OSVehicleDetail() {
  const { vid } = useParams();
  const [v, setV] = useState(null);
  const [tab, setTab] = useState("Overview");
  useEffect(() => { api.get(`/vehicles/${vid}`).then(r=>setV(r.data)); }, [vid]);
  if (!v) return <div className="p-8 text-zinc-500">Loading...</div>;
  return (
    <div className="p-8 max-w-6xl">
      <Link to="/os/vehicles" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-[#B5FF2E] mb-3" data-testid="vd-back"><ArrowLeft size={12}/> Back</Link>
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-1">// VEHICLE · {v.verification}</div>
      <h1 className="font-display text-4xl">{v.year||""} {v.make} {v.model} {v.variant}</h1>
      <div className="font-mono text-sm text-zinc-400">Rego {v.registration||"—"} · VIN {v.vin||"—"} · Colour {v.colour||"—"}{v.paint_code?` (${v.paint_code})`:""}</div>
      {v.customer && <div className="mt-1 text-sm">Owner: <Link to={`/os/customers/${v.customer.id}`} className="text-[#B5FF2E] hover:underline" data-testid="vd-owner-link">{v.customer.first_name} {v.customer.last_name}</Link></div>}

      <div className="grid md:grid-cols-4 gap-3 mt-6">
        <Metric k="Total jobs" v={v.jobs.length} />
        <Metric k="Quotes" v={v.quotes.length} />
        <Metric k="Invoices" v={v.invoices.length} />
        <Metric k="Photos on file" v={v.photos.length} />
      </div>

      <div className="flex gap-1 border-b border-white/10 mt-8 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)} data-testid={`vd-tab-${t.toLowerCase()}`}
            className={`px-4 py-2 text-xs uppercase tracking-widest ${tab===t?"text-[#B5FF2E] border-b-2 border-[#B5FF2E]":"text-zinc-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab==="Overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card k="Make / Model" v={`${v.year||"—"} ${v.make} ${v.model}`} />
            <Card k="Variant / Series" v={v.variant||"—"} />
            <Card k="Engine" v={`${v.engine||"—"} · ${v.fuel||"—"}`} />
            <Card k="Transmission" v={v.transmission||"—"} />
            <Card k="Odometer" v={v.odometer?`${v.odometer.toLocaleString()} km`:"—"} />
            <Card k="Colour / Paint" v={`${v.colour||"—"}${v.paint_code?` · ${v.paint_code}`:""}`} />
          </div>
        )}
        {tab==="Jobs" && <List rows={v.jobs} render={j=>`${j.job_number} · ${j.job_type} · ${j.status}`} link={j=>`/os/jobs/${j.id}`} test="vd-job"/>}
        {tab==="Quotes" && <List rows={v.quotes} render={q=>`${q.quote_number} · A$${q.total?.toFixed(2)} · ${q.status}`} test="vd-quote"/>}
        {tab==="Invoices" && <List rows={v.invoices} render={i=>`${i.invoice_number} · A$${i.total?.toFixed(2)} · balance A$${i.balance?.toFixed(2)}`} test="vd-inv"/>}
        {tab==="Bookings" && <List rows={v.bookings} render={b=>`${b.preferred_date} · ${b.booking_type} · ${b.status}`} test="vd-book"/>}
        {tab==="Photos" && <div className="grid grid-cols-3 md:grid-cols-6 gap-2">{v.photos.map(p=>(
          <div key={p.id} className="border border-white/10 aspect-square overflow-hidden" data-testid={`vd-photo-${p.id}`}>
            <img src={`data:image/jpeg;base64,${p.image_base64}`} className="w-full h-full object-cover" alt=""/>
          </div>
        ))}{!v.photos.length && <div className="col-span-6 text-zinc-500 text-sm">No photos yet.</div>}</div>}
        {tab==="Communications" && <List rows={v.communications||[]} render={m=>`${m.channel} · ${m.direction} · ${m.body?.slice(0,80)}`} test="vd-comm"/>}
        {tab==="Documents" && <DocumentVault entityType="vehicle" entityId={vid} />}
      </div>
    </div>
  );
}
function Metric({k,v}){return(<div className="border border-white/10 p-4"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="font-mono text-2xl mt-1 text-[#B5FF2E]">{v}</div></div>);}
function Card({k,v}){return(<div className="border border-white/10 p-4"><div className="text-[10px] uppercase tracking-widest text-zinc-500">{k}</div><div className="mt-1">{v}</div></div>);}
function List({rows,render,link,test}){return(<div className="space-y-1">{rows.map(r=>{const el=(<div className="border border-white/10 p-3 text-sm hover:border-[#B5FF2E]" data-testid={`${test}-${r.id}`}>{render(r)}</div>);return link?<Link key={r.id} to={link(r)}>{el}</Link>:<div key={r.id}>{el}</div>;})}{!rows.length && <div className="text-zinc-500 text-sm">None yet.</div>}</div>);}
