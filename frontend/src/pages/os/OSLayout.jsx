import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "@/lib/api";
import { LayoutDashboard, Users, Car, Calendar, Wrench, FileText, CreditCard, Inbox, Star, UserCog, Sparkles, LogOut, Package, Truck, BarChart3, TrendingUp } from "lucide-react";

const NAV = [
  { to: "/os", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/os/jobs", label: "Jobs Kanban", icon: Wrench },
  { to: "/os/calendar", label: "Calendar", icon: Calendar },
  { to: "/os/bookings", label: "Bookings", icon: Calendar },
  { to: "/os/leads", label: "Leads", icon: TrendingUp },
  { to: "/os/customers", label: "Customers", icon: Users },
  { to: "/os/vehicles", label: "Vehicles", icon: Car },
  { to: "/os/quotes", label: "Quotes", icon: FileText },
  { to: "/os/invoices", label: "Invoices", icon: CreditCard },
  { to: "/os/parts", label: "Parts", icon: Package },
  { to: "/os/suppliers", label: "Suppliers", icon: Truck },
  { to: "/os/accounting", label: "Accounting", icon: BarChart3 },
  { to: "/os/inbox", label: "Inbox", icon: Inbox },
  { to: "/os/reviews", label: "Reviews", icon: Star },
  { to: "/os/staff", label: "Staff", icon: UserCog },
  { to: "/os/assistant", label: "WETAZZ AI", icon: Sparkles },
];

export default function OSLayout() {
  const user = getUser();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex bg-black text-white">
      <aside className="w-60 border-r border-white/10 bg-[#0a0a0a] flex flex-col">
        <Link to="/" className="flex items-center gap-2 p-4 border-b border-white/10">
          <img src="https://customer-assets-jai6qajn.emergentagent.net/job_workshop-os-3/artifacts/52gfsp8x_1000014390.png" alt="Wetazz" className="h-8 w-8 object-contain" />
          <div><div className="font-display leading-none"><span className="text-[#B5FF2E]">WETAZZ</span> · OS</div><div className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">{user?.role}</div></div>
        </Link>
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={`os-nav-${n.label.toLowerCase().replace(/ /g,'-')}`}
              className={({isActive}) => `flex items-center gap-3 px-4 py-2 text-xs uppercase tracking-wider transition-colors ${isActive ? "bg-[#B5FF2E]/10 text-[#B5FF2E] border-l-2 border-[#B5FF2E]" : "text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`}>
              <n.icon size={14} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-zinc-400 mb-1">{user?.first_name} {user?.last_name}</div>
          <div className="text-[10px] font-mono text-zinc-600 mb-2">{user?.email}</div>
          <button data-testid="os-logout" onClick={()=>{logout();nav("/");}} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><LogOut size={12}/> Logout</button>
        </div>
      </aside>
      <div className="flex-1 overflow-auto"><Outlet /></div>
    </div>
  );
}
