import { useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, Loader2 } from "lucide-react";

export default function OSAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input; setInput(""); setLoading(true);
    setMessages(m => [...m, { role: "user", body: msg }]);
    try {
      const r = await api.post("/ai/assistant", { message: msg });
      setMessages(m => [...m, { role: "assistant", body: r.data.reply }]);
    } catch { setMessages(m => [...m, { role: "assistant", body: "(error)" }]); }
    setLoading(false);
  };
  return (
    <div className="p-8 max-w-3xl">
      <div className="text-[#FF3B30] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ AI</div>
      <h1 className="font-display text-4xl mb-6 flex items-center gap-2"><Sparkles className="text-[#FF3B30]"/> Workshop Assistant</h1>
      <div className="border border-white/10 p-4 h-[420px] overflow-y-auto space-y-3" data-testid="ai-chat-log">
        {messages.length===0 && <div className="text-zinc-500 text-sm">Ask about a job, draft a customer reply, or get advice.</div>}
        {messages.map((m,i)=>(
          <div key={i} className={`p-3 border ${m.role==='user' ? "border-[#FF3B30]/30 bg-[#FF3B30]/5" : "border-white/10 bg-white/5"}`}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{m.role}</div>
            <div className="text-sm whitespace-pre-wrap">{m.body}</div>
          </div>
        ))}
        {loading && <div className="text-zinc-500 flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={14}/> thinking...</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <input data-testid="ai-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask WETAZZ AI..." className="flex-1 bg-[#0f0f10] border border-white/10 px-3 py-2 outline-none focus:border-[#FF3B30]"/>
        <button data-testid="ai-send" onClick={send} disabled={loading} className="px-4 py-2 bg-[#FF3B30] hover:bg-[#FF5B52] uppercase text-sm font-bold disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
