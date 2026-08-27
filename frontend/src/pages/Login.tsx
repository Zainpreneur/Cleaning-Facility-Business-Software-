import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export function Login() {
  const { user, login, bootstrapAdmin } = useAuth();
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await bootstrapAdmin(name, email, password);
        toast.success("Admin account created!");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl">🧹</div>
          <h1 className="mt-2 text-lg font-bold text-slate-900">CFBS</h1>
          <p className="text-sm text-slate-500">Cleaning &amp; Facility Business Software</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "bootstrap" && (
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "bootstrap" ? 8 : undefined}
              required
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {mode === "login" ? "Sign in" : "Create admin account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <button className="underline" onClick={() => setMode("bootstrap")}>
              First time setup? Create the admin account
            </button>
          ) : (
            <button className="underline" onClick={() => setMode("login")}>
              Already have an account? Sign in
            </button>
          )}
        </div>

        {mode === "login" && (
          <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
            Demo login: <span className="font-mono">admin@cfbs.demo</span> / <span className="font-mono">password123</span>
          </div>
        )}
      </div>
    </div>
  );
}
