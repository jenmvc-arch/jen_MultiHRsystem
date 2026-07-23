import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { MOCK_USERS, UserAccount } from '../data';
import { googleSheetsClient, isGoogleConfigured } from '../lib/googleSheetsClient';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        let matched = users.find(
          (u: any) => String(u.email).toLowerCase() === email.trim().toLowerCase() && String(u.password) === password
        );

        if (!matched && users.length === 0) {
          const fallbackUser = MOCK_USERS.find(
            u => u.email === email.trim().toLowerCase() && u.password === password
          );
          if (fallbackUser) {
            matched = fallbackUser;
          }
        }

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F2E8D8] to-[#FFF8EF] p-4 select-text relative overflow-hidden font-sans text-[#333333]">
      
      {/* Background Accents (Minimal Red Curves) */}
      <div className="absolute top-0 left-0 w-64 h-full pointer-events-none opacity-20">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#A32626] fill-current">
          <path d="M0,0 C50,30 20,70 0,100 Z" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-96 h-64 pointer-events-none opacity-20">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#A32626] fill-current">
          <path d="M100,100 C60,80 80,30 100,0 Z" />
        </svg>
      </div>
      
      {/* Optional subtle dotted pattern in corners */}
      <div className="absolute top-4 left-4 w-32 h-32 bg-[radial-gradient(#A32626_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-4 right-4 w-32 h-32 bg-[radial-gradient(#A32626_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Logo at the top center */}
        <img 
          src="/redpoint-logo.png" 
          alt="RedPoint Sdn Bhd Logo" 
          className="h-16 w-auto mb-8 object-contain drop-shadow-sm" 
          onError={(e) => {
            // Fallback if logo is missing
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<div class="text-[#A32626] font-bold text-2xl mb-8 tracking-tight">RedPoint HRMS</div>');
          }}
        />

        {/* Login Card */}
        <div className="w-full bg-[#FFFFFF] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#E5E5E5] p-8">
          
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-[#333333]">Staff Sign In</h2>
            <p className="text-sm text-gray-500 mt-1">Internal HRMS Portal</p>
          </div>

          {/* Error Notification HUD */}
          {error && (
            <div className="mb-6 p-4 bg-[#FFF8EF] border border-[#A32626]/30 text-[#8F1F1F] text-sm rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#A32626]" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            
            {/* Email Input Group */}
            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your corporate email"
                  className="w-full h-12 pl-11 pr-4 bg-white border border-[#E5E5E5] rounded-xl text-sm text-[#333333] placeholder-gray-400 focus:outline-none focus:border-[#A32626] focus:ring-1 focus:ring-[#A32626]/30 transition-all"
                />
              </div>
            </div>

            {/* Password Input Group */}
            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-11 pr-11 bg-white border border-[#E5E5E5] rounded-xl text-sm text-[#333333] placeholder-gray-400 focus:outline-none focus:border-[#A32626] focus:ring-1 focus:ring-[#A32626]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E5E5] text-[#A32626] focus:ring-[#A32626] focus:ring-offset-0 cursor-pointer accent-[#A32626]"
                />
                <span className="text-sm text-gray-600 group-hover:text-[#333333] transition-colors">Remember Me</span>
              </label>
              
              <a 
                href="#forgot" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Default credentials are:\nUsername: jennylaw.hr\nPassword: admin123#\n\nFallback Admin Email: admin@acme.com\nPassword: password123');
                }}
                className="text-sm text-[#A32626] hover:text-[#8F1F1F] font-semibold transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-12 mt-4 bg-[#A32626] hover:bg-[#8F1F1F] text-white text-base font-semibold rounded-xl shadow-md shadow-[#A32626]/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#A32626]/50 focus:ring-offset-1 ${
                isLoading ? 'opacity-80 cursor-wait' : 'hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <p className="text-sm font-medium text-gray-500">
          © 2026 RedPoint HRMS. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
