import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

function fmt(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d) { const x = new Date(d); const day = x.getDay(); const diff = (day + 6) % 7; x.setDate(x.getDate() - diff); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

const HOURS = Array.from({length: 20}).map((_, i) => `${(8 + Math.floor(i/2)).toString().padStart(2,'0')}:${i%2===0?'00':'30'}`);

export default function OSCalendar() {
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(new Date());
  const [data, setData] = useState({ bookings: [], blocks: [] });
  const [bays, setBays] = useState([]);

  const range = useMemo(() => {
    if (view === "day") return { start: fmt(cursor), end: fmt(cursor) };
    if (view === "week") { const s = startOfWeek(cursor); return { start: fmt(s), end: fmt(addDays(s, 6)) }; }
    const s = startOfMonth(cursor); const e = endOfMonth(cursor); return { start: fmt(s), end: fmt(e) };
  }, [view, cursor]);

  useEffect(() => { api.get("/calendar", { params: range }).then(r => setData(r.data)); }, [range.start, range.end]);
  useEffect(() => { api.get("/bays").then(r => setBays(r.data)); }, []);

  const byDate = useMemo(() => {
    const m = {}; data.bookings.forEach(b => { (m[b.preferred_date] = m[b.preferred_date] || []).push(b); }); return m;
  }, [data]);

  const move = (n) => {
    if (view === "day") setCursor(addDays(cursor, n));
    else if (view === "week") setCursor(addDays(cursor, n*7));
    else { const x = new Date(cursor); x.setMonth(x.getMonth()+n); setCursor(x); }
  };

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") { const s = startOfWeek(cursor); return Array.from({length:7}).map((_,i)=>addDays(s,i)); }
    const s = startOfMonth(cursor); const e = endOfMonth(cursor);
    const arr = []; for (let d = new Date(s); d <= e; d = addDays(d,1)) arr.push(new Date(d)); return arr;
  }, [view, cursor]);

  const title = view === "month"
    ? cursor.toLocaleString("en-AU", { month: "long", year: "numeric" })
    : `${days[0].toLocaleDateString("en-AU")} — ${days[days.length-1].toLocaleDateString("en-AU")}`;

  return (
    <div className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-1">// SCHEDULE</div>
          <h1 className="font-display text-4xl">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>move(-1)} data-testid="cal-prev" className="border border-white/10 p-2"><ChevronLeft size={14}/></button>
          <button onClick={()=>setCursor(new Date())} data-testid="cal-today" className="border border-white/10 px-3 py-1 uppercase text-xs">Today</button>
          <button onClick={()=>move(1)} data-testid="cal-next" className="border border-white/10 p-2"><ChevronRight size={14}/></button>
          <div className="border-l border-white/10 pl-2 ml-2 flex">
            {["day","week","month"].map(v=>(<button key={v} onClick={()=>setView(v)} data-testid={`cal-view-${v}`} className={`px-3 py-1 uppercase text-xs ${view===v?"bg-[#B5FF2E] text-black font-bold":"border border-white/10"}`}>{v}</button>))}
          </div>
        </div>
      </div>
      <div className="text-lg font-display mb-3">{title}</div>
      <div className="text-xs text-zinc-500 mb-4 font-mono">Bays: {bays.length ? bays.map(b=>b.name).join(" · ") : "no bays configured — add via API POST /api/bays"}</div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1" data-testid="cal-month">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className="text-[10px] uppercase tracking-widest text-zinc-500 px-2 py-1">{d}</div>)}
          {Array.from({length: (startOfMonth(cursor).getDay()+6)%7}).map((_,i)=><div key={"e"+i}/>)}
          {days.map(d => {
            const key = fmt(d); const bs = byDate[key] || [];
            return (
              <div key={key} className="border border-white/10 min-h-[90px] p-2" data-testid={`cal-day-${key}`}>
                <div className="text-xs font-mono text-zinc-400">{d.getDate()}</div>
                {bs.slice(0,3).map(b=>(<div key={b.id} className="text-[10px] bg-[#B5FF2E]/20 border border-[#B5FF2E]/30 px-1 py-0.5 mt-1 truncate">{b.preferred_time?.slice(0,5)} {b.customer?.first_name}</div>))}
                {bs.length>3 && <div className="text-[10px] text-zinc-500 mt-1">+{bs.length-3} more</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-white/10 overflow-x-auto" data-testid="cal-week">
          <div className="grid" style={{gridTemplateColumns: `80px repeat(${days.length}, minmax(140px,1fr))`}}>
            <div className="bg-white/5"></div>
            {days.map(d=><div key={fmt(d)} className="bg-white/5 border-l border-white/10 px-2 py-1 text-xs uppercase tracking-widest text-zinc-400">{d.toLocaleDateString("en-AU",{weekday:"short",day:"numeric"})}</div>)}
            {HOURS.map(h => (
              <div key={h} className="contents">
                <div className="border-t border-white/10 text-[10px] font-mono text-zinc-500 px-2 py-1">{h}</div>
                {days.map(d => {
                  const key = fmt(d);
                  const hits = (byDate[key]||[]).filter(b=>b.preferred_time?.startsWith(h));
                  return (
                    <div key={key+h} className="border-t border-l border-white/10 min-h-[36px] p-1">
                      {hits.map(b=>(<div key={b.id} data-testid={`cal-booking-${b.id}`} className="text-[10px] bg-[#B5FF2E]/20 border border-[#B5FF2E]/40 px-1 py-0.5">{b.customer?.first_name} · {b.booking_type}</div>))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
