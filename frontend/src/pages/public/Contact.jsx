import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Contact() {
  const [f, setF] = useState({ first_name:"", last_name:"", email:"", phone:"", subject:"", message:"" });
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/public/enquiries", f); setSent(true); toast.success("Message received — we'll be in touch"); }
    catch(er){ toast.error(er.response?.data?.detail || "Failed to send"); }
  };
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// GET IN TOUCH</div>
      <h1 className="font-display text-5xl mb-10">Contact</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="border border-white/10 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Phone</div>
            <div className="font-mono text-2xl text-[#B5FF2E] mb-4">+61 2 0000 0000</div>
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Email</div>
            <a href="mailto:Office@wetazz.com.au" className="font-mono text-lg hover:text-[#B5FF2E]" data-testid="contact-email">Office@wetazz.com.au</a>
          </div>
          <div className="border border-white/10 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Address</div>
            <div className="text-lg mb-4">89 Maxwell St, Wellington NSW</div>
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Hours</div>
            <div className="text-sm text-zinc-300">Mon–Fri · 8:00 – 17:30<br/>Sat · 9:00 – 13:00<br/>Sun · Closed</div>
          </div>
        </div>
        {sent ? (
          <div className="border border-[#B5FF2E] p-8 text-center" data-testid="contact-sent">
            <div className="font-display text-2xl text-[#B5FF2E] mb-2">Message received</div>
            <div className="text-zinc-300">Thanks for reaching out. We'll reply to {f.email||f.phone} shortly.</div>
          </div>
        ) : (
          <form onSubmit={submit} className="border border-white/10 p-6 space-y-3" data-testid="contact-form">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-1">Send us a message</div>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})} className="wz-i" data-testid="contact-first"/>
              <input required placeholder="Last name" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})} className="wz-i" data-testid="contact-last"/>
              <input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} className="wz-i" data-testid="contact-email-input"/>
              <input placeholder="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} className="wz-i" data-testid="contact-phone"/>
            </div>
            <input placeholder="Subject" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} className="wz-i w-full" data-testid="contact-subject"/>
            <textarea required rows={5} placeholder="How can we help?" value={f.message} onChange={e=>setF({...f,message:e.target.value})} className="wz-i w-full" data-testid="contact-message"/>
            <button className="w-full bg-[#B5FF2E] hover:bg-[#C8FF5A] text-black py-2 uppercase font-bold text-sm" data-testid="contact-submit">Send</button>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Enquiry lands in our Wetazz OS inbox instantly.</div>
          </form>
        )}
      </div>
      <style>{`.wz-i{background:#0f0f10;border:1px solid #27272a;padding:.6rem .8rem;color:white;outline:none;font-size:.9rem}.wz-i:focus{border-color:#B5FF2E}`}</style>
    </div>
  );
}
