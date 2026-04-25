import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log in');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-4 dark:bg-[#101513]">
      <form onSubmit={submit} className="panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-moss text-white">
            <BarChart3 />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink dark:text-white">Smart Budget Planner</h1>
            <p className="text-sm text-zinc-500">Sign in to your monthly budget</p>
          </div>
        </div>
        {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
        <div className="space-y-4">
          <label>
            <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Email</span>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Password</span>
            <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        </div>
        <button className="btn-primary mt-5 w-full" type="submit">Log in</button>
        <p className="mt-4 text-center text-sm text-zinc-500">
          New here? <Link className="font-medium text-moss dark:text-mint" to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
