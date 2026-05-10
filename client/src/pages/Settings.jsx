import { Copy, Download, ExternalLink, Info } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api.js';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useBudget } from '../state/BudgetContext.jsx';

const passwordPattern = '^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';
const passwordHint = 'Use 8+ characters with at least one letter, one number, and one special character.';

export default function Settings() {
  const { month, refresh } = useBudget();
  const { user, updateProfile, updatePassword } = useAuth();
  const [targetMonth, setTargetMonth] = useState(month);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState({ name: user?.name || '', city: user?.city || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      await updateProfile(profile);
      showToast('Profile updated');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update profile', 'error');
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    try {
      await updatePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update password', 'error');
    }
  }

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
    a.download = `Smart-Budget-Planer-${month}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-zinc-500">Monthly budget utilities and export tools.</p>
      </div>

      {message ? <p className="rounded-md bg-mint p-3 text-sm text-ink dark:bg-emerald-950 dark:text-emerald-100">{message}</p> : null}

      <section className="panel p-4">
        <h3 className="font-semibold">Profile</h3>
        <form onSubmit={saveProfile} className="mt-4 grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Name</span>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">City / Address</span>
            <input className="input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Email</span>
            <input className="input opacity-70" value={user?.email || ''} disabled />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Phone</span>
            <input className="input opacity-70" value={`${user?.phoneCountryCode || ''} ${user?.phoneNumber || ''}`.trim()} disabled />
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">Save profile</button>
          </div>
        </form>
      </section>

      <section className="panel p-4">
        <h3 className="font-semibold">Change password</h3>
        <form onSubmit={savePassword} className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="input" type="password" placeholder="Current password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          <input className="input" type="password" minLength={8} pattern={passwordPattern} title={passwordHint} placeholder="Example: Budget@123" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          <input className="input" type="password" placeholder="Confirm new password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
          <p className="text-xs text-zinc-500 md:col-span-3">{passwordHint}</p>
          <div className="md:col-span-3">
            <button className="btn-primary" type="submit">Update password</button>
          </div>
        </form>
      </section>

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

      <section className="panel p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
            <Info size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Guide + About</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Smart Budget Planner helps you plan monthly income, assign category budgets, and track spending with live charts.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ['1. Set income 💰', 'Go to Categories, enter your monthly income, and save it. The app shows Needs, Wants, and Savings targets.'],
            ['2. Plan categories 🧾', 'Create or edit categories under Needs, Wants, and Savings. Planned totals update instantly.'],
            ['3. Add expenses ⚡', 'Use Dashboard or Expenses to add daily spends with amount, category, payment method, date, and notes.'],
            ['4. Review dashboard 📊', 'Compare budget, planned, spent, remaining balance, charts, and over-budget warnings.'],
            ['5. Change month 📅', 'Use the month selector at the top to view or plan another month.'],
            ['6. Export Excel 📤', 'Download a monthly Excel report from Settings or Dashboard.']
          ].map(([title, text]) => (
            <div key={title} className="rounded-md border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-sky-100 p-3 text-sm dark:border-sky-900/50">
          <p className="font-semibold">Created by Prathmesh Shinde</p>
          <p className="mt-1 text-zinc-500">
            This application requires visible attribution in public deployments and exported reports.
          </p>
          <a className="mt-2 inline-flex items-center gap-2 text-sky-700 hover:text-sky-900 dark:text-sky-300" href="https://prathmeshshinde.com" target="_blank" rel="noreferrer">
            Visit prathmeshshinde.com <ExternalLink size={15} />
          </a>
        </div>
      </section>
    </div>
  );
}
