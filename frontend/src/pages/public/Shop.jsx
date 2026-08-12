const products = [
  { id: "wz-tee", name: "Wetazz Workshop Tee", price: 45, sku: "WZ-TEE-01" },
  { id: "wz-cap", name: "Wetazz Cap", price: 35, sku: "WZ-CAP-01" },
  { id: "wz-hoodie", name: "Wetazz Hoodie", price: 89, sku: "WZ-HOOD-01" },
];
export default function Shop() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// MERCH</div>
      <h1 className="font-display text-5xl mb-8">Shop</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p.id} className="border border-white/10 p-6" data-testid={`product-${p.id}`}>
            <div className="aspect-square bg-zinc-900 mb-4 flex items-center justify-center font-display text-6xl text-zinc-700">W</div>
            <div className="font-display text-xl">{p.name}</div>
            <div className="text-xs font-mono text-zinc-500">{p.sku}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-lg">A${p.price}</span>
              <button className="px-3 py-1 border border-white/20 text-xs uppercase tracking-widest hover:bg-white/10" disabled>Coming soon</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
