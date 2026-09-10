import React, { useEffect, useState } from 'react';
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { MOCK_USERS, UserAccount } from '../data';
import { googleSheetsClient, isGoogleConfigured } from '../lib/googleSheetsClient';
import {
  employeeSupabase,
  supabase,
  supabaseClient,
  isSupabaseConfigured,
} from '../lib/supabaseClient';
import {
  isEmployeeSignerRole,
  isRoleAllowedForLoginPortal,
  LoginPortal,
} from '../lib/userRoles';
import { useFeedback } from './GlobalFeedbackSystem';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
  portal: LoginPortal;
}

export default function LoginView({ onLoginSuccess, portal }: LoginViewProps) {
  const { showInfoModal } = useFeedback();
  const loginPortal = portal;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeOtp, setEmployeeOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [employeeRecoveryMode, setEmployeeRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined' || portal !== 'employee') return null;
    return new URLSearchParams(window.location.search).get('notice') === 'demo-removed'
      ? 'Demo access has been removed. Sign in with your employee account to continue.'
      : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const isLocalPreview = typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const isEmployeeSigner = (user: Pick<UserAccount, 'role'>) => {
    return isEmployeeSignerRole(user.role);
  };

  const accountMatchesSelectedPortal = (user: Pick<UserAccount, 'role'>) =>
    isRoleAllowedForLoginPortal(user.role, loginPortal);

  const getPortalMismatchMessage = (role: string) => {
    const accountType = isEmployeeSignerRole(role) ? 'Employee' : 'Admin User';
    return `This account belongs to the ${accountType} login. Switch to ${accountType} to continue.`;
  };

  const loadEmployeeAccountProfile = async (
    client: any,
    fallback: UserAccount
  ): Promise<UserAccount> => {
    try {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.access_token) return fallback;
      const response = await fetch('/api/employee-auth/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return fallback;
      const profile = await response.json();
      return {
        ...fallback,
        mustChangePassword: Boolean(profile.mustChangePassword),
        profileLoadedFromServer: true,
      };
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (loginPortal !== 'employee') return;
    const employeeAuthClient = employeeSupabase || supabase;
    if (!employeeAuthClient) return;
    let cancelled = false;

    void employeeAuthClient.auth.getUser().then(async ({ data, error: authError }) => {
      if (cancelled || authError || !data.user?.email) return;

      setIsLoading(true);
      const { data: sessionData } = await employeeAuthClient.auth.getSession();
      const profileResponse = await fetch('/api/employee-auth/profile', {
        credentials: 'include',
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : undefined,
      });
      const profile = await profileResponse.json().catch(() => ({}));
      if (cancelled) return;
      setIsLoading(false);
      if (!profileResponse.ok || !profile.employeeId) {
        await employeeAuthClient.auth.signOut({ scope: 'local' });
        setError(profile.error || 'This employee account is not linked to an active employee profile.');
        return;
      }

      onLoginSuccess({
        email: profile.email || data.user.email,
        password: '',
        name: data.user.user_metadata?.name || profile.email || data.user.email,
        role: 'Employee',
        mustChangePassword: Boolean(profile.mustChangePassword),
        profileLoadedFromServer: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loginPortal]);

  const completeLogin = async (matchedUser: UserAccount) => {
    const employeeAuthClient = employeeSupabase || supabase;
    if (employeeAuthClient && isEmployeeSigner(matchedUser)) {
      const signerEmail = String(matchedUser.email || '').trim().toLowerCase();
      if (!signerEmail.includes('@')) {
        setIsLoading(false);
        setError('Employee onboarding accounts must use a valid email address.');
        return;
      }

      const {
        data: { user: authenticatedUser },
      } = await employeeAuthClient.auth.getUser();
      if (authenticatedUser?.email?.toLowerCase() === signerEmail) {
        setIsLoading(false);
        onLoginSuccess(await loadEmployeeAccountProfile(employeeAuthClient, matchedUser));
        return;
      }

      const { error: signInError } = await employeeAuthClient.auth.signInWithPassword({
        email: signerEmail,
        password,
      });
      setIsLoading(false);
      if (signInError) {
        setError(signInError.message || 'Invalid employee email or password.');
        return;
      }
      onLoginSuccess(await loadEmployeeAccountProfile(employeeAuthClient, matchedUser));
      return;
    }

    if (employeeAuthClient) {
      await employeeAuthClient.auth.signOut({ scope: 'local' });
    }
    setIsLoading(false);
    onLoginSuccess(matchedUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthNotice(null);

    // Validate inputs
    if (!email.trim() || (loginPortal === 'admin' && !password) || (loginPortal === 'employee' && !employeeRecoveryMode && !password)) {
      setError(loginPortal === 'admin' ? 'Please fill in all fields.' : 'Please enter your employee email and password.');
      return;
    }

    setIsLoading(true);

    if (loginPortal === 'employee' && employeeRecoveryMode) {
      if (!otpRequested) {
        const response = await fetch('/api/employee-auth/otp/request', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), purpose: 'password_reset' }),
        });
        const payload = await response.json().catch(() => ({}));
        setIsLoading(false);
        if (!response.ok) {
          setError(payload.error || 'The password reset code could not be sent.');
          return;
        }
        setOtpRequested(true);
        setAuthNotice(`A password reset code was sent to ${email.trim().toLowerCase()}.`);
        return;
      }

      if (recoveryPassword.length < 8 || recoveryPassword !== recoveryPasswordConfirm) {
        setIsLoading(false);
        setError(recoveryPassword.length < 8
          ? 'The new password must be at least 8 characters.'
          : 'The new password and confirmation do not match.');
        return;
      }

      const response = await fetch('/api/employee-auth/otp/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: employeeOtp, purpose: 'password_reset' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsLoading(false);
        setError(payload.error || 'The verification code is invalid.');
        return;
      }
      const setupResponse = await fetch('/api/employee-auth/complete-setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: recoveryPassword }),
      });
      const profile = await setupResponse.json().catch(() => ({}));
      if (!setupResponse.ok) {
        setIsLoading(false);
        setError(profile.error || 'The password could not be reset.');
        return;
      }
      setIsLoading(false);
      onLoginSuccess({
        email: profile.email || email.trim().toLowerCase(),
        password: '',
        name: email.trim(),
        role: 'Employee',
        mustChangePassword: false,
        profileLoadedFromServer: true,
      });
      return;
    }

    if (loginPortal === 'employee') {
      const employeeAuthClient = employeeSupabase || supabase;
      if (!employeeAuthClient) {
        setIsLoading(false);
        setError('Secure employee login is unavailable. Please contact HR.');
        return;
      }
      const { data: authData, error: signInError } = await employeeAuthClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError || !authData.user) {
        setIsLoading(false);
        setError(signInError?.message || 'Invalid employee email or password.');
        return;
      }
      const profile = await loadEmployeeAccountProfile(employeeAuthClient, {
        email: authData.user.email || email.trim().toLowerCase(),
        password: '',
        name: authData.user.user_metadata?.name || email.trim(),
        role: 'Employee',
      });
      setIsLoading(false);
      if (!profile.profileLoadedFromServer) {
        await employeeAuthClient.auth.signOut({ scope: 'local' });
        setError('The employee account could not be verified with the HR system.');
        return;
      }
      onLoginSuccess(profile);
      return;
    }

    if (loginPortal === 'admin') {
      try {
        if (isGoogleConfigured && !isSupabaseConfigured) {
          const googleResponse = await fetch('/api/auth/google-login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: email.trim(),
              password,
            }),
          });
          const googlePayload = await googleResponse.json().catch(() => ({}));
          if (googleResponse.ok && googlePayload.user) {
            setIsLoading(false);
            onLoginSuccess({
              email: googlePayload.user.email,
              password: '',
              name: googlePayload.user.name,
              role: googlePayload.user.role,
              profileLoadedFromServer: true,
            });
            return;
          }
          if (googleResponse.status === 401 || googleResponse.status === 403) {
            setIsLoading(false);
            setError(googlePayload.error || 'Invalid username or password.');
            return;
          }
        }

        const secureResponse = await fetch('/api/auth/admin-login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: email.trim(),
            password,
          }),
        });
        const securePayload = await secureResponse.json().catch(() => ({}));
        if (secureResponse.ok && securePayload.user) {
          setIsLoading(false);
          onLoginSuccess({
            email: securePayload.user.email,
            password: '',
            name: securePayload.user.name,
            role: securePayload.user.role,
            mustChangePassword: Boolean(securePayload.user.mustChangePassword),
            profileLoadedFromServer: true,
          });
          return;
        }
        if (secureResponse.status === 401 || secureResponse.status === 403) {
          setIsLoading(false);
          setError(securePayload.error || 'Invalid username or password.');
          return;
        }
        // A missing local API server is allowed to use the existing offline
        // demo accounts so the localhost preview remains usable.
        if (!isLocalPreview) {
          setIsLoading(false);
          setError(securePayload.error || 'Secure admin login is unavailable. Please contact the system administrator.');
          return;
        }
      } catch (secureError) {
        console.warn('[Admin Auth] Secure session endpoint unavailable:', secureError);
        if (!isLocalPreview) {
          setIsLoading(false);
          setError('Secure admin login is unavailable. Please try again or contact the system administrator.');
          return;
        }
      }
    }

    const performLocalFallback = async () => {
      const credentialMatch = MOCK_USERS.find(
        u => u.email === email.trim().toLowerCase() && u.password === password
      );
      if (credentialMatch && accountMatchesSelectedPortal(credentialMatch)) {
        await completeLogin(credentialMatch);
      } else if (credentialMatch) {
        setIsLoading(false);
        setError(getPortalMismatchMessage(credentialMatch.role));
      } else {
        setIsLoading(false);
        setError('Invalid username or password. Please try again.');
      }
    };

    const performRemoteAuth = async (client: any, sourceName: string) => {
      try {
        const payload = await client.loadData();
        const users = payload.users || [];
        const credentialMatch = users.find(
          (u: any) => String(u.email).toLowerCase() === email.trim().toLowerCase() && String(u.password) === password
        );
        let matched = credentialMatch && accountMatchesSelectedPortal(credentialMatch)
          ? credentialMatch
          : undefined;

        if (!matched && users.length === 0) {
          const fallbackUser = MOCK_USERS.find(
            u => u.email === email.trim().toLowerCase() && u.password === password
          );
          if (fallbackUser && accountMatchesSelectedPortal(fallbackUser)) {
            matched = fallbackUser;
          }
        }

        if (matched) {
          await completeLogin({
            email: matched.email,
            password: matched.password,
            name: matched.name,
            role: matched.role,
          });
        } else {
          setIsLoading(false);
          setError(
            credentialMatch
              ? getPortalMismatchMessage(String(credentialMatch.role || ''))
              : 'Invalid username or password. Please try again.'
          );
        }
      } catch (err) {
        console.error(`[${sourceName} Auth Error] Falling back to local accounts:`, err);
        await performLocalFallback();
      }
    };

    if (isSupabaseConfigured) {
      await performRemoteAuth(supabaseClient, 'Supabase');
    } else if (isGoogleConfigured) {
      await performRemoteAuth(googleSheetsClient, 'Google Sheets');
    } else {
      // Simulate network authentication delay
      setTimeout(() => {
        void performLocalFallback();
      }, 800);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f7f2eb] p-4 font-sans text-[#2f2523] select-text sm:p-6 lg:p-10">

      {/* Background Accents (Minimal Red Curves) */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-64 opacity-20">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#A32626] fill-current">
          <path d="M0,0 C50,30 20,70 0,100 Z" />
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-96 opacity-20">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#A32626] fill-current">
          <path d="M100,100 C60,80 80,30 100,0 Z" />
        </svg>
      </div>

      {/* Optional subtle dotted pattern in corners */}
      <div className="pointer-events-none absolute left-4 top-4 h-32 w-32 bg-[radial-gradient(#A32626_1px,transparent_1px)] opacity-10 [background-size:16px_16px]"></div>
      <div className="pointer-events-none absolute bottom-4 right-4 h-32 w-32 bg-[radial-gradient(#A32626_1px,transparent_1px)] opacity-10 [background-size:16px_16px]"></div>

      {/* Main Container */}
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-10">
        <div className="hidden max-w-xl text-left lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#A32626]/15 bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A32626]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {loginPortal === 'admin' ? 'Employer workspace' : 'Employee workspace'}
          </div>
          <h1 className="max-w-lg text-5xl font-bold leading-[0.98] tracking-[-0.04em] text-[#342624]">
            {loginPortal === 'admin'
              ? 'Keep people, payroll and compliance moving.'
              : 'Access the work information you need, securely.'}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#745f59]">
            {loginPortal === 'admin'
              ? 'A focused workspace for the decisions that keep your company running.'
              : 'View your profile, payslips, leave, documents and HR support in one place.'}
          </p>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#A32626]/10 bg-white/55 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#A32626]">
                {loginPortal === 'admin' ? 'People' : 'Profile'}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#745f59]">
                {loginPortal === 'admin' ? 'One employer console' : 'Your employee workspace'}
              </p>
            </div>
            <div className="rounded-2xl border border-[#A32626]/10 bg-white/55 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#A32626]">
                {loginPortal === 'admin' ? 'Control' : 'Support'}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#745f59]">
                {loginPortal === 'admin' ? 'Clear employee access' : 'Help when you need it'}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        
        {/* Logo at the top center */}
        <img 
          src="/redpoint-logo.png" 
          alt="RedPoint Sdn Bhd Logo" 
          className="mx-auto mb-6 h-14 w-auto object-contain drop-shadow-sm sm:mb-8"
          onError={(e) => {
            // Fallback if logo is missing
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.insertAdjacentHTML('afterbegin', '<div class="text-[#A32626] font-bold text-2xl mb-8 tracking-tight">RedPoint HRMS</div>');
          }}
        />

        {/* Login Card */}
        <div className="w-full rounded-[22px] border border-[#e7ddd2] bg-white p-6 shadow-[0_18px_50px_rgba(90,52,39,0.10)] sm:p-8">
          
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#342624]">
              {loginPortal === 'admin' ? 'Admin User Sign In' : 'Employee Sign In'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#806f69]">
              {loginPortal === 'admin'
                ? 'Access the RedPoint HRMS administration console'
                : 'Access your personal employee workspace'}
            </p>
          </div>

          {/* Error Notification HUD */}
          {error && (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-[#A32626]/25 bg-[#fff6f2] p-4 text-sm text-[#8F1F1F]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#A32626]" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}
          {authNotice && (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{authNotice}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            
            {/* Username Input Group */}
            <div>
              <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold text-[#342624]">
                Username or email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-[#e4dbd3] bg-white pl-11 pr-4 text-sm text-[#342624] placeholder-[#9b8c86] transition-all focus:border-[#A32626] focus:outline-none focus:ring-2 focus:ring-[#A32626]/15"
                />
              </div>
            </div>

            {/* Password Input Group */}
            {(loginPortal === 'admin' || (loginPortal === 'employee' && !employeeRecoveryMode)) && <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-[#342624]">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={loginPortal === 'employee' ? 'current-password' : 'current-password'}
                  className="h-12 w-full rounded-xl border border-[#e4dbd3] bg-white pl-11 pr-11 text-sm text-[#342624] placeholder-[#9b8c86] transition-all focus:border-[#A32626] focus:outline-none focus:ring-2 focus:ring-[#A32626]/15"
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
            </div>}

            {loginPortal === 'employee' && employeeRecoveryMode && otpRequested && (
              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                  OTP Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={employeeOtp}
                  onChange={(e) => setEmployeeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full h-12 px-4 bg-white border border-[#E5E5E5] rounded-xl text-sm text-[#333333] placeholder-gray-400 focus:outline-none focus:border-[#A32626] focus:ring-1 focus:ring-[#A32626]/30 transition-all"
                />
              </div>
            )}

            {loginPortal === 'employee' && employeeRecoveryMode && otpRequested && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-12 px-4 bg-white border border-[#E5E5E5] rounded-xl text-sm text-[#333333] placeholder-gray-400 focus:outline-none focus:border-[#A32626] focus:ring-1 focus:ring-[#A32626]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#333333] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={recoveryPasswordConfirm}
                    onChange={(e) => setRecoveryPasswordConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full h-12 px-4 bg-white border border-[#E5E5E5] rounded-xl text-sm text-[#333333] placeholder-gray-400 focus:outline-none focus:border-[#A32626] focus:ring-1 focus:ring-[#A32626]/30 transition-all"
                  />
                </div>
              </>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center mt-2">
              <label className="group flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E5E5] text-[#A32626] focus:ring-[#A32626] focus:ring-offset-0 cursor-pointer accent-[#A32626]"
                />
                <span className="text-sm text-[#74635d] transition-colors group-hover:text-[#342624]">Remember me</span>
              </label>
              
              <a 
                href="#forgot" 
                onClick={(e) => {
                  e.preventDefault();
                  if (loginPortal === 'employee' && !employeeRecoveryMode) {
                    setEmployeeRecoveryMode(true);
                    setOtpRequested(false);
                    setEmployeeOtp('');
                    setPassword('');
                    setError(null);
                    setAuthNotice('Enter your company email and request a password reset code.');
                    return;
                  }
                  if (loginPortal === 'employee' && employeeRecoveryMode) {
                    setEmployeeRecoveryMode(false);
                    setOtpRequested(false);
                    setEmployeeOtp('');
                    setRecoveryPassword('');
                    setRecoveryPasswordConfirm('');
                    setError(null);
                    setAuthNotice(null);
                    return;
                  }
                  void showInfoModal({
                    title: 'Admin Account Access',
                    message: 'Admin accounts are provisioned by HR.\n\nDemo Admin Username: hr.redpoint\nPassword: admin123#',
                    acknowledgeLabel: 'Return to Sign In',
                  });
                }}
                className="text-sm font-semibold text-[#A32626] transition-colors hover:text-[#8F1F1F]"
              >
                {employeeRecoveryMode ? 'Back to sign in' : 'Forgot password?'}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#A32626] text-base font-semibold text-white shadow-md shadow-[#A32626]/20 transition-all hover:bg-[#8F1F1F] focus:outline-none focus:ring-2 focus:ring-[#A32626]/50 focus:ring-offset-1 ${
                isLoading ? 'opacity-80 cursor-wait' : 'hover:-translate-y-0.5'
              }`}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                employeeRecoveryMode
                  ? (otpRequested ? 'Reset Password' : 'Send Reset Code')
                  : 'Sign In'
              )}
            </button>

          </form>

        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 z-10 w-full text-center sm:bottom-6">
        <p className="text-xs font-medium text-[#8c7b74]">
          © 2026 RedPoint HRMS. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
