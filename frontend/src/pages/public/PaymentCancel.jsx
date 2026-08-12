import { Link } from "react-router-dom";
export default function PaymentCancel() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-4xl mb-2">Payment cancelled</h1>
      <p className="text-zinc-400 mb-6">No charge was made.</p>
      <Link to="/portal" className="inline-block px-6 py-3 border border-white/20 uppercase text-sm">Back to portal</Link>
    </div>
  );
}
