import { useState } from "react";
import { api, getUser } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BOOKING_TYPES = ["Quote/Inspection","Mechanical Service","Mechanical Repair","Diagnostics","Paint Repair","Panel Repair","Smash Repair","Insurance Inspection","General Inspection","Other"];

export default function BookNow() {
  const user = getUser();
  const nav = useNavigate();
  const [f, setF] = useState({
    booking_type: "Quote/Inspection", service_type: "MECHANICAL",
    description: "", preferred_date: "", preferred_time: "09:00",
    contact_method: "EMAIL",
    guest_first_name: "", guest_last_name: "", guest_email: "", guest_phone: "",
    guest_rego: "", guest_make: "", guest_model: "",
  });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/bookings", f);
      toast.success("Booking request received. We'll be in touch.");
      nav(user ? "/portal/bookings" : "/");
    } catch (e) { toast.error(e.response?.data?.detail || "Booking failed"); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// SCHEDULE</div>
      <h1 className="font-display text-5xl mb-8">Book Now</h1>
      <form onSubmit={submit} className="space-y-6 border border-white/10 p-8" data-testid="booking-form">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Booking type"><select data-testid="booking-type" value={f.booking_type} onChange={e=>set("booking_type",e.target.value)} className="wz-input">{BOOKING_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Service category"><select data-testid="booking-service" value={f.service_type} onChange={e=>set("service_type",e.target.value)} className="wz-input"><option>PAINT</option><option>PANEL</option><option>MECHANICAL</option></select></Field>
          <Field label="Preferred date"><input data-testid="booking-date" required type="date" value={f.preferred_date} onChange={e=>set("preferred_date",e.target.value)} className="wz-input"/></Field>
          <Field label="Preferred time"><input data-testid="booking-time" required type="time" value={f.preferred_time} onChange={e=>set("preferred_time",e.target.value)} className="wz-input"/></Field>
        </div>
        <Field label="Describe the issue"><textarea data-testid="booking-description" value={f.description} onChange={e=>set("description",e.target.value)} rows={3} className="wz-input"/></Field>
        {!user && (
          <>
            <div className="border-t border-white/10 pt-6"><div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Your details</div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="First name"><input data-testid="guest-first-name" required value={f.guest_first_name} onChange={e=>set("guest_first_name",e.target.value)} className="wz-input"/></Field>
                <Field label="Last name"><input data-testid="guest-last-name" required value={f.guest_last_name} onChange={e=>set("guest_last_name",e.target.value)} className="wz-input"/></Field>
                <Field label="Email"><input data-testid="guest-email" type="email" value={f.guest_email} onChange={e=>set("guest_email",e.target.value)} className="wz-input"/></Field>
                <Field label="Phone"><input data-testid="guest-phone" value={f.guest_phone} onChange={e=>set("guest_phone",e.target.value)} className="wz-input"/></Field>
              </div>
            </div>
            <div className="border-t border-white/10 pt-6"><div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Vehicle</div>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Rego"><input data-testid="guest-rego" value={f.guest_rego} onChange={e=>set("guest_rego",e.target.value)} className="wz-input"/></Field>
                <Field label="Make"><input data-testid="guest-make" value={f.guest_make} onChange={e=>set("guest_make",e.target.value)} className="wz-input"/></Field>
                <Field label="Model"><input data-testid="guest-model" value={f.guest_model} onChange={e=>set("guest_model",e.target.value)} className="wz-input"/></Field>
              </div>
            </div>
          </>
        )}
        <button data-testid="booking-submit" className="w-full bg-[#FF3B30] hover:bg-[#FF5B52] py-3 font-bold uppercase tracking-widest">Submit booking</button>
      </form>
      <style>{`.wz-input{width:100%;background:#0f0f10;border:1px solid #27272a;padding:.65rem .85rem;color:white;font-family:inherit;outline:none}.wz-input:focus{border-color:#FF3B30}`}</style>
    </div>
  );
}
function Field({label, children}){return(<label className="block"><div className="text-[11px] uppercase tracking-widest text-zinc-400 mb-1">{label}</div>{children}</label>);}
