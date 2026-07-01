import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, AlertCircle, Building2 } from 'lucide-react';
import { MOCK_USERS, UserAccount } from '../data';
import { googleSheetsClient, isGoogleConfigured } from '../lib/googleSheetsClient';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    const performLocalFallback = () => {
      const matchedUser = MOCK_USERS.find(
        u => u.email === email.trim().toLowerCase() && u.password === password
      );
      if (matchedUser) {
        onLoginSuccess(matchedUser);
      } else {
        setError('Invalid email address or password. Please try again.');
      }
    };

    if (isGoogleConfigured) {
      try {
        const payload = await googleSheetsClient.loadData();
        const users = payload.users || [];
        const matched = users.find(
          (u: any) => String(u.email).toLowerCase() === email.trim().toLowerCase() && String(u.password) === password
        );

        setIsLoading(false);

        if (matched) {
          onLoginSuccess({
            email: matched.email,
            password: matched.password,
            name: matched.name,
            role: matched.role
          });
        } else {
          setError('Invalid email address or password. Please try again.');
        }
      } catch (err) {
        console.error('[Google Sheets Auth Error] Falling back to local accounts:', err);
        performLocalFallback();
      }
    } else {
      // Simulate network authentication delay
      setTimeout(() => {
        setIsLoading(false);
        performLocalFallback();
      }, 800);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-900 to-zinc-950 p-4 select-text relative overflow-hidden font-sans">
      
      {/* Background Gradient Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1c4e89]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* Core Header Logo / Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#1c4e89] flex items-center justify-center shadow-lg shadow-[#1c4e89]/30 mb-4 animate-bounce duration-[3000ms]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mega HR</h1>
          <p className="text-zinc-400 text-xs mt-2 max-w-xs leading-relaxed">
            Enterprise Core Console. Securely manage corporate payroll, employee records, and appraisals.
          </p>
        </div>

        {/* Error Notification HUD */}
        {error && (
          <div className="mb-6 p-4.5 bg-red-950/40 border border-red-900/50 text-red-400 text-xs rounded-lg flex items-start gap-3 animate-in slide-in-from-top-4 duration-200">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Email Input Group */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Corporate Username or Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jennylaw.hr or admin@acme.com"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-[#1c4e89] focus:ring-1 focus:ring-[#1c4e89]/30 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password Input Group */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Access Password
              </label>
              <a 
                href="#forgot" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Default credentials are:\nUsername: jennylaw.hr\nPassword: admin123#\n\nFallback Admin Email: admin@acme.com\nPassword: password123');
                }}
                className="text-[10px] text-[#1c4e89] hover:underline font-semibold"
              >
                Help?
              </a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-[#1c4e89] focus:ring-1 focus:ring-[#1c4e89]/30 transition-all font-medium"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 bg-[#1c4e89] hover:bg-[#153b67] text-white text-sm font-semibold rounded-lg shadow-md shadow-[#1c4e89]/10 hover:shadow-[#1c4e89]/20 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Footer Notice */}
        <div className="mt-8 pt-6 border-t border-zinc-800/60 flex items-center justify-center gap-2 text-zinc-500 text-[10px] uppercase font-mono font-bold tracking-wider">
          <Building2 className="w-3.5 h-3.5" />
          <span>Security Level: Enterprise Confidential</span>
        </div>

      </div>
    </div>
  );
}
