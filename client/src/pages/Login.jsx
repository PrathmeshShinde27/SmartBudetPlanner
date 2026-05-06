import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() => {
    const idleMessage = sessionStorage.getItem('sbp_login_message');
    if (idleMessage) sessionStorage.removeItem('sbp_login_message');
    return location.state?.message || idleMessage || '';
  });
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        navigate('/verify-email', {
          state: {
            email: err.response.data.email,
            message: 'Email verification required. We sent a new OTP.'
          }
        });
        return;
      }
      setError(err.response?.data?.message || 'Could not log in');
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-3xl rounded-[28px] border border-sky-200/10 bg-slate-950/80 p-6 shadow-2xl shadow-sky-950/30">
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-900 p-1">
          <Link className="rounded-xl bg-sky-400 px-4 py-4 text-center text-sm font-semibold text-slate-950" to="/login">
            Login
          </Link>
          <Link className="rounded-xl px-4 py-4 text-center text-sm font-medium text-sky-100 hover:bg-white/5" to="/register">
            Create account
          </Link>
        </div>
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-sky-200">Log in to your budget workspace.</p>
        {error ? <p className="mt-4 rounded-md bg-red-950/80 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md bg-sky-950 p-3 text-sm text-sky-100">{message}</p> : null}
        <div className="mt-6 space-y-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Email</span>
            <input className="input border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" type="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Password</span>
            <div className="relative">
              <input className="input border-slate-700 bg-slate-900 pr-12 text-white placeholder:text-slate-500" type={showPassword ? 'text' : 'password'} required placeholder="Password here" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-300" type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </div>
        <button className="mt-6 w-full rounded-xl bg-sky-400 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-sky-300" type="submit">Login</button>
        <Link className="mt-4 inline-block text-sm text-sky-300 hover:text-white" to="/forgot-password">Forgot password?</Link>
      </form>
    </AuthShell>
  );
}
