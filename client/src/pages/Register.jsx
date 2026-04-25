import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] p-4 dark:bg-[#101513]">
      <form onSubmit={submit} className="panel w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-ink dark:text-white">Create your planner</h1>
        <p className="mt-1 text-sm text-zinc-500">Your categories, budgets, and expenses stay isolated to your account.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
        <div className="mt-5 space-y-4">
          <label>
            <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Name</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Email</span>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Password</span>
            <input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        </div>
        <button className="btn-primary mt-5 w-full" type="submit">Create account</button>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account? <Link className="font-medium text-moss dark:text-mint" to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
