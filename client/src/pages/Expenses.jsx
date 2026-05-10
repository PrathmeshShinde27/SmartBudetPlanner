import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ExpenseForm from '../components/ExpenseForm.jsx';
import Toast from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { currency, prettyDate } from '../lib/format.js';
import { useBudget } from '../state/BudgetContext.jsx';

export default function Expenses() {
  const { expenses, categories, paymentTypes, refresh } = useBudget();
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function addExpense(input) {
    try {
      await api.post('/expense', input);
      await refresh();
      showToast('Expense added');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not add expense', 'error');
    }
  }

  async function updateExpense(input) {
    try {
      await api.put(`/expense/${editing.id}`, input);
      setEditing(null);
      await refresh();
      showToast('Expense updated');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update expense', 'error');
    }
  }

  async function deleteExpense(id) {
    try {
      await api.delete(`/expense/${id}`);
      await refresh();
      showToast('Expense deleted');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not delete expense', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h2 className="text-2xl font-semibold">Expenses</h2>
        <p className="text-sm text-zinc-500">Add, edit, and delete daily spending without reloading the page.</p>
      </div>

      <ExpenseForm categories={categories} paymentTypes={paymentTypes} initialValue={editing} onSubmit={editing ? updateExpense : addExpense} onCancel={editing ? () => setEditing(null) : null} />

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3">Bill date</th>
                <th>Category</th>
                <th>Payment Type</th>
                <th>Description</th>
                <th className="text-right">Amount</th>
                <th className="w-24 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-4 py-3">{prettyDate(expense.billDate || expense.date)}</td>
                  <td>{expense.categoryName}</td>
                  <td>{expense.paymentMethod}</td>
                  <td className="max-w-xs truncate text-zinc-500">{expense.description || '-'}</td>
                  <td className="text-right font-semibold">{currency.format(expense.amount)}</td>
                  <td className="pr-4 text-right">
                    <button className="icon-btn mr-2" onClick={() => setEditing(expense)} title="Edit expense">
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteExpense(expense.id)} title="Delete expense">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!expenses.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan="6">No expenses in this month.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
