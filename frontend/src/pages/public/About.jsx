const IMG = "https://images.pexels.com/photos/4489761/pexels-photo-4489761.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-12 gap-10">
      <div className="md:col-span-7">
        <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// EST. MELBOURNE</div>
        <h1 className="font-display text-5xl mb-6">About Wetazz</h1>
        <p className="text-zinc-300 mb-4">Wetazz Paint Panel & Mechanical is a Melbourne workshop where paintwork, panel repair and mechanical service live under one roof — with the workshop management system to match.</p>
        <p className="text-zinc-400">From colour-matched respray touch-ups to full smash repairs and mechanical rebuilds, every job is tracked, quoted, and delivered with the same standard of precision our team applies to the tools.</p>
      </div>
      <div className="md:col-span-5"><img src={IMG} className="w-full h-96 object-cover border border-white/10" alt="Workshop" /></div>
    </div>
  );
}
