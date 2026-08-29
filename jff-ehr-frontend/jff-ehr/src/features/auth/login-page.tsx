import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useAuth } from "./auth-context";

/**
 * Route: /login. Cream page, single centred card, teal primary action —
 * per the settled design direction. On success, lands on the route the
 * user originally asked for (default "/").
 */
export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  };

  
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[380px]">
        <div className="rounded-card border border-card bg-surface p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-none bg-accent text-white">
              <HeartPulse size={22} />
            </div>
            <h1 className="text-lg font-semibold text-primary">JFF EHR</h1>
            <p className="mt-0.5 text-sm text-muted">
              Camp Health Records: staff sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label className="mb-1 block text-sm font-medium text-secondary" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@jffdemo.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />

            <label
              className="mb-1 mt-4 block text-sm font-medium text-secondary"
              htmlFor="password"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="mt-5 w-full"
              disabled={submitting || !email || !password}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Access is limited to registered JFF camp staff.
        </p>
      </div>
    </div>
  );
}
