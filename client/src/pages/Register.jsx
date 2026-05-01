import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneCountryCode: '+91',
    phoneNumber: '',
    city: '',
    password: '',
    confirmPassword: ''
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await register({
        name: form.name,
        email: form.email,
        phoneCountryCode: form.phoneCountryCode,
        phoneNumber: form.phoneNumber,
        city: form.city,
        password: form.password
      });
      navigate('/verify-email', {
        state: {
          email: form.email,
          message: 'Account created. Enter the OTP sent to your email.'
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register');
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-3xl rounded-[28px] border border-sky-200/10 bg-slate-950/80 p-6 shadow-2xl shadow-sky-950/30">
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-900 p-1">
          <Link className="rounded-xl px-4 py-4 text-center text-sm font-medium text-sky-100 hover:bg-white/5" to="/login">
            Login
          </Link>
          <Link className="rounded-xl bg-sky-400 px-4 py-4 text-center text-sm font-semibold text-slate-950" to="/register">
            Create account
          </Link>
        </div>
        <h2 className="text-2xl font-semibold">Create your planner</h2>
        <p className="mt-1 text-sm text-sky-200">Your budget data stays isolated to your account.</p>
        {error ? <p className="mt-4 rounded-md bg-red-950/80 p-3 text-sm text-red-100">{error}</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Full name</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" placeholder="Prathmesh Shinde" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Email</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" type="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Phone</span>
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <select
                className="input border-slate-700 bg-slate-900 text-white"
                value={form.phoneCountryCode}
                onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+971">+971</option>
              </select>
              <input
                className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                placeholder="9876543210"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">City</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" placeholder="Pune" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Password</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" type="password" minLength={8} required placeholder="Use 8+ characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Confirm password</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" type="password" minLength={8} required placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </label>
        </div>
        <p className="mt-4 text-xs text-sky-200">Use 8+ characters. A stronger password should include uppercase, lowercase, number, and special character.</p>
        <button className="mt-5 w-full rounded-xl bg-sky-400 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-sky-300" type="submit">Create account</button>
      </form>
    </AuthShell>
  );
}
