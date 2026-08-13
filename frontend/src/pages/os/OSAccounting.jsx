import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = ["Rent","Utilities","Materials","Parts Purchases","Tools","Wages","Insurance","Marketing","Fuel","Other"];

export default function OSAccounting() {
  const [sum, setSum] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [f, setF] = useState({ category:"Materials", description:"", amount:"", date: new Date().toISOString().slice(0,10) });

  const load = async () => {
    const [s, e] = await Promise.all([api.get("/accounting/summary"), api.get("/accounting/expenses")]);
    setSum(s.data); setExpenses(e.data);
  };
  useEffect(() => { load(); }, []);
  const add = async (ev) => {
    ev.preventDefault();
    try { await api.post("/accounting/expenses", { ...f, amount: parseFloat(f.amount)||0 }); toast.success("Expense logged"); setF({...f, description:"", amount:""}); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="p-8">
      <div className="text-[#B5FF2E] font-mono text-xs tracking-[0.4em] mb-2">// WETAZZ · BOOKS</div>
      <h1 className="font-display text-4xl mb-6">Accounting</h1>

      {sum && (
        <div className="grid md:grid-cols-6 gap-3 mb-8">
          <Tile k="Revenue" v={`A$${sum.revenue.toFixed(2)}`} accent />
          <Tile k="Expenses" v={`A$${sum.expenses.toFixed(2)}`} />
          <Tile k="Gross profit" v={`A$${sum.gross_profit.toFixed(2)}`} good={sum.gross_profit>=0} />
          <Tile k="GST collected" v={`A$${sum.gst_collected.toFixed(2)}`} />
          <Tile k="Receivable" v={`A$${sum.accounts_receivable.toFixed(2)}`} />
          <Tile k="Deposits held" v={`A$${sum.deposits_held.toFixed(2)}`} />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border border-white/10 p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Log expense</div>
          <form onSubmit={add} className="grid md:grid-cols-5 gap-2" data-testid="expense-form">
            <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} className="wz-i" data-testid="exp-cat">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            <input required placeholder="Description" value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="wz-i md:col-span-2" data-testid="exp-desc"/>
            <input required type="number" step="0.01" placeholder="Amount A$" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} className="wz-i" data-testid="exp-amount"/>
            <input required type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} className="wz-i"/>
            <button data-testid="exp-submit" className="bg-[#B5FF2E] hover:bg-[#C8FF5A] uppercase text-sm font-bold md:col-span-1">Log</button>
          </form>
          <div className="mt-6 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500"><th className="pb-2">Date</th><th>Category</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-t border-white/10" data-testid={`expense-row-${e.id}`}>
                    <td className="py-2 font-mono text-xs">{e.date}</td>
                    <td className="text-xs uppercase text-[#B5FF2E]">{e.category}</td>
                    <td className="text-sm">{e.description}</td>
                    <td className="text-right font-mono">A${e.amount?.toFixed(2)}</td>
                  </tr>
                ))}
                {!expenses.length && <tr><td colSpan={4} className="py-4 text-zinc-500 text-sm">No expenses logged.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-white/10 p-5">
          <div className="text-xs uppercase tracking-widest text-zinc-400 mb-3">Expenses by category</div>
          {sum && Object.entries(sum.expenses_by_category).length ? (
            <div className="space-y-2">
              {Object.entries(sum.expenses_by_category).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
                const pct = sum.expenses > 0 ? (v/sum.expenses*100) : 0;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1"><span className="uppercase tracking-widest text-zinc-400">{k}</span><span className="font-mono">A${v.toFixed(2)}</span></div>
                    <div className="h-1 bg-white/5"><div className="h-full bg-[#B5FF2E]" style={{width: `${pct}%`}}/></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-zinc-500 text-sm">Nothing yet.</div>}
        </div>
      </div>
    </div>
  );
}
function Tile({k,v,accent,good}){return(<div className="border border-white/10 p-4"><div className="text-xs uppercase tracking-widest text-zinc-400">{k}</div><div className={`font-display text-2xl mt-1 ${accent?"text-[#B5FF2E]":good===false?"text-red-400":good?"text-emerald-400":"text-white"}`}>{v}</div></div>);}
