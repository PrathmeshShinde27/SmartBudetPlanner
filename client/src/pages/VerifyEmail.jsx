import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function VerifyEmail() {
  const { isAuthenticated, verifyEmail, resendVerificationOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await verifyEmail(email, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify OTP');
    }
  }

  async function resend() {
    setError('');
    try {
      const result = await resendVerificationOtp(email);
      setMessage(result.message || 'OTP sent again');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP');
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-xl rounded-[28px] border border-sky-200/10 bg-slate-950/80 p-6 shadow-2xl shadow-sky-950/30">
        <h2 className="text-2xl font-semibold">Verify your email</h2>
        <p className="mt-1 text-sm text-sky-200">Enter the 6-digit OTP sent to your inbox.</p>
        {message ? <p className="mt-4 rounded-md bg-sky-950 p-3 text-sm text-sky-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md bg-red-950/80 p-3 text-sm text-red-100">{error}</p> : null}
        <div className="mt-6 space-y-4">
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">Email</span>
            <input className="input border-slate-700 bg-slate-900 text-white" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-sky-100">OTP</span>
            <input className="input border-slate-700 bg-slate-900 text-white" inputMode="numeric" maxLength={6} required placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
          </label>
        </div>
        <button className="mt-6 w-full rounded-xl bg-sky-400 px-4 py-4 text-sm font-bold text-slate-950 transition hover:bg-sky-300" type="submit">Verify email</button>
        <div className="mt-4 flex justify-between text-sm">
          <button className="text-sky-300 hover:text-white" type="button" onClick={resend}>Resend OTP</button>
          <Link className="text-sky-300 hover:text-white" to="/login">Back to login</Link>
        </div>
      </form>
    </AuthShell>
  );
}
