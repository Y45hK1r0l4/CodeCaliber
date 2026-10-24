import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, NavLink, useSearchParams, useLocation } from "react-router";
import { loginUser } from "../authSlice";
import { useDispatch, useSelector } from "react-redux";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

const loginSchema = z.object({
  emailId: z
    .string()
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const redirectTarget = searchParams.get("redirect") || location.state?.from || "/";

  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.auth
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget);
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const submittedData = (data) => {
    dispatch(loginUser(data));
  };

  return (
    <div className="auth-page flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="auth-panel grid w-full max-w-4xl overflow-hidden rounded-[28px] p-2 md:grid-cols-[.9fr_1.1fr]">
        <div className="auth-aside hidden min-h-[560px] flex-col justify-between rounded-[22px] p-8 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#f4f0e9] font-serif text-lg font-bold">A</div>
          <div><p className="mb-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#b9c5ad]">A better practice</p><p className="serif max-w-xs text-4xl leading-tight">Make space for better thinking.</p></div>
        </div>
        <div className="space-y-6 p-6 sm:p-10">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1c1b19] font-serif text-lg font-bold">
              C
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sign in to codeCaliber
            </h1>
            <p className="text-xs text-zinc-400">
              Enter your credentials to access your assessments
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-rose-900/50 bg-rose-950/40 text-rose-300 text-xs">
              {typeof error === "string" ? error : error.message || "Authentication failed"}
            </div>
          )}

          <form onSubmit={handleSubmit(submittedData)} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                {...register("emailId")}
                type="email"
                placeholder="developer@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
            {errors.emailId && (
              <p className="text-rose-400 text-xs mt-1.5 font-mono">
                {errors.emailId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
            {errors.password && (
              <p className="text-rose-400 text-xs mt-1.5 font-mono">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
          Don&apos;t have an account?{" "}
          <NavLink
            to={redirectTarget !== "/" ? `/signup?redirect=${encodeURIComponent(redirectTarget)}` : "/signup"}
            className="text-white font-semibold hover:underline"
          >
            Create account
          </NavLink>
        </p>
      </div>
    </div>
    </div>
  );
}

export default Login;
