import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Boxes, Lock, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [suggestedOtp, setSuggestedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered account email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res && res.data && res.data.demoOtp) {
        setSuggestedOtp(res.data.demoOtp);
      }
      setSuccessMsg('A 6-digit verification code has been dispatched to your email.');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to generate password reset code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all verification fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword
      });
      setSuccessMsg(res.data?.message || 'Password has been reset successfully.');
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Password reset failed. Please check the code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillEmail = (val) => {
    setEmail(val);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-slate-850 p-8 rounded-2xl border border-slate-700/60 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Boxes className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">StockSense</h2>
          <p className="mt-1 text-sm text-slate-400">Account Recovery & Password Reset</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && step !== 3 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 && (
          <form className="mt-4 space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registered Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@stocksense.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Requesting Code...' : 'Send Verification OTP'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="pt-3 border-t border-slate-700/60">
              <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Fast-Select Test Account:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillEmail('manager@stocksense.com')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-xs font-medium text-emerald-400 transition-colors text-left"
                >
                  <div className="font-semibold text-slate-200">Manager Account</div>
                  <div className="text-[10px] text-slate-400 truncate">manager@stocksense.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillEmail('staff@stocksense.com')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-xs font-medium text-blue-400 transition-colors text-left"
                >
                  <div className="font-semibold text-slate-200">Staff Account</div>
                  <div className="text-[10px] text-slate-400 truncate">staff@stocksense.com</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-4 space-y-4" onSubmit={handleResetPassword}>
            {suggestedOtp && (
              <div className="p-3 bg-slate-800 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Demo Verification OTP
                  </div>
                  <div className="text-xs text-slate-300 font-mono tracking-widest mt-0.5">{suggestedOtp}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(suggestedOtp)}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium rounded transition-colors"
                >
                  Apply OTP
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono tracking-widest placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Validating & Resetting...' : 'Update Password'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(''); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Request a different code
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Password Updated</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your credentials have been securely updated. You can now log into your StockSense workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-700/60">
          Remember your password?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
