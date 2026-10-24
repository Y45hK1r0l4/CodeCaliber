import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, NavLink, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../authSlice";
import Toast from "../components/Toaster";
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  GraduationCap, 
  BookOpen,
  Building2,
  KeyRound
} from "lucide-react";

const signupSchema = z.object({
  firstName: z.string().min(3, "Name must be at least 3 characters"),
  organizationName: z.string().optional(),
  institutionName: z.string().optional(),
  joinCode: z.string().optional(),
  emailId: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Requires at least 1 uppercase letter")
    .regex(/[a-z]/, "Requires at least 1 lowercase letter")
    .regex(/[0-9]/, "Requires at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Requires at least 1 special character"),
});

function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || searchParams.get("type");

  const [accountType, setAccountType] = useState(
    roleParam === "admin" || roleParam === "evaluator" || roleParam === "educator" ? "evaluator" : "participant"
  );
  const [toast, setToast] = useState(null);

  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setToast({
        type: "error",
        message: typeof error === "string" ? error : error.message || "Registration failed. Please check your credentials.",
      }), 0);
      const clearTimer = setTimeout(() => setToast(null), 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [error]);

  const submittedData = (data) => {
    const orgVal = data.organizationName || data.institutionName;
    if ((accountType === "evaluator" || accountType === "educator") && (!orgVal || !orgVal.trim())) {
      setError("organizationName", { message: "Please provide your company or organization name" });
      return;
    }
    dispatch(registerUser({ ...data, organizationName: orgVal, accountType }));
  };

  return (
    <div className="auth-page flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="auth-panel grid w-full max-w-4xl overflow-hidden rounded-[28px] p-2 md:grid-cols-[.9fr_1.1fr]">
        {/* Left Side Banner */}
        <div className="auth-aside hidden min-h-[620px] flex-col justify-between rounded-[22px] p-8 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#f4f0e9] font-serif text-lg font-bold">A</div>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[.2em] text-[#b9c5ad]">
              {accountType === "evaluator" || accountType === "educator" ? "Evaluator Suite" : "Participant Sandbox"}
            </p>
            <p className="serif max-w-xs text-4xl leading-tight">
              {accountType === "evaluator" || accountType === "educator"
                ? "Evaluate talent with precision and automated benchmarks."
                : "A distraction-free workspace to showcase your engineering skills."}
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="space-y-6 p-6 sm:p-10">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1c1b19] font-serif text-lg font-bold">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {accountType === "evaluator" || accountType === "educator" ? "Create Evaluator Account" : "Create Participant Account"}
            </h1>
            <p className="text-xs text-zinc-400">
              {accountType === "evaluator" || accountType === "educator" 
                ? "Set up your organization, publish tests, and review participants" 
                : "Access your dashboard and take timed assessments"}
            </p>
          </div>

          {/* Role Choice Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setAccountType("participant")}
              className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border text-center transition cursor-pointer ${
                accountType === "participant"
                  ? "border-[#bd5b3d] bg-[#bd5b3d]/15 text-white shadow-sm"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <BookOpen className={`h-5 w-5 ${accountType === "participant" ? "text-[#bd5b3d]" : "text-zinc-500"}`} />
              <span className="text-xs font-bold">I&apos;m a Participant</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Taking tests & challenges</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType("evaluator")}
              className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border text-center transition cursor-pointer ${
                accountType === "evaluator"
                  ? "border-[#bd5b3d] bg-[#bd5b3d]/15 text-white shadow-sm"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <GraduationCap className={`h-5 w-5 ${accountType === "evaluator" || accountType === "educator" ? "text-[#bd5b3d]" : "text-zinc-500"}`} />
              <span className="text-xs font-bold">Evaluator / Admin</span>
              <span className="text-[10px] text-zinc-500 leading-tight">Hiring or running tests</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(submittedData)} className="space-y-4">
            {/* Organization field (for Evaluator) */}
            {(accountType === "evaluator" || accountType === "educator") && (
              <div className="animate-fade-in">
                <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Company, Organization, or School
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    {...register("organizationName")}
                    type="text"
                    placeholder="e.g. Acme Corp, Tech University, or HackFest"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
                  />
                </div>
                {errors.organizationName && (
                  <p className="text-rose-400 text-xs mt-1.5 font-mono">{errors.organizationName.message}</p>
                )}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  {...register("firstName")}
                  type="text"
                  placeholder={accountType === "educator" ? "Prof. Alan Turing" : "Ada Lovelace"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
              {errors.firstName && (
                <p className="text-rose-400 text-xs mt-1.5 font-mono">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  {...register("emailId")}
                  type="email"
                  placeholder={accountType === "evaluator" || accountType === "educator" ? "evaluator@company.com" : "participant@domain.com"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
              {errors.emailId && (
                <p className="text-rose-400 text-xs mt-1.5 font-mono">
                  {errors.emailId.message}
                </p>
              )}
            </div>

            {/* Password */}
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
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>
                    {accountType === "evaluator" || accountType === "educator" ? "Create Evaluator Account" : "Create Participant Account"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
            Already registered?{" "}
            <NavLink to="/login" className="text-white font-semibold hover:underline">
              Sign in
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
