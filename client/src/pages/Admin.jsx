import { ShieldCheck, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import Toast from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { currency, prettyDate } from '../lib/format.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useBudget } from '../state/BudgetContext.jsx';

export default function Admin() {
  const { user } = useAuth();
  const { month } = useBudget();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId),
    [users, selectedUserId]
  );

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function loadUsers() {
    const { data } = await api.get('/admin/users');
    setUsers(data.users);
    setSelectedUserId((current) => current || data.users[0]?.id || '');
  }

  async function loadSelectedUserData(userId) {
    if (!userId) return;
    setLoading(true);
    try {
      const [dashboardResult, categoriesResult, expensesResult] = await Promise.all([
        api.get(`/admin/users/${userId}/dashboard`, { params: { month } }),
        api.get(`/admin/users/${userId}/categories`, { params: { month } }),
        api.get(`/admin/users/${userId}/expenses`, { params: { month } })
      ]);
      setDashboard(dashboardResult.data);
      setCategories(categoriesResult.data.categories);
      setExpenses(expensesResult.data.expenses);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(targetUser) {
    const confirmed = window.confirm(`Delete ${targetUser.email}? This removes the user and all their budget data.`);
    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${targetUser.id}`);
      showToast('User deleted');
      setDashboard(null);
      setCategories([]);
      setExpenses([]);
      setSelectedUserId('');
      await loadUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not delete user', 'error');
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers().catch((error) => showToast(error.response?.data?.message || 'Could not load users', 'error'));
    }
  }, [user?.role]);

  useEffect(() => {
    if (selectedUserId) {
      loadSelectedUserData(selectedUserId).catch((error) =>
        showToast(error.response?.data?.message || 'Could not load user data', 'error')
      );
    }
  }, [selectedUserId, month]);

  if (user?.role !== 'admin') {
    return (
      <div className="panel p-6">
        <h2 className="text-xl font-semibold">Admin</h2>
        <p className="mt-2 text-sm text-zinc-500">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck size={24} />
            Admin
          </h2>
          <p className="text-sm text-zinc-500">Read-only user budget overview. Admin can only delete users.</p>
        </div>
        {loading ? <p className="text-sm text-zinc-500">Loading...</p> : null}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-sky-100 p-4 dark:border-sky-900/50">
          <Users size={18} />
          <h3 className="font-semibold">Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-sky-50 text-xs uppercase text-zinc-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Role</th>
                <th>Categories</th>
                <th>Expenses</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr
                  key={item.id}
                  className={`cursor-pointer border-t border-sky-100 dark:border-sky-900/50 ${
                    selectedUserId === item.id ? 'bg-sky-50 dark:bg-sky-950/30' : ''
                  }`}
                  onClick={() => setSelectedUserId(item.id)}
                >
                  <td className="px-4 py-3 font-medium">{item.name || '-'}</td>
                  <td>{item.email}</td>
                  <td>{`${item.phoneCountryCode || ''} ${item.phoneNumber || ''}`.trim() || '-'}</td>
                  <td>{item.city || '-'}</td>
                  <td>{item.role}</td>
                  <td>{item.categoryCount}</td>
                  <td>{item.expenseCount}</td>
                  <td className="pr-4 text-right">
                    <button
                      className="icon-btn"
                      disabled={item.id === user.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteUser(item);
                      }}
                      title={item.id === user.id ? 'Admin cannot delete own account' : 'Delete user'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser ? (
        <section className="panel p-4">
          <h3 className="font-semibold">{selectedUser.name || selectedUser.email}</h3>
          <p className="mt-1 text-sm text-zinc-500">Viewing {month} budget data in read-only mode.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-md bg-sky-50 p-3 dark:bg-sky-950/30">
              <p className="text-xs text-zinc-500">Budget</p>
              <p className="text-xl font-semibold">{currency.format(dashboard?.totals?.totalBudget || 0)}</p>
            </div>
            <div className="rounded-md bg-sky-50 p-3 dark:bg-sky-950/30">
              <p className="text-xs text-zinc-500">Planned</p>
              <p className="text-xl font-semibold">{currency.format(dashboard?.totals?.totalPlanned || 0)}</p>
            </div>
            <div className="rounded-md bg-sky-50 p-3 dark:bg-sky-950/30">
              <p className="text-xs text-zinc-500">Spent</p>
              <p className="text-xl font-semibold">{currency.format(dashboard?.totals?.totalSpent || 0)}</p>
            </div>
            <div className="rounded-md bg-sky-50 p-3 dark:bg-sky-950/30">
              <p className="text-xs text-zinc-500">Remaining</p>
              <p className="text-xl font-semibold">{currency.format(dashboard?.totals?.remaining || 0)}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="panel min-w-0 p-4 xl:col-span-3">
          <h3 className="font-semibold">Planned vs actual</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.categories || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Bar dataKey="planned" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4 xl:col-span-2">
          <h3 className="font-semibold">Recent expenses</h3>
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
            {expenses.length ? expenses.slice(0, 12).map((expense) => (
              <div key={expense.id} className="border-b border-sky-100 pb-3 text-sm last:border-0 dark:border-sky-900/50">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{expense.categoryName}</p>
                  <p className="font-semibold">{currency.format(expense.amount)}</p>
                </div>
                <p className="text-xs text-zinc-500">{prettyDate(expense.date)} · {expense.paymentMethod}</p>
              </div>
            )) : <p className="text-sm text-zinc-500">No expenses for this month.</p>}
          </div>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-sky-100 p-4 dark:border-sky-900/50">
          <h3 className="font-semibold">Categories</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-sky-50 text-xs uppercase text-zinc-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th>Group</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-sky-100 dark:border-sky-900/50">
                  <td className="px-4 py-3 font-medium">{category.name}</td>
                  <td>{category.groupName}</td>
                  <td>{currency.format(category.plannedAmount)}</td>
                  <td>{currency.format(category.actualAmount)}</td>
                  <td>{currency.format(category.plannedAmount - category.actualAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
