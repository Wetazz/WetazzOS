import { useState } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import { X } from "lucide-react";

export const SignatureModal = ({ open, onClose, onSubmit, title = "Authorise & sign", defaultName = "" }) => {
  const [sig, setSig] = useState(null);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const submit = async () => {
    if (!sig) return;
    if (!name.trim()) return;
    setBusy(true);
    try { await onSubmit(sig, name.trim()); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" data-testid="signature-modal">
      <div className="bg-white text-black w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-black">{title}</h3>
          <button data-testid="signature-close" onClick={onClose} className="text-zinc-500 hover:text-black"><X /></button>
        </div>
        <p className="text-sm text-zinc-600 mb-3">By signing you authorise Wetazz Paint Panel &amp; Mechanical to proceed with the works described on this quote.</p>
        <input data-testid="signature-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
          className="w-full border border-zinc-300 px-3 py-2 mb-3 outline-none focus:border-[#3F9E12]" />
        <SignaturePad onChange={setSig} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border border-zinc-300 uppercase text-sm">Cancel</button>
          <button data-testid="signature-submit" onClick={submit} disabled={!sig || !name.trim() || busy}
            className="px-5 py-2 bg-[#3F9E12] text-white uppercase text-sm font-bold disabled:opacity-40">
            {busy ? "Saving…" : "Sign & authorise"}
          </button>
        </div>
      </div>
    </div>
  );
};
