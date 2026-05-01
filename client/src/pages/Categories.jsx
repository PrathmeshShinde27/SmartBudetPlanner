import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Toast from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { currency } from '../lib/format.js';
import { useBudget } from '../state/BudgetContext.jsx';

const groups = ['Needs', 'Wants', 'Savings'];

export default function Categories() {
  const { categories, dashboard, month, refresh } = useBudget();
  const [form, setForm] = useState({ name: '', groupName: 'Needs', plannedAmount: '' });
  const [income, setIncome] = useState('');
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setIncome(dashboard?.totals?.plannedIncome ? String(dashboard.totals.plannedIncome) : '');
  }, [dashboard?.totals?.plannedIncome]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }

  function errorMessage(error, fallback) {
    return error.response?.data?.message || fallback;
  }

  async function saveIncome(event) {
    event.preventDefault();
    try {
      await api.put('/income', {
        month,
        source: 'Monthly income',
        plannedAmount: Number(income || 0),
        actualAmount: Number(income || 0)
      });
      await refresh();
      showToast('Monthly income saved');
    } catch (error) {
      showToast(errorMessage(error, 'Could not save monthly income'), 'error');
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    try {
      await api.post('/categories', {
        ...form,
        defaultBudget: Number(form.plannedAmount),
        plannedAmount: Number(form.plannedAmount),
        month
      });
      setForm((current) => ({ name: '', groupName: current.groupName, plannedAmount: '' }));
      await refresh();
      showToast('Category added');
    } catch (error) {
      showToast(errorMessage(error, 'Could not add category'), 'error');
    }
  }

  async function saveBudget(category) {
    const plannedAmount = Number(drafts[category.id] ?? category.plannedAmount);
    try {
      await api.put(`/category/${category.id}/budget`, { month, plannedAmount });
      await refresh();
      showToast(`${category.name} budget saved`);
    } catch (error) {
      showToast(errorMessage(error, 'Could not save category budget'), 'error');
    }
  }

  async function deleteCategory(category) {
    try {
      await api.delete(`/category/${category.id}`);
      await refresh();
      showToast(`${category.name} deleted`);
    } catch (error) {
      showToast(errorMessage(error, 'Could not delete category'), 'error');
    }
  }

  const incomeNumber = Number(income || dashboard?.totals?.plannedIncome || 0);
  const incomeTargets = groups.map((group) => {
    const targetPercent = group === 'Needs' ? 0.5 : group === 'Wants' ? 0.3 : 0.2;
    return {
      group,
      targetLabel: `${group} target`,
      targetValue: incomeNumber * targetPercent,
      plannedLabel: `${group} planned`,
      plannedValue: categories
        .filter((category) => category.groupName === group && !category.isArchived)
        .reduce((sum, category) => sum + Number(category.plannedAmount || 0), 0)
    };
  });

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h2 className="text-2xl font-semibold">Categories</h2>
        <p className="text-sm text-zinc-500">Create custom categories and tune monthly planned amounts.</p>
      </div>

      <form onSubmit={saveIncome} className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-500">Monthly income</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="In ₹"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" type="submit">
            <Save size={16} />
            Save income
          </button>
        </div>
        <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 md:col-span-2 md:grid-cols-3">
          {incomeTargets.map((target) => (
            <div key={target.group} className="rounded-md bg-sky-50 px-3 py-2 dark:bg-sky-950/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">{target.targetLabel}</span>
                <span className="text-xs text-zinc-500">{target.plannedLabel}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-semibold text-ink dark:text-sky-100">{currency.format(target.targetValue)}</p>
                <p className={target.plannedValue > target.targetValue && target.targetValue > 0 ? 'font-semibold text-coral' : 'font-semibold text-moss dark:text-sky-200'}>
                  {currency.format(target.plannedValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </form>

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
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="In ₹"
            value={form.plannedAmount}
            onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })}
          />
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
                      <button className="icon-btn" onClick={() => deleteCategory(category)} title="Delete category">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="In ₹"
                        value={drafts[category.id] ?? (Number(category.plannedAmount) === 0 ? '' : category.plannedAmount)}
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
