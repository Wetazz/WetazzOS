import { useState } from "react";
import { auth, saveSession } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await auth.login(email, password);
      saveSession(r);
      toast.success("Welcome back");
      nav(r.user.role === "CUSTOMER" ? "/portal" : "/os");
    } catch (e) { toast.error(e.response?.data?.detail || "Login failed"); }
    setBusy(false);
  };
  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-5xl mb-8">Login</h1>
      <form onSubmit={submit} className="border border-white/10 p-8 space-y-4" data-testid="login-form">
        <input data-testid="login-email" required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="wz-input3" />
        <input data-testid="login-password" required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="wz-input3" />
        <button data-testid="login-submit" disabled={busy} className="w-full bg-[#FF3B30] hover:bg-[#FF5B52] py-3 font-bold uppercase tracking-widest disabled:opacity-50">{busy?"Signing in...":"Sign in"}</button>
        <div className="text-sm text-zinc-400 text-center">No account? <Link data-testid="login-signup-link" to="/signup" className="text-[#FF3B30]">Sign up</Link></div>
        <div className="text-[11px] text-zinc-500 border-t border-white/10 pt-3 font-mono">Owner demo: owner@wetazz.com.au / Wetazz2026!</div>
      </form>
      <style>{`.wz-input3{width:100%;background:#0f0f10;border:1px solid #27272a;padding:.75rem 1rem;color:white;outline:none}.wz-input3:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
