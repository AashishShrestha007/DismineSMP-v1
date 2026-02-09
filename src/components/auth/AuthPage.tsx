import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { registerUser, loginUser, simulateDiscordOAuth } from '../../lib/store';

interface Props {
  onAuth: () => void;
  onBack: () => void;
}

type Mode = 'login' | 'register';

export function AuthPage({ onAuth, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const handleEmailAuth = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        const result = registerUser({
          email,
          password,
          displayName: displayName || email.split('@')[0],
          authMethod: 'email',
        });
        if (result.success) {
          onAuth();
        } else {
          setError(result.error || 'Registration failed.');
        }
      } else {
        const result = loginUser(email, password);
        if (result.success) {
          onAuth();
        } else {
          setError(result.error || 'Login failed.');
        }
      }
      setIsLoading(false);
    }, 800);
  };

  const handleDiscordAuth = () => {
    setError('');
    setDiscordLoading(true);

    // Simulate Discord OAuth popup flow
    setTimeout(() => {
      simulateDiscordOAuth();
      setDiscordLoading(false);
      onAuth();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.05)_0%,_transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to site
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <div className="h-3.5 w-3.5 rounded-sm bg-emerald-500" />
          </div>
          <div>
            <span className="text-white font-semibold tracking-tight text-lg block leading-tight">
              Dismine SMP
            </span>
            <span className="text-neutral-500 text-xs">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800/50 backdrop-blur-sm">
          {/* Discord OAuth Button */}
          <button
            onClick={handleDiscordAuth}
            disabled={discordLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold text-white bg-[#5865F2] rounded-xl hover:bg-[#4752C4] transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {discordLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Connecting to Discord...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                </svg>
                Continue with Discord
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-neutral-900/60 text-neutral-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-neutral-300 mb-2">
                  Display Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    id="auth-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full pl-11 pr-4 py-3 text-sm text-white bg-neutral-950/80 border border-neutral-800 rounded-xl placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-neutral-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  id="auth-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 text-sm text-white bg-neutral-950/80 border border-neutral-800 rounded-xl placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-neutral-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                  className="w-full pl-11 pr-11 py-3 text-sm text-white bg-neutral-950/80 border border-neutral-800 rounded-xl placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || discordLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-neutral-950 bg-emerald-500 rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? (
                    'Sign In'
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Create Account
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <p className="mt-6 text-center text-sm text-neutral-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-700">
          By signing up, you agree to our community guidelines.
        </p>
      </div>
    </div>
  );
}
