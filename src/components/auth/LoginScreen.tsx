import { useState, FormEvent } from "react";
import { signIn } from "../../lib/tauri";
import aenLogo from "../../assets/aen-logo.png";

interface LoginScreenProps {
  /** Pre-filled error shown on first render — e.g. auto-login's "Session
   * expired, please sign in again." Cleared as soon as the user submits
   * the form themselves. */
  initialError: string | null;
  onSuccess: () => void;
}

/** Full-screen, unthemed (always dark, matching SplashScreen) sign-in
 * form — the only thing rendered before login succeeds. See AuthGate for
 * how this fits into the app's launch flow. */
export function LoginScreen({ initialError, onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn(email, password, rememberMe);
      if (result.success) {
        onSuccess();
        return;
      }
      setError(result.message);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111117] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1c1c23] p-8">
        <div className="flex flex-col items-center">
          <img src={aenLogo} alt="AEN Education Network" className="w-[180px]" />
          <p className="mt-4 font-sans text-sm font-light text-white/70">AEN Document Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white/80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="you@aen.edu"
              className="rounded-lg border border-white/10 bg-[#111117] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white/80">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-[#111117] px-3 py-2 pr-10 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} aria-hidden="true" />
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#111117] accent-primary"
            />
            Remember me
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <div className="min-h-5 text-center">{error && <p className="text-sm text-red-400">{error}</p>}</div>
        </form>
      </div>
    </div>
  );
}
