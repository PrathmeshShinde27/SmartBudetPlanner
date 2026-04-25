import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { today } from '../lib/format.js';

const methods = ['Cash', 'UPI', 'Card', 'Net Banking', 'Wallet'];

export default function ExpenseForm({ categories, initialValue, onSubmit, onCancel, compact = false }) {
  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    paymentMethod: 'UPI',
    description: '',
    date: today()
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        amount: initialValue.amount,
        categoryId: initialValue.categoryId,
        paymentMethod: initialValue.paymentMethod,
        description: initialValue.description || '',
        date: String(initialValue.date).slice(0, 10)
      });
    } else if (categories[0]) {
      setForm((value) => ({ ...value, categoryId: value.categoryId || categories[0].id }));
    }
  }, [initialValue, categories]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSubmit({
      ...form,
      amount: Number(form.amount)
    });
    if (!initialValue) {
      setForm((current) => ({ ...current, amount: '', description: '', date: today() }));
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'grid gap-3' : 'panel grid gap-4 p-4 md:grid-cols-6'}>
      <label className="md:col-span-1">
        <span className="mb-1 block text-xs font-medium text-zinc-500">Amount</span>
        <input
          className="input"
          type="number"
          min="1"
          step="0.01"
          required
          value={form.amount}
          onChange={(event) => update('amount', event.target.value)}
        />
      </label>
      <label className="md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-500">Category</span>
        <select
          className="input"
          required
          value={form.categoryId}
          onChange={(event) => update('categoryId', event.target.value)}
        >
          {categories.filter((category) => !category.isArchived).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-500">Method</span>
        <select
          className="input"
          value={form.paymentMethod}
          onChange={(event) => update('paymentMethod', event.target.value)}
        >
          {methods.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-500">Date</span>
        <input className="input" type="date" value={form.date} onChange={(event) => update('date', event.target.value)} />
      </label>
      <label className="md:col-span-4">
        <span className="mb-1 block text-xs font-medium text-zinc-500">Description</span>
        <input
          className="input"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Optional note"
        />
      </label>
      <div className="flex items-end gap-2 md:col-span-2">
        <button className="btn-primary flex-1" type="submit">
          <Save size={16} />
          {initialValue ? 'Update' : 'Add'}
        </button>
        {onCancel ? (
          <button className="btn-secondary" type="button" onClick={onCancel}>
            <X size={16} />
          </button>
        ) : null}
      </div>
    </form>
  );
}
