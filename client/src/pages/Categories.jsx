import { Archive, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api.js';
import { currency } from '../lib/format.js';
import { useBudget } from '../state/BudgetContext.jsx';

const groups = ['Needs', 'Wants', 'Savings'];

export default function Categories() {
  const { categories, month, refresh } = useBudget();
  const [form, setForm] = useState({ name: '', groupName: 'Needs', plannedAmount: 0 });
  const [drafts, setDrafts] = useState({});

  async function addCategory(event) {
    event.preventDefault();
    await api.post('/category', {
      ...form,
      defaultBudget: Number(form.plannedAmount),
      plannedAmount: Number(form.plannedAmount),
      month
    });
    setForm({ name: '', groupName: 'Needs', plannedAmount: 0 });
    await refresh();
  }

  async function saveBudget(category) {
    const plannedAmount = Number(drafts[category.id] ?? category.plannedAmount);
    await api.put(`/category/${category.id}/budget`, { month, plannedAmount });
    await refresh();
  }

  async function archiveCategory(category) {
    await api.delete(`/category/${category.id}`);
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Categories</h2>
        <p className="text-sm text-zinc-500">Create custom categories and tune monthly planned amounts.</p>
      </div>

      <form onSubmit={addCategory} className="panel grid gap-3 p-4 md:grid-cols-5">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-zinc-500">Category</span>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-500">Group</span>
          <select className="input" value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })}>
            {groups.map((group) => <option key={group}>{group}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-500">Planned</span>
          <input className="input" type="number" min="0" step="0.01" value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} />
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" type="submit">
            <Plus size={16} />
            Add
          </button>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-3">
        {groups.map((group) => {
          const rows = categories.filter((category) => category.groupName === group && !category.isArchived);
          return (
            <section key={group} className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{group}</h3>
                <span className="text-sm text-zinc-500">{currency.format(rows.reduce((sum, row) => sum + Number(drafts[row.id] ?? row.plannedAmount), 0))}</span>
              </div>
              <div className="space-y-3">
                {rows.map((category) => (
                  <div key={category.id} className="rounded-md border border-black/10 p-3 dark:border-white/10">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-zinc-500">Actual {currency.format(category.actualAmount)}</p>
                      </div>
                      <button className="icon-btn" onClick={() => archiveCategory(category)} title="Archive category">
                        <Archive size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={drafts[category.id] ?? category.plannedAmount}
                        onChange={(e) => setDrafts({ ...drafts, [category.id]: e.target.value })}
                      />
                      <button className="icon-btn" onClick={() => saveBudget(category)} title="Save budget">
                        <Save size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {!rows.length ? <p className="text-sm text-zinc-500">No categories yet.</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
