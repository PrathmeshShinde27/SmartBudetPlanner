import { Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api.js';
import { useBudget } from '../state/BudgetContext.jsx';

export default function Settings() {
  const { month, refresh } = useBudget();
  const [targetMonth, setTargetMonth] = useState(month);
  const [message, setMessage] = useState('');

  async function copyBudget(event) {
    event.preventDefault();
    await api.post('/budgets/copy', { fromMonth: month, toMonth: targetMonth });
    setMessage(`Copied ${month} budgets into ${targetMonth}`);
    await refresh();
  }

  async function exportExcel() {
    const response = await api.get('/export/excel', { params: { month }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-budget-${month}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-zinc-500">Monthly budget utilities and export tools.</p>
      </div>

      {message ? <p className="rounded-md bg-mint p-3 text-sm text-ink dark:bg-emerald-950 dark:text-emerald-100">{message}</p> : null}

      <section className="panel p-4">
        <h3 className="font-semibold">Copy monthly budget</h3>
        <form onSubmit={copyBudget} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="input max-w-xs" type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
          <button className="btn-primary" type="submit">
            <Copy size={16} />
            Copy current budget
          </button>
        </form>
      </section>

      <section className="panel p-4">
        <h3 className="font-semibold">Export</h3>
        <p className="mt-1 text-sm text-zinc-500">Download an Excel summary for the selected month.</p>
        <button className="btn-secondary mt-4" onClick={exportExcel}>
          <Download size={16} />
          Download Excel
        </button>
      </section>
    </div>
  );
}
