import { useLocation } from "react-router-dom";
import { Link } from "@/router-compat";
import { Page } from "@/components/Page";
import { useAuth } from "@/auth/AuthContext";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { btn } from "@/components/common";
import { cn } from "@/lib/utils";
import court from "@/assets/court.jpg";


const inputBase =
  "h-12 w-full rounded-xl border bg-card pl-11 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

function LoginScreen() {
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect") ?? undefined;
  const { signIn, accept } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const errs: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) errs.identifier = "Enter your username or email.";
    if (!password) errs.password = "Enter your password.";
    setFieldErrors(errs);
    setFormError(null);
    if (errs.identifier || errs.password) return;

    setLoading(true);
    try {
      const res = await signIn({ identifier, password, remember });
      if (res.ok) {
        toast.success(`Welcome back, ${res.user.displayName}!`);
        accept(res.user, safeRedirectPath(redirect));
        return;
      }
      setFieldErrors(res.fieldErrors ?? {});
      setFormError(res.code === "validation" ? null : res.message);
      toast.error(res.message);
      if (res.code === "invalid_credentials") setPassword("");
    } catch {
      const message = "We couldn't reach the server. Check your connection and try again.";
      setFormError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative overflow-hidden bg-hero text-navy-foreground">
        <img src={court} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-electric/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-gradient font-display text-xl font-bold text-primary-foreground shadow-glow">S</span>
            <span className="font-display text-2xl font-bold tracking-wide">SPORTAL</span>
          </div>
          <div className="hidden lg:block">
            <p className="font-display text-5xl font-bold uppercase leading-tight tracking-wide">
              Train. Track.
              <br />
              <span className="text-electric">Improve.</span> Get Discovered.
            </p>
            <p className="mt-5 max-w-md text-navy-muted">
              University athlete profiling and AI-assisted performance tracking, all in one place.
            </p>
          </div>
          <p className="hidden text-xs text-navy-muted lg:block">© {new Date().getFullYear()} Sportal</p>
          <p className="font-display text-lg font-semibold uppercase tracking-wider lg:hidden">
            Train. Track. <span className="text-electric">Improve.</span> Get Discovered.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="surface p-6 sm:p-8">
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>

            {formError && (
              <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold">Username or email</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    maxLength={254}
                    value={identifier}
                    disabled={loading}
                    onChange={(e) => setIdentifier(e.target.value)}
                    aria-invalid={!!fieldErrors.identifier}
                    aria-describedby={fieldErrors.identifier ? "identifier-error" : undefined}
                    placeholder="you@university.edu"
                    className={cn(inputBase, "pr-4", fieldErrors.identifier && "border-destructive focus:border-destructive focus:ring-destructive/20")}
                  />
                </div>
                {fieldErrors.identifier && <p id="identifier-error" className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors.identifier}</p>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold">Password</label>
                  <button
                    type="button"
                    onClick={() => toast.info("Password reset isn't available yet. Please contact your administrator.")}
                    className="rounded text-xs font-semibold text-primary transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    placeholder="Enter your password"
                    className={cn(inputBase, "pr-12", fieldErrors.password && "border-destructive focus:border-destructive focus:ring-destructive/20")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p id="password-error" className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors.password}</p>}
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={loading}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-input accent-[var(--primary)]"
                />
                <span>Remember me for 30 days</span>
              </label>

              <button type="submit" disabled={loading} className={cn(btn.primary, "h-12 w-full text-base")}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" direction="none" className="font-semibold text-primary hover:underline">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Page shell={false}>
      <LoginScreen />
    </Page>
  );
}
