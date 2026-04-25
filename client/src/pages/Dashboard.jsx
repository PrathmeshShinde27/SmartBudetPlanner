import { AlertTriangle, Download, PiggyBank, Scale, Wallet, WalletCards } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import { api } from '../lib/api.js';
import { currency, prettyDate } from '../lib/format.js';
import { useBudget } from '../state/BudgetContext.jsx';

const colors = ['#41644a', '#ff7a59', '#f4b942', '#6aa5b8', '#8f6fbd', '#7aa95c', '#d65f5f'];

export default function Dashboard() {
  const { dashboard, categories, refresh, month, loading } = useBudget();

  async function addExpense(input) {
    await api.post('/expense', input);
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

  if (!dashboard) {
    return <div className="panel p-6 text-sm text-zinc-500">Loading dashboard...</div>;
  }

  const pieData = dashboard.categories.filter((item) => item.actual > 0).map((item) => ({
    name: item.name,
    value: item.actual
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-zinc-500">Live monthly summary based on the workbook’s planned vs actual model.</p>
        </div>
        <button className="btn-secondary" onClick={exportExcel}>
          <Download size={16} />
          Excel
        </button>
      </div>

      {dashboard.alerts.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {dashboard.alerts.map((alert) => (
            <div key={alert.categoryId} className="flex items-center gap-3 rounded-lg border border-coral/30 bg-[#fff0eb] p-3 text-sm text-ink dark:bg-red-950 dark:text-red-100">
              <AlertTriangle size={18} />
              {alert.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Budget" value={currency.format(dashboard.totals.totalBudget)} icon={Wallet} />
        <StatCard label="Total Spent" value={currency.format(dashboard.totals.totalSpent)} icon={WalletCards} tone={dashboard.totals.remaining < 0 ? 'hot' : 'default'} />
        <StatCard label="Remaining" value={currency.format(dashboard.totals.remaining)} icon={Scale} tone={dashboard.totals.remaining < 0 ? 'hot' : 'good'} />
        <StatCard label="Savings" value={currency.format(dashboard.totals.savings)} icon={PiggyBank} tone="warn" />
      </div>

      <ExpenseForm categories={categories} onSubmit={addExpense} />

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="panel p-4 xl:col-span-2">
          <h3 className="font-semibold">Spending by category</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {pieData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => currency.format(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4 xl:col-span-3">
          <h3 className="font-semibold">Planned vs actual</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Legend />
                <Bar dataKey="planned" fill="#41644a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#ff7a59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="panel p-4 xl:col-span-3">
          <h3 className="font-semibold">50/30/20 summary</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2">Group</th>
                  <th>Target</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.groupSummary.map((row) => (
                  <tr key={row.groupName} className="border-t border-black/10 dark:border-white/10">
                    <td className="py-3 font-medium">{row.groupName}</td>
                    <td>{row.targetPercent}%</td>
                    <td>{currency.format(row.planned)}</td>
                    <td>{currency.format(row.actual)}</td>
                    <td className={row.difference < 0 ? 'text-coral' : 'text-moss dark:text-mint'}>{currency.format(row.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-4 xl:col-span-2">
          <h3 className="font-semibold">Recent expenses</h3>
          <div className="mt-3 space-y-3">
            {dashboard.recentExpenses.length ? dashboard.recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 text-sm last:border-0 dark:border-white/10">
                <div>
                  <p className="font-medium">{expense.categoryName}</p>
                  <p className="text-xs text-zinc-500">{prettyDate(expense.date)} · {expense.paymentMethod}</p>
                </div>
                <p className="font-semibold">{currency.format(expense.amount)}</p>
              </div>
            )) : <p className="text-sm text-zinc-500">No expenses for this month.</p>}
          </div>
        </section>
      </div>

      {loading ? <p className="text-xs text-zinc-500">Refreshing...</p> : null}
    </div>
  );
}
