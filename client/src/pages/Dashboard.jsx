import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Download, Scale, Wallet, WalletCards } from 'lucide-react';
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
import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import Toast from '../components/Toast.jsx';
import { api } from '../lib/api.js';
import { currency, prettyDate } from '../lib/format.js';
import { useBudget } from '../state/BudgetContext.jsx';

const colors = ['#41644a', '#ff7a59', '#f4b942', '#6aa5b8', '#8f6fbd', '#7aa95c', '#d65f5f'];

function formatYmd(date) {
  const year = date.getFullYear();
  const monthValue = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${monthValue}-${day}`;
}

function currentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return formatYmd(date);
}

function shiftWeek(weekStart, direction) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + direction * 7);
  return formatYmd(date);
}

function weekEndFromStart(weekStart) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + 6);
  return formatYmd(date);
}

export default function Dashboard() {
  const { dashboard, categories, paymentTypes, refresh, month, loading } = useBudget();
  const [toast, setToast] = useState(null);
  const [weekStart, setWeekStart] = useState(() => currentWeekStart());
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadWeek() {
      try {
        setWeeklyLoading(true);
        const response = await api.get('/dashboard/week', { params: { weekStart } });
        if (!ignore) {
          setWeeklySummary(response.data);
        }
      } catch (error) {
        if (!ignore) {
          setToast({ message: error.response?.data?.message || 'Could not load weekly spend', type: 'error' });
          window.setTimeout(() => setToast(null), 3000);
        }
      } finally {
        if (!ignore) {
          setWeeklyLoading(false);
        }
      }
    }

    loadWeek();
    return () => {
      ignore = true;
    };
  }, [weekStart]);

  async function addExpense(input) {
    try {
      await api.post('/expense', input);
      await refresh();
      setToast({ message: 'Expense added', type: 'success' });
      window.setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Could not add expense', type: 'error' });
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  async function exportExcel() {
    const response = await api.get('/export/excel', { params: { month }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Smart-Budget-Planer-${month}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!dashboard) {
    return <div className="panel p-6 text-sm text-zinc-500">Loading dashboard...</div>;
  }

  const pieData = dashboard.categories.filter((item) => item.actual > 0).map((item) => ({
    name: item.name,
    value: item.actual,
    percent: dashboard.totals.totalSpent > 0 ? (item.actual / dashboard.totals.totalSpent) * 100 : 0
  }));

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden">
      <Toast toast={toast} onClose={() => setToast(null)} />
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
        <StatCard label="Total Planned" value={currency.format(dashboard.totals.totalPlanned)} icon={ClipboardList} />
        <StatCard label="Total Spent" value={currency.format(dashboard.totals.totalSpent)} icon={WalletCards} tone={dashboard.totals.remaining < 0 ? 'hot' : 'default'} />
        <StatCard label="Remaining" value={currency.format(dashboard.totals.remaining)} icon={Scale} tone={dashboard.totals.remaining < 0 ? 'hot' : 'good'} />
      </div>

      <ExpenseForm categories={categories} paymentTypes={paymentTypes} onSubmit={addExpense} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-5">
        <section className="panel min-w-0 p-4 xl:col-span-2">
          <h3 className="font-semibold">Spending by category</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${percent.toFixed(1)}%`}
                >
                  {pieData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => `${currency.format(value)} (${props.payload.percent.toFixed(1)}%)`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel min-w-0 p-4 xl:col-span-3">
          <h3 className="font-semibold">Planned vs actual</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip formatter={(value) => currency.format(value)} />
                <Legend />
                <Bar dataKey="planned" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#ff7a59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-5">
        <section className="panel min-w-0 p-4 xl:col-span-3">
          <h3 className="font-semibold">Monthly analysis</h3>
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2">Bucket</th>
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

        <section className="panel min-w-0 p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Weekly analysis</h3>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-ink dark:shadow-none dark:hover:bg-sky-300"
                disabled={weeklyLoading}
                onClick={() => setWeekStart((value) => shiftWeek(value, -1))}
                title="Previous week"
                type="button"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-400 dark:text-ink dark:shadow-none dark:hover:bg-sky-300"
                disabled={weeklyLoading}
                onClick={() => setWeekStart((value) => shiftWeek(value, 1))}
                title="Next week"
                type="button"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Selected week</p>
                  <p className="mt-1 font-medium">
                    Week: {prettyDate(weeklySummary?.startDate || weekStart)} - {prettyDate(weeklySummary?.endDate || weekEndFromStart(weekStart))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Weekly spend</p>
                  <p className="text-xl font-semibold text-sky-700 dark:text-sky-300">
                    {weeklyLoading ? 'Loading...' : currency.format(weeklySummary?.actual || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel min-w-0 p-4 xl:col-span-2">
          <h3 className="font-semibold">Recent expenses</h3>
          <div className="mt-3 space-y-3">
            {dashboard.recentExpenses.length ? dashboard.recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 text-sm last:border-0 dark:border-white/10">
                <div>
                  <p className="font-medium">{expense.categoryName}</p>
                  <p className="text-xs text-zinc-500">Bill {prettyDate(expense.billDate || expense.date)} · {expense.paymentMethod}</p>
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
