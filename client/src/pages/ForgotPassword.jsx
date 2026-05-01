import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function ForgotPassword() {
  const { isAuthenticated, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function requestOtp(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await forgotPassword(email);
      setOtpSent(true);
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset OTP');
    }
  }

  async function submitReset(event) {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await resetPassword({ email, otp: form.otp, newPassword: form.newPassword });
      setForm({ otp: '', newPassword: '', confirmPassword: '' });
      navigate('/login', {
        replace: true,
        state: {
          message: 'Password reset successful. Please log in with your new password.',
          email
        }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-xl rounded-[28px] border border-sky-200/10 bg-slate-950/80 p-6 shadow-2xl shadow-sky-950/30">
        <h2 className="text-2xl font-semibold">Forgot password</h2>
        <p className="mt-1 text-sm text-sky-200">Verify your email with OTP, then set a new password.</p>
        {message ? <p className="mt-4 rounded-md bg-sky-950 p-3 text-sm text-sky-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md bg-red-950/80 p-3 text-sm text-red-100">{error}</p> : null}

        <form onSubmit={requestOtp} className="mt-6 space-y-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Email</span>
            <input className="input border-slate-700 bg-slate-900 text-white" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="w-full rounded-xl bg-sky-400 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-sky-300" type="submit">Send OTP</button>
        </form>

        {otpSent ? (
          <form onSubmit={submitReset} className="mt-6 space-y-4 border-t border-slate-800 pt-6">
            <input className="input border-slate-700 bg-slate-900 text-white" inputMode="numeric" maxLength={6} required placeholder="OTP" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })} />
            <input className="input border-slate-700 bg-slate-900 text-white" type="password" minLength={8} required placeholder="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            <input className="input border-slate-700 bg-slate-900 text-white" type="password" minLength={8} required placeholder="Confirm new password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            <button className="w-full rounded-xl bg-sky-400 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-sky-300" type="submit">Reset password</button>
          </form>
        ) : null}

        <Link className="mt-4 inline-block text-sm text-sky-300 hover:text-white" to="/login">Back to login</Link>
      </div>
    </AuthShell>
  );
}
