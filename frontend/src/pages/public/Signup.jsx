import { useState } from "react";
import { auth, saveSession } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({ first_name:"", last_name:"", email:"", phone:"", password:"" });
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await auth.signup(f);
      saveSession(r); toast.success("Account created"); nav("/portal");
    } catch (e) { toast.error(e.response?.data?.detail || "Signup failed"); }
    setBusy(false);
  };
  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-5xl mb-8">Create account</h1>
      <form onSubmit={submit} className="border border-white/10 p-8 space-y-3" data-testid="signup-form">
        <div className="grid grid-cols-2 gap-3">
          <input data-testid="signup-first" required placeholder="First name" value={f.first_name} onChange={e=>set("first_name",e.target.value)} className="wz-input3"/>
          <input data-testid="signup-last" required placeholder="Last name" value={f.last_name} onChange={e=>set("last_name",e.target.value)} className="wz-input3"/>
        </div>
        <input data-testid="signup-email" required type="email" placeholder="Email" value={f.email} onChange={e=>set("email",e.target.value)} className="wz-input3"/>
        <input data-testid="signup-phone" placeholder="Phone" value={f.phone} onChange={e=>set("phone",e.target.value)} className="wz-input3"/>
        <input data-testid="signup-password" required type="password" placeholder="Password (min 8)" minLength={8} value={f.password} onChange={e=>set("password",e.target.value)} className="wz-input3"/>
        <button data-testid="signup-submit" disabled={busy} className="w-full bg-[#FF3B30] hover:bg-[#FF5B52] py-3 font-bold uppercase tracking-widest disabled:opacity-50">{busy?"Creating...":"Sign up"}</button>
        <div className="text-sm text-zinc-400 text-center">Already have an account? <Link to="/login" className="text-[#FF3B30]">Login</Link></div>
      </form>
      <style>{`.wz-input3{width:100%;background:#0f0f10;border:1px solid #27272a;padding:.75rem 1rem;color:white;outline:none}.wz-input3:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
