import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "@/lib/api";
import { Car, Calendar, Wrench, FileText, CreditCard, LogOut, Home } from "lucide-react";

const NAV = [
  { to: "/portal", end: true, label: "Overview", icon: Home },
  { to: "/portal/vehicles", label: "My Vehicles", icon: Car },
  { to: "/portal/bookings", label: "My Bookings", icon: Calendar },
  { to: "/portal/jobs", label: "My Jobs", icon: Wrench },
  { to: "/portal/quotes", label: "My Quotes", icon: FileText },
  { to: "/portal/invoices", label: "My Invoices", icon: CreditCard },
];

export default function PortalLayout() {
  const user = getUser();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex bg-black text-white">
      <aside className="w-64 border-r border-white/10 bg-[#0a0a0a] p-4 flex flex-col">
        <Link to="/" className="flex items-center gap-2 mb-6 p-2">
          <div className="w-8 h-8 bg-[#FF3B30] flex items-center justify-center font-display">W</div>
          <div><div className="font-display leading-none">WETAZZ</div><div className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Portal</div></div>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={`portal-nav-${n.label.toLowerCase().replace(/ /g,'-')}`}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2 text-sm uppercase tracking-wide transition-colors ${isActive ? "bg-[#FF3B30]/10 text-[#FF3B30] border-l-2 border-[#FF3B30]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="text-xs text-zinc-500 mb-2 font-mono">{user?.email}</div>
          <button data-testid="portal-logout" onClick={() => { logout(); nav("/"); }} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><LogOut size={14}/> Logout</button>
        </div>
      </aside>
      <div className="flex-1 overflow-auto"><Outlet /></div>
    </div>
  );
}
