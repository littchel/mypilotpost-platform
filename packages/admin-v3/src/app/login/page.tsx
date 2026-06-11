"use client";
import { useState, type FormEvent } from "react";
import { apiLogin } from "@/lib/api";
import { setToken, getSession } from "@/lib/auth";
import { useSession } from "@/context/SessionContext";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await apiLogin(email, password);
      setToken(token);
      const session = getSession();
      if (!session?.is_admin) {
        setError("Access denied. Admin account required.");
        return;
      }
      refresh();
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-os-bg px-4">
      <div className="w-full max-w-[340px]">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-4 shadow-os-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-ink-1">myPilotPost</h1>
          <p className="text-sm text-ink-3 mt-1">Admin Operating System</p>
        </div>

        <div className="os-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="os-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="os-input"
                placeholder="admin@mypilotpost.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="os-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="os-input pr-9"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="os-btn-primary w-full justify-center h-9"
            >
              {loading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-4 mt-4">
          Admin access only. Unauthorized use is prohibited.
        </p>
      </div>
    </div>
  );
}
