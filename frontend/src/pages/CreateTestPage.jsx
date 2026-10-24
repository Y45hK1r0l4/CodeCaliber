import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { axiosClient } from "../utils/axiosClient";
import { CalendarClock, Check, Award, Sparkles, Shield, Code2, ClipboardPlus } from "lucide-react";

export default function CreateTestPage() {
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionMarks, setQuestionMarks] = useState({});
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    durationMinutes: 60,
    startsAt: "",
    endsAt: "",
    assessmentType: "coding",
    enableAiHints: false,
    enableCustomInput: true,
    strictFullscreen: true
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosClient.get("/admin/problems")
      .then((questionlistRes) => {
        const probList = Array.isArray(questionlistRes.data) ? questionlistRes.data : [];
        setProblems(probList);
      })
      .catch((error) => setMessage(error.response?.data?.message || "Unable to load question list."));
  }, []);

  const toggleQuestion = (id, difficulty) => {
    setSelectedQuestions((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      } else {
        // Default marks based on difficulty: Easy = 10, Medium = 20, Hard = 30
        const defaultMark = difficulty === "hard" ? 30 : difficulty === "medium" ? 20 : 10;
        setQuestionMarks((prev) => ({ ...prev, [id]: prev[id] || defaultMark }));
        return [...current, id];
      }
    });
  };

  const handleMarkChange = (id, val) => {
    const num = Math.max(1, Number(val) || 1);
    setQuestionMarks((prev) => ({ ...prev, [id]: num }));
  };

  const totalMarks = selectedQuestions.reduce((sum, id) => sum + (Number(questionMarks[id]) || 10), 0);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (!selectedQuestions.length) return setMessage("Select at least one question for the test.");
      setSubmitting(true);
      const marksPayload = selectedQuestions.map((id) => ({
        question: id,
        marks: Number(questionMarks[id]) || 10
      }));

      const { data } = await axiosClient.post("/tests", {
        ...form,
        questions: selectedQuestions,
        questionMarks: marksPayload,
        durationMinutes: Number(form.durationMinutes),
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        published: true
      });
      navigate("/assessments", { state: { createdTestCode: data.test?.testCode, createdTestTitle: data.test?.title } });
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create test.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-page px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4 border-b border-black/10 pb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242922] text-[#f4f0e9]">
            <ClipboardPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[#68765d]">Dashboard · Assessment Creator</p>
            <h1 className="serif mt-2 text-4xl">Create a timed test.</h1>
            <p className="mt-2 text-sm text-black/55">
              Select questions and assign marks. Partial credit will be computed automatically based on passed test cases.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-[#bd5b3d]/20 bg-[#f0d9d0] px-4 py-3 text-sm text-[#8e402c]">
            {message}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
          <section className="space-y-5 rounded-2xl border border-black/10 bg-[#f7f3ec] p-6 shadow-sm">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                Test title
              </label>
              <input
                name="title"
                value={form.title}
                onChange={update}
                required
                placeholder="Midterm Exam: Algorithms & Data Structures"
                className="w-full rounded-xl border border-black/15 bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                Instructions (Optional)
              </label>
              <textarea
                name="instructions"
                value={form.instructions}
                onChange={update}
                rows="3"
                placeholder="Server-evaluated assessment. Partial marks are awarded based on passed test cases..."
                className="w-full rounded-xl border border-black/15 bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                Duration (minutes)
              </label>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                max="480"
                value={form.durationMinutes}
                onChange={update}
                className="w-full rounded-xl border border-black/15 bg-[#faf7f1] px-4 py-3 text-sm outline-none focus:border-[#bd5b3d]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                  Opens (Optional)
                </label>
                <input
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={update}
                  className="w-full rounded-xl border border-black/15 bg-[#faf7f1] px-3 py-2.5 text-xs outline-none focus:border-[#bd5b3d]"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                  Closes (Optional)
                </label>
                <input
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={update}
                  className="w-full rounded-xl border border-black/15 bg-[#faf7f1] px-3 py-2.5 text-xs outline-none focus:border-[#bd5b3d]"
                />
              </div>
            </div>

            {/* Assessment Settings & AI Toggles */}
            <div className="space-y-2.5 rounded-xl border border-black/10 bg-white/50 p-3.5">
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-black/55">
                Assessment Features & AI Controls
              </div>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-black/85">
                    <Sparkles className="h-3.5 w-3.5 text-[#bd5b3d]" />
                    <span>Enable AI-Powered Hints</span>
                  </div>
                  <div className="text-[11px] text-black/50">Allow test takers to request up to 3 AI intuition hints</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableAiHints}
                  onChange={(e) => setForm({ ...form, enableAiHints: e.target.checked })}
                  className="h-4 w-4 accent-[#bd5b3d] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1 border-t border-black/5">
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-black/85">
                    <Shield className="h-3.5 w-3.5 text-[#68765d]" />
                    <span>Strict Fullscreen Proctored Mode</span>
                  </div>
                  <div className="text-[11px] text-black/50">Flag tab-switching and fullscreen exits on audit trail</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.strictFullscreen}
                  onChange={(e) => setForm({ ...form, strictFullscreen: e.target.checked })}
                  className="h-4 w-4 accent-[#bd5b3d] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1 border-t border-black/5">
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-black/85">
                    <Code2 className="h-3.5 w-3.5 text-black/60" />
                    <span>Allow Custom Input Testing</span>
                  </div>
                  <div className="text-[11px] text-black/50">Candidates can test code against custom stdin before submission</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCustomInput}
                  onChange={(e) => setForm({ ...form, enableCustomInput: e.target.checked })}
                  className="h-4 w-4 accent-[#bd5b3d] rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-black/50 font-semibold uppercase tracking-wider">Test Summary</span>
                <span className="font-bold text-[#bd5b3d]">{totalMarks} Total Marks</span>
              </div>
              <div className="mt-1 text-xs text-black/60">
                {selectedQuestions.length} questions selected · Partial credit evaluated automatically
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="terracotta-button flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              <CalendarClock className="h-4 w-4" />
              <span>{submitting ? "Publishing..." : `Publish test (${totalMarks} Marks)`}</span>
            </button>
          </section>

          <section className="rounded-2xl border border-black/10 bg-[#f7f3ec] p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Question list & Marks</h2>
                <p className="mt-1 text-xs text-black/50">
                  Select questions and configure individual point values · {selectedQuestions.length} selected
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-[#bd5b3d]/10 px-3 py-1 font-mono text-xs font-bold text-[#bd5b3d]">
                <Award className="h-3.5 w-3.5" />
                <span>{totalMarks} pts total</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {problems.map((problem) => {
                const selected = selectedQuestions.includes(problem._id);
                const mark = questionMarks[problem._id] || (problem.difficultyLevel === "hard" ? 30 : problem.difficultyLevel === "medium" ? 20 : 10);
                return (
                  <div
                    key={problem._id}
                    className={`flex items-center justify-between rounded-xl border p-4 transition ${
                      selected
                        ? "border-[#bd5b3d] bg-[#fbf5f2] shadow-sm"
                        : "border-black/10 bg-[#faf7f1] hover:border-black/20"
                    }`}
                  >
                    <div 
                      onClick={() => toggleQuestion(problem._id, problem.difficultyLevel)}
                      className="space-y-1 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{problem.title}</span>
                        <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-mono capitalize text-black/60">
                          {problem.difficultyLevel}
                        </span>
                      </div>
                      <div className="text-xs text-black/50 flex flex-wrap gap-1">
                        {(Array.isArray(problem.tags) ? problem.tags : [problem.tags]).map((tag, idx) => (
                          <span key={idx}>#{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {selected && (
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <label className="text-black/50 text-[10px] uppercase font-bold">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={mark}
                            onChange={(e) => handleMarkChange(problem._id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 rounded-lg border border-black/20 bg-white px-2 py-1 text-center font-bold text-xs outline-none focus:border-[#bd5b3d]"
                          />
                        </div>
                      )}

                      <div
                        onClick={() => toggleQuestion(problem._id, problem.difficultyLevel)}
                        className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition ${
                          selected ? "border-[#bd5b3d] bg-[#bd5b3d] text-white" : "border-black/20"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
