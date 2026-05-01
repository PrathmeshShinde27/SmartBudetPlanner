import { BarChart3, CreditCard, LayoutDashboard, LogOut, Moon, Settings, ShieldCheck, Tags, Sun } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import { useBudget } from '../state/BudgetContext.jsx';

const baseLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: CreditCard },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { month, setMonth } = useBudget();
  const [dark, setDark] = useState(() => localStorage.getItem('sbp_dark') === 'true');
  const links = user?.role === 'admin'
    ? [...baseLinks.slice(0, 3), { to: '/admin', label: 'Admin', icon: ShieldCheck }, baseLinks[3]]
    : baseLinks;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sbp_dark', String(dark));
  }, [dark]);

  return (
    <div className="min-h-screen bg-[#f4faff] text-ink dark:bg-[#07111f] dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-sky-100 bg-white px-4 py-5 dark:border-sky-900/50 dark:bg-slate-950 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-moss text-white dark:bg-mint dark:text-ink">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold">Smart Budget</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">50/30/20 planner</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-mint text-ink dark:bg-white/10 dark:text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-slate-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="font-semibold text-ink dark:text-white">Built by Prathmesh Shinde</p>
          <a className="mt-1 block text-sky-700 hover:text-sky-900 dark:text-sky-300" href="https://prathmeshshinde.com" target="_blank" rel="noreferrer">
            prathmeshshinde.com
          </a>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-sky-100 bg-[#f4faff]/90 px-4 py-3 backdrop-blur dark:border-sky-900/50 dark:bg-[#07111f]/90 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Welcome back</p>
              <h1 className="text-xl font-semibold">{user?.name || user?.email}</h1>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input w-40"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
              <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle dark mode">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className="icon-btn" onClick={logout} title="Log out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-moss text-white' : 'bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-200'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="px-4 py-5 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
