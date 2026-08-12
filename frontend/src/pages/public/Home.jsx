import { Link } from "react-router-dom";
import { ArrowRight, Wrench, PaintBucket, ShieldCheck, Sparkles } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxtZWNoYW5pYyUyMHdvcmtpbmclMjBvbiUyMGNhcnxlbnwwfHx8fDE3ODY1NDM5NjB8MA&ixlib=rb-4.1.0&q=85";
const GAL1 = "https://images.unsplash.com/photo-1572281335102-5f780686ee91?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHw0fHxzcG9ydHMlMjBjYXIlMjBnYXJhZ2V8ZW58MHx8fHwxNzg2NTQzOTYwfDA&ixlib=rb-4.1.0&q=85";
const GAL2 = "https://images.pexels.com/photos/10182861/pexels-photo-10182861.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        <img src={HERO} alt="Workshop" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        <div className="wz-grid-bg absolute inset-0 opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6 pb-16 pt-24 grid md:grid-cols-12 gap-8 w-full">
          <div className="md:col-span-8">
            <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-4">// WETAZZ.OS / v1.0</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.9] mb-6" data-testid="hero-title">
              Precision <span className="text-[#FF3B30]">paint</span>,<br/>panel & <span className="text-[#FF3B30]">mechanical</span><br/>done properly.
            </h1>
            <p className="text-zinc-300 max-w-xl mb-8 text-lg">Melbourne’s workshop for smash repairs, panel work, resprays and full mechanical service — powered by a workshop OS your car never sees, but always feels.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/book" data-testid="hero-book-btn" className="inline-flex items-center gap-2 bg-[#FF3B30] hover:bg-[#FF5B52] px-6 py-3 font-bold uppercase tracking-wide text-sm">Book Now <ArrowRight size={16} /></Link>
              <Link to="/quote" data-testid="hero-quote-btn" className="inline-flex items-center gap-2 border border-white/30 hover:bg-white/10 px-6 py-3 font-bold uppercase tracking-wide text-sm">Get an AI Quote</Link>
            </div>
          </div>
          <div className="md:col-span-4 hidden md:flex flex-col justify-end gap-3">
            {[{k:"Turnaround",v:"3–5 days avg"},{k:"Insurance approved",v:"All major AU insurers"},{k:"Warranty",v:"Lifetime on paint"}].map(x => (
              <div key={x.k} className="border border-white/15 bg-black/40 backdrop-blur px-5 py-4">
                <div className="text-xs uppercase tracking-widest text-zinc-400">{x.k}</div>
                <div className="font-display text-2xl">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE PILLARS */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-6">
        {[
          {icon:<PaintBucket />, title:"Paint", body:"Full resprays, colour matching, spot repairs, clear coat correction."},
          {icon:<Wrench />, title:"Panel", body:"Dent repairs, panel replacement, bumper work, smash repairs, damage assessment."},
          {icon:<ShieldCheck />, title:"Mechanical", body:"Servicing, diagnostics, brakes, suspension, cooling, engine repairs, inspections."},
        ].map(s => (
          <div key={s.title} className="border border-white/10 p-8 hover:border-[#FF3B30] transition-colors" data-testid={`pillar-${s.title.toLowerCase()}`}>
            <div className="text-[#FF3B30] mb-4">{s.icon}</div>
            <div className="font-display text-3xl mb-2">{s.title}</div>
            <div className="text-zinc-400 text-sm">{s.body}</div>
          </div>
        ))}
      </section>

      {/* AI QUOTE PROMO */}
      <section className="relative border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6">
            <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-3">// WETAZZ AI</div>
            <h2 className="font-display text-4xl md:text-5xl mb-4">Upload a photo.<br/>Get a preliminary estimate.</h2>
            <p className="text-zinc-400 mb-6">Snap the damage, drop the photo in, and our AI returns a preliminary range for parts, labour and materials in seconds. Physical inspection confirms the final quote.</p>
            <Link to="/quote" data-testid="ai-promo-btn" className="inline-flex items-center gap-2 bg-[#FF3B30] hover:bg-[#FF5B52] px-6 py-3 uppercase font-bold text-sm">Try the AI estimator <Sparkles size={16} /></Link>
          </div>
          <div className="md:col-span-6 relative wz-scan border border-white/10">
            <img src={GAL1} alt="Car" className="w-full h-80 object-cover opacity-90" />
            <div className="absolute inset-0 wz-grid-bg opacity-40" />
            <div className="absolute bottom-3 left-3 font-mono text-xs text-[#FF3B30]">SCANNING · CONFIDENCE 87%</div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// RECENT WORK</div>
            <h2 className="font-display text-4xl">The workshop floor</h2>
          </div>
          <Link to="/services" className="text-sm uppercase tracking-widest text-zinc-400 hover:text-white">See services →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <img src={GAL1} className="w-full h-96 object-cover border border-white/10" alt="" />
          <img src={GAL2} className="w-full h-96 object-cover border border-white/10" alt="" />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="border border-[#FF3B30]/30 p-12 bg-[#FF3B30]/5">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8">
              <h2 className="font-display text-4xl mb-2">Ready to book?</h2>
              <p className="text-zinc-300">Pick a time, tell us what happened, and we’ll take it from there.</p>
            </div>
            <div className="md:col-span-4 flex md:justify-end">
              <Link to="/book" data-testid="footer-cta-book" className="inline-flex items-center gap-2 bg-[#FF3B30] hover:bg-[#FF5B52] px-8 py-4 uppercase font-bold text-sm">Book now <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
