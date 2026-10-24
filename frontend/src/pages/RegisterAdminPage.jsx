import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NavLink } from "react-router";
import { axiosClient } from "../utils/axiosClient";
import { KeyRound, UserPlus, ExternalLink, User } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(2, "Enter the evaluator's first name"),
  lastName: z.string().optional(),
  emailId: z.string().email("Enter a valid evaluator email"),
});

export default function RegisterAdminPage() {
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({ resolver: zodResolver(schema) });

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const { data } = await axiosClient.get("/user/teachers");
      setTeachers(data.teachers || []);
    } catch (err) {
      console.error("Failed to load teachers:", err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const createTeacher = async (formData) => {
    try {
      setError("");
      const { data } = await axiosClient.post("/user/teachers", formData);
      setCredentials(data.credentials);
      reset();
      loadTeachers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create evaluator account");
    }
  };

  return (
    <main className="auth-page flex flex-col items-center justify-center px-4 py-12 gap-8">
      <section className="auth-panel w-full max-w-2xl rounded-[28px] p-8 sm:p-10">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#242922] text-[#f4f0e9]"><UserPlus className="h-5 w-5" /></div>
          <div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#68765d]">Administrator</p><h1 className="serif mt-2 text-4xl">Create an evaluator.</h1><p className="mt-2 text-sm leading-6 text-black/55">Generate a ready-to-use evaluator account. Give the credentials to the evaluator directly; there is no invitation step.</p></div>
        </div>
        <form onSubmit={handleSubmit(createTeacher)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">First name</label><input {...register("firstName")} placeholder="Anita" className="w-full rounded-xl border bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]" />{errors.firstName && <p className="mt-1 text-xs text-[#a94e34]">{errors.firstName.message}</p>}</div><div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">Last name</label><input {...register("lastName")} placeholder="Sharma" className="w-full rounded-xl border bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]" /></div></div>
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">Evaluator email</label><input {...register("emailId")} type="email" placeholder="evaluator@company.com" className="w-full rounded-xl border bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]" />{errors.emailId && <p className="mt-1 text-xs text-[#a94e34]">{errors.emailId.message}</p>}</div>
          {error && <div className="rounded-xl bg-[#f0d9d0] px-4 py-3 text-sm text-[#8e402c]">{error}</div>}
          <button disabled={isSubmitting} className="terracotta-button flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"><UserPlus className="h-4 w-4" />{isSubmitting ? "Creating account..." : "Generate evaluator credentials"}</button>
        </form>
        {credentials && <div className="mt-6 rounded-2xl border border-[#68765d]/25 bg-[#68765d]/10 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#53634a]"><KeyRound className="h-4 w-4" />Evaluator account ready</div><div className="mt-4 grid gap-2 rounded-xl bg-[#faf7f1] p-4 font-mono text-xs text-black/65"><div>Email: {credentials.emailId}</div><div>Temporary password: {credentials.temporaryPassword}</div></div><p className="mt-3 text-xs leading-5 text-black/55">Share these credentials securely. The evaluator can sign in immediately and begin creating questions and timed tests.</p></div>}
        <NavLink to="/admin" className="mt-7 block text-center text-xs font-semibold text-black/50 hover:text-black">Return to Dashboard</NavLink>
      </section>

      {/* Teachers Directory Section */}
      <section className="auth-panel w-full max-w-2xl rounded-[28px] p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <h2 className="serif text-2xl font-bold text-black/90">Evaluators & Examiners Directory</h2>
            <p className="text-xs text-black/50 mt-1">Click on any evaluator's name to view their profile, assessments, and stats.</p>
          </div>
          <span className="rounded-full bg-black/5 px-3 py-1 font-mono text-xs font-semibold text-black/70">
            {teachers.length} Active
          </span>
        </div>

        {loadingTeachers ? (
          <div className="py-8 text-center text-xs text-black/40 font-mono">Loading evaluators directory...</div>
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-xs text-black/40">No evaluator accounts created yet.</div>
        ) : (
          <div className="divide-y divide-black/5">
            {teachers.map((t) => (
              <div key={t._id} className="py-3.5 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#68765d] text-white font-semibold text-xs">
                    {t.firstName?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div>
                    <NavLink
                      to={`/profile/${t._id}`}
                      className="text-sm font-semibold text-black/90 hover:text-[#bd5b3d] hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition"
                    >
                      <span>{t.firstName} {t.lastName || ""}</span>
                      <ExternalLink className="h-3 w-3 text-black/40 group-hover:text-[#bd5b3d] transition" />
                    </NavLink>
                    <div className="text-xs text-black/45 font-mono">{t.emailId}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-neutral-600">
                    {t.role === "admin" ? "Admin" : "Evaluator"}
                  </span>
                  <NavLink
                    to={`/profile/${t._id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-medium text-black/75 hover:bg-black/5 transition"
                  >
                    <User className="h-3 w-3" />
                    <span>Profile</span>
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
