import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [sp] = useSearchParams();
  const sid = sp.get("session_id");
  const [status, setStatus] = useState("polling");
  useEffect(() => {
    if (!sid) return;
    let n = 0;
    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${sid}`);
        if (r.data.payment_status === "paid") { setStatus("paid"); return; }
        if (r.data.payment_status === "failed" || r.data.payment_status === "expired") { setStatus("failed"); return; }
      } catch {}
      if (n++ < 15) setTimeout(poll, 2000); else setStatus("timeout");
    };
    poll();
  }, [sid]);
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      {status === "paid" ? (<>
        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={64} />
        <h1 className="font-display text-4xl mb-2">Payment received</h1>
        <p className="text-zinc-400 mb-6">Thanks — your payment has been recorded.</p>
      </>) : status === "polling" ? (<>
        <Loader2 className="mx-auto animate-spin mb-4" size={48} />
        <h1 className="font-display text-3xl">Confirming payment...</h1>
      </>) : (<>
        <h1 className="font-display text-3xl mb-2">Payment {status}</h1>
        <p className="text-zinc-400">Please check with the workshop.</p>
      </>)}
      <Link to="/portal" className="inline-block mt-4 px-6 py-3 border border-white/20 uppercase text-sm">Back to portal</Link>
    </div>
  );
}
