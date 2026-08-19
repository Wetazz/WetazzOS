import { useEffect, useState } from "react";
import { api, getUser, saveSession } from "@/lib/api";
import { toast } from "sonner";

export default function PortalProfile() {
  const user = getUser();
  const [f, setF] = useState({ first_name:"", last_name:"", email:"", phone:"", address:"", preferred_contact:"EMAIL" });
  useEffect(() => { setF({
    first_name: user?.first_name||"", last_name: user?.last_name||"",
    email: user?.email||"", phone: user?.phone||"",
    address: user?.address||"", preferred_contact: user?.preferred_contact||"EMAIL",
  }); }, []);
  const save = async () => {
    try {
      await api.patch("/me/profile", f);
      const me = await api.get("/auth/me");
      saveSession({ token: localStorage.getItem("wz_token"), user: me.data });
      toast.success("Profile updated");
    } catch { toast.error("Failed"); }
  };
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display text-4xl mb-6">My Profile</h1>
      <div className="border border-white/10 p-6 space-y-3" data-testid="profile-form">
        <Row k="First name"><input className="wz-i w-full" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})} data-testid="pf-first"/></Row>
        <Row k="Last name"><input className="wz-i w-full" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})} data-testid="pf-last"/></Row>
        <Row k="Email"><input type="email" className="wz-i w-full" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="pf-email"/></Row>
        <Row k="Phone"><input className="wz-i w-full" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} data-testid="pf-phone"/></Row>
        <Row k="Address"><input className="wz-i w-full" value={f.address} onChange={e=>setF({...f,address:e.target.value})} data-testid="pf-address"/></Row>
        <Row k="Preferred contact">
          <select className="wz-i w-full" value={f.preferred_contact} onChange={e=>setF({...f,preferred_contact:e.target.value})} data-testid="pf-preferred">
            <option>EMAIL</option><option>SMS</option><option>PHONE</option>
          </select>
        </Row>
        <button onClick={save} className="w-full bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black py-2 uppercase font-bold text-sm" data-testid="pf-save">Save</button>
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.55rem .75rem;color:white;outline:none;font-size:.9rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
function Row({k,children}){return(<label className="block"><div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">{k}</div>{children}</label>);}
