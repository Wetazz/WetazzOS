import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, logout } from "@/lib/api";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/quote", label: "Get a Quote" },
  { to: "/book", label: "Book Now" },
  { to: "/shop", label: "Shop" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const user = getUser();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10" data-testid="public-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo">
            <div className="w-9 h-9 bg-[#FF3B30] flex items-center justify-center font-display text-lg">W</div>
            <div>
              <div className="font-display text-lg leading-none">WETAZZ</div>
              <div className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase">Paint · Panel · Mechanical</div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={`nav-${n.label.toLowerCase().replace(/ /g,'-')}`}
                className={({isActive}) => `px-3 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${isActive ? "text-[#FF3B30]" : "text-zinc-300 hover:text-white"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                <Link to={user.role === "CUSTOMER" ? "/portal" : "/os"} data-testid="header-dashboard-btn"
                  className="px-4 py-2 text-sm uppercase font-medium border border-white/20 hover:bg-white/10">
                  {user.role === "CUSTOMER" ? "My Portal" : "Workshop OS"}
                </Link>
                <button data-testid="header-logout-btn" onClick={() => { logout(); nav("/"); }}
                  className="px-3 py-2 text-sm text-zinc-400 hover:text-white">Logout</button>
              </>
            ) : (
              <Link to="/login" data-testid="header-login-btn" className="px-4 py-2 text-sm uppercase font-medium border border-white/20 hover:bg-white/10">Login</Link>
            )}
            <Link to="/book" data-testid="header-book-btn" className="px-5 py-2 text-sm uppercase font-bold bg-[#FF3B30] hover:bg-[#FF5B52]">Book Now</Link>
          </div>
          <button className="lg:hidden text-white" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-white/10 bg-black/95 px-6 py-4 flex flex-col gap-2">
            {NAV.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 uppercase text-sm">{n.label}</Link>)}
            <Link to={user ? (user.role === "CUSTOMER" ? "/portal" : "/os") : "/login"} onClick={() => setOpen(false)} className="py-2 uppercase text-sm text-[#FF3B30]">{user ? "Dashboard" : "Login"}</Link>
          </div>
        )}
      </header>
      <main><Outlet /></main>
      <footer className="border-t border-white/10 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm text-zinc-400">
          <div><div className="font-display text-white text-lg mb-2">WETAZZ</div><div>Precision Paint. Panel. Mechanical.</div><div className="mt-2 font-mono text-xs">Melbourne, Victoria</div></div>
          <div><div className="text-white uppercase text-xs mb-2 tracking-widest">Workshop</div><div>Mon–Fri · 8:00 – 17:30</div><div>Sat · 9:00 – 13:00</div></div>
          <div><div className="text-white uppercase text-xs mb-2 tracking-widest">Contact</div><div className="font-mono">+61 3 9999 0000</div><div>hello@wetazz.com.au</div></div>
          <div><div className="text-white uppercase text-xs mb-2 tracking-widest">Follow</div><div>Instagram · Facebook</div></div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-zinc-600 font-mono">© {new Date().getFullYear()} WETAZZ OS · v1.0</div>
      </footer>
    </div>
  );
}
