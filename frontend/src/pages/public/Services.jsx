import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Services() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/business").then(r => setData(r.data)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// CAPABILITIES</div>
      <h1 className="font-display text-5xl mb-12">Services</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {(data?.services || []).map(s => (
          <div key={s.category} className="border border-white/10 p-8" data-testid={`service-cat-${s.category}`}>
            <div className="font-display text-3xl text-[#FF3B30] mb-4">{s.category}</div>
            <ul className="space-y-2 text-zinc-300 text-sm">
              {s.items.map(i => <li key={i} className="flex items-center gap-2"><span className="text-[#FF3B30]">▪</span>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
