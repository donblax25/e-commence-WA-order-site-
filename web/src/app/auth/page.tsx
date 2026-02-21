"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { customerLogin, customerSignup } from "../../lib/api";
import { useToast, ToastContainer } from "../../components/Toast";

export default function AuthPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, addToast, removeToast } = useToast();

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        const result = await customerSignup({ email, password, name: name || undefined });
        localStorage.setItem("customerToken", result.token);
        localStorage.setItem("customer", JSON.stringify(result.customer));
        addToast(`Welcome ${result.customer.name || result.customer.email}!`, "success");
        router.push("/");
      } else {
        const result = await customerLogin({ email, password });
        localStorage.setItem("customerToken", result.token);
        localStorage.setItem("customer", JSON.stringify(result.customer));
        addToast(`Welcome back ${result.customer.name || result.customer.email}!`, "success");
        router.push("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">
            {isSignup ? "Create Account" : "Login"}
          </h1>
          <p className="text-slate-600">
            {isSignup
              ? "Sign up to save your preferences and order history"
              : "Login to your account to continue"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 rounded-lg border border-clay bg-white p-6">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-1">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded border border-clay px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded border border-clay px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="w-full rounded border border-clay px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignup ? "Create Account" : "Login"}
          </button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-600">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setEmail("");
                setPassword("");
                setName("");
              }}
              className="font-medium text-amber-600 hover:underline"
            >
              {isSignup ? "Login" : "Sign up"}
            </button>
          </p>
          <p className="text-xs text-slate-500">
            We'll use your email to save order preferences and notify you about order updates.
          </p>
        </div>
      </div>
    </div>
  );
}
