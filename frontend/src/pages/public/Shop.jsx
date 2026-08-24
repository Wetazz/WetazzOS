import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Truck, Store } from "lucide-react";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [cfg, setCfg] = useState({ shipping_flat: 14.99, free_ship_threshold: 150 });
  const [cart, setCart] = useState({}); // id -> qty
  const [fulfilment, setFulfilment] = useState("PICKUP");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/shop/products").then(r => { setProducts(r.data.products); setCfg({ shipping_flat: r.data.shipping_flat, free_ship_threshold: r.data.free_ship_threshold }); });
  }, []);

  const add = (id) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id) => setCart(c => { const n = (c[id] || 0) - 1; const cp = { ...c }; if (n <= 0) delete cp[id]; else cp[id] = n; return cp; });

  const items = products.filter(p => cart[p.id]);
  const subtotal = items.reduce((s, p) => s + p.price * cart[p.id], 0);
  const shipping = fulfilment === "SHIP" && subtotal > 0 && subtotal < cfg.free_ship_threshold ? cfg.shipping_flat : 0;
  const total = subtotal + shipping;

  const checkout = async () => {
    if (!items.length) { toast.error("Your cart is empty"); return; }
    setBusy(true);
    try {
      const r = await api.post("/shop/checkout", {
        items: items.map(p => ({ id: p.id, quantity: cart[p.id] })),
        fulfilment, origin_url: window.location.origin,
      });
      window.location.href = r.data.checkout_url;
    } catch (e) { toast.error(e.response?.data?.detail || "Checkout failed"); setBusy(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// MERCH</div>
      <h1 className="font-display text-5xl mb-8">Shop</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid md:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="border border-white/10 p-6" data-testid={`product-${p.id}`}>
              <div className="aspect-square bg-zinc-900 mb-4 flex items-center justify-center font-display text-6xl text-zinc-700">W</div>
              <div className="font-display text-xl">{p.name}</div>
              <div className="text-xs font-mono text-zinc-500">{p.sku}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-lg">A${p.price.toFixed(2)}</span>
                {cart[p.id] ? (
                  <div className="flex items-center gap-2">
                    <button data-testid={`dec-${p.id}`} onClick={()=>dec(p.id)} className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-white/10"><Minus size={14}/></button>
                    <span className="font-mono w-5 text-center" data-testid={`qty-${p.id}`}>{cart[p.id]}</span>
                    <button data-testid={`inc-${p.id}`} onClick={()=>add(p.id)} className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-white/10"><Plus size={14}/></button>
                  </div>
                ) : (
                  <button data-testid={`add-${p.id}`} onClick={()=>add(p.id)} className="px-3 py-1 bg-[#B5FF2E] text-black text-xs uppercase tracking-widest font-bold">Add</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border border-white/10 p-6 h-fit" data-testid="cart-summary">
          <div className="flex items-center gap-2 font-display text-2xl mb-4"><ShoppingCart size={20} className="text-[#B5FF2E]"/> Cart</div>
          {!items.length && <div className="text-zinc-500 text-sm">Your cart is empty.</div>}
          {items.map(p => (
            <div key={p.id} className="flex justify-between text-sm mb-2">
              <span>{cart[p.id]} × {p.name}</span>
              <span className="font-mono">A${(p.price * cart[p.id]).toFixed(2)}</span>
            </div>
          ))}
          {items.length > 0 && (
            <>
              <div className="border-t border-white/10 mt-4 pt-4 space-y-2">
                <div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">Fulfilment</div>
                <label className={`flex items-center gap-2 p-2 border cursor-pointer ${fulfilment==="PICKUP"?"border-[#B5FF2E]":"border-white/15"}`} data-testid="fulfil-pickup">
                  <input type="radio" checked={fulfilment==="PICKUP"} onChange={()=>setFulfilment("PICKUP")} />
                  <Store size={15}/> <span className="text-sm">Local pickup — Wellington NSW</span> <span className="ml-auto text-xs text-emerald-400">FREE</span>
                </label>
                <label className={`flex items-center gap-2 p-2 border cursor-pointer ${fulfilment==="SHIP"?"border-[#B5FF2E]":"border-white/15"}`} data-testid="fulfil-ship">
                  <input type="radio" checked={fulfilment==="SHIP"} onChange={()=>setFulfilment("SHIP")} />
                  <Truck size={15}/> <span className="text-sm">Shipping</span>
                  <span className="ml-auto text-xs font-mono">{subtotal>=cfg.free_ship_threshold?"FREE":`A$${cfg.shipping_flat.toFixed(2)}`}</span>
                </label>
                <div className="text-[11px] text-zinc-500">Free shipping on orders over A${cfg.free_ship_threshold.toFixed(0)}.</div>
              </div>
              <div className="border-t border-white/10 mt-4 pt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span className="font-mono">A${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Shipping</span><span className="font-mono">A${shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-display text-lg pt-1"><span>Total</span><span className="text-[#B5FF2E]" data-testid="cart-total">A${total.toFixed(2)}</span></div>
              </div>
              <button data-testid="checkout-btn" onClick={checkout} disabled={busy} className="w-full mt-4 bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black py-3 font-bold uppercase tracking-widest disabled:opacity-50">
                {busy ? "Redirecting…" : "Checkout"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
