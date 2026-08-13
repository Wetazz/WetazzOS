export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-display text-5xl mb-8">Contact</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="border border-white/10 p-8">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Phone</div>
          <div className="font-mono text-2xl text-[#B5FF2E] mb-6">+61 2 0000 0000</div>
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Email</div>
          <div className="font-mono text-lg">hello@wetazz.com.au</div>
        </div>
        <div className="border border-white/10 p-8">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Address</div>
          <div className="text-lg mb-6">89 Maxwell St, Wellington NSW</div>
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Hours</div>
          <div className="text-sm">Mon–Fri · 8:00 – 17:30<br/>Sat · 9:00 – 13:00<br/>Sun · Closed</div>
        </div>
      </div>
    </div>
  );
}
