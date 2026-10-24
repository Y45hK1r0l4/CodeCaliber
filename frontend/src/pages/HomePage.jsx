import React from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Layers3,
  MoveUpRight,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";

function HomePage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleAdminAction = () => {
    if (!user) {
      navigate("/signup?role=admin");
    } else if (["admin", "evaluator"].includes(user?.role)) {
      navigate("/admin");
    } else {
      navigate("/assessments");
    }
  };

  return (
    <main className="home-page grain">
      {/* Hero Section (Centered Middle Layout) */}
      <section className="editorial-grid relative overflow-hidden border-b border-[rgba(28,27,25,.13)]">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100vh-60px)] lg:px-12 lg:py-20 text-center">
          <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">

            <h1 className="display-title serif text-5xl sm:text-7xl lg:text-[5.5rem] xl:text-[6.25rem] font-semibold leading-[0.94] tracking-tight text-[#1c1b19] max-w-4xl">
              What will you <em className="text-[#bd5b3d]">assess</em> today?
            </h1>

            <p className="muted mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Create AI-powered coding assessments, timed challenges, and multi-language tests with codeCaliber. Built for organizations, evaluators, and academic institutions to evaluate real programming skills at scale.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleAdminAction}
                className="terracotta-button flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-semibold shadow-xl shadow-[#bd5b3d]/20 transition hover:-translate-y-0.5 cursor-pointer"
              >
                {user ? "Dashboard" : "Admin Sign up"} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/assessments")}
                className="flex items-center gap-2.5 rounded-full border border-[rgba(28,27,25,.2)] px-6 py-3.5 text-sm font-semibold hover:bg-[#e6e0d6] transition cursor-pointer"
              >
                Enter test code <MoveUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs muted sm:text-sm">
              <div className="flex -space-x-2 shrink-0">
                {["photo-1534528741775-53994a69daeb", "photo-1507003211169-0a1dd7228f2d", "photo-1500648767791-00dcc994a43e"].map((image) => (
                  <img
                    key={image}
                    className="h-8 w-8 rounded-full border-2 border-[#f2eee7] object-cover sm:h-9 sm:w-9"
                    src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=80&q=80`}
                    alt=""
                  />
                ))}
              </div>
              <span>
                <strong className="text-[#1c1b19]">Built for hiring teams, educators & institutes</strong> conducting automated coding tests
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-b border-[rgba(28,27,25,.13)] bg-[#e6e0d6]">
        <div className="mx-auto grid max-w-[1380px] grid-cols-2 gap-y-8 px-5 py-10 sm:px-8 md:grid-cols-4 lg:px-12">
          {[
            ["AI Synthesizer", "automated question creation"],
            ["< 15ms", "sandboxed auto-grading"],
            ["100%", "automated scoring"],
            ["Polyglot", "C++, Python, Java & JS"],
          ].map(([value, label]) => (
            <div key={label} className="border-l border-[rgba(28,27,25,.18)] pl-5 first:border-0">
              <div className="serif text-3xl">{value}</div>
              <div className="mt-1 max-w-[140px] text-[11px] uppercase leading-4 tracking-[.1em] text-black/50">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Assessment Workflow (Organized Uniform 2x2 Grid) */}
      <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <div className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.22em] text-[#bd5b3d]">
              <span className="h-px w-9 bg-[#bd5b3d]" />
              The assessment platform
            </div>
            <h2 className="serif max-w-sm text-4xl leading-[1.05] sm:text-5xl">
              Create, conduct, and auto-evaluate coding assessments.
            </h2>
            <p className="muted mt-5 max-w-sm text-sm leading-6">
              codeCaliber gives evaluators, organizations, and educators an end-to-end platform to generate questions with AI, host timed coding tests, and instantly grade code submissions in isolated sandboxes.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: Bot,
                title: "AI Question Synthesizer",
                text: "Generate complete coding challenges in seconds. Gemini AI synthesizes problem statements, edge constraints, test suites, and starter code.",
              },
              {
                icon: Sliders,
                title: "Coding & Simple Test Modes",
                text: "Choose between deep coding evaluations with Docker sandboxes or simple conceptual tests. Toggle AI hints, custom inputs, and proctored lockdown.",
              },
              {
                icon: Clock3,
                title: "Schedule Timed Assessments",
                text: "Set active windows, strict completion countdowns, and assign assessments directly to test takers with single-click join codes.",
              },
              {
                icon: ShieldCheck,
                title: "Automated Test Evaluation",
                text: "Submissions are checked immediately against comprehensive test suites, computing scores and runtime telemetry automatically.",
              },
            ].map(({ icon, title, text }) => (
              <div
                key={title}
                className="lift rounded-2xl border border-[rgba(28,27,25,.13)] bg-[#f7f3ec] p-6 flex flex-col justify-between h-full"
              >
                <div>
                  <span className="text-[#bd5b3d]">{React.createElement(icon, { className: "h-5 w-5" })}</span>
                  <h3 className="mt-6 text-lg font-semibold text-black/90">{title}</h3>
                  <p className="muted mt-2 text-sm leading-6">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Candidate Exam Experience Preview (No Submit Answer Button) */}
      <section className="bg-[#242922] px-5 py-20 text-[#f4f0e9] sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <div className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.22em] text-[#b9c5ad]">
              <span className="h-px w-9 bg-[#b9c5ad]" />
              The assessment interface
            </div>
            <h2 className="serif max-w-lg text-4xl leading-[1.06] sm:text-5xl">
              A distraction-free IDE built for assessment integrity.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              Candidates write, test, and submit their solutions in an intuitive browser IDE. Evaluators get comprehensive performance audits with complete breakdown of test cases and execution benchmarks.
            </p>
            <button
              onClick={handleAdminAction}
              className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#f1ad91] hover:text-[#f8c8b5] transition"
            >
              Explore the assessment portal <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171b17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#bd5b3d]" />
                <span className="mono text-[11px] text-white/45">assessment / two_sum.cpp</span>
              </div>
              <span className="mono text-[10px] text-[#9cad91]">EXAM SESSION ACTIVE</span>
            </div>
            <div className="grid md:grid-cols-[1fr_200px]">
              <div className="p-6 font-mono text-[12px] leading-7 text-white/70">
                <div className="text-white/25">01&nbsp;&nbsp;#include &lt;vector&gt;</div>
                <div className="text-white/25">02&nbsp;&nbsp;#include &lt;unordered_map&gt;</div>
                <div className="mt-3 text-[#d78b70]">03&nbsp;&nbsp;vector&lt;int&gt; twoSum(</div>
                <div className="text-[#d78b70]">04&nbsp;&nbsp;&nbsp;&nbsp;vector&lt;int&gt;&amp; nums, int target) &#123;</div>
                <div className="text-white/75">05&nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;int, int&gt; seen;</div>
                <div className="text-[#b9c5ad]">06&nbsp;&nbsp;&nbsp;&nbsp;for (int i = 0; i &lt; nums.size(); i++) &#123;</div>
                <div className="text-white/75">07&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;int need = target - nums[i];</div>
                <div className="text-white/25">08&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// check seen table</div>
                <div className="text-[#d78b70]">09&nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
                <div className="text-[#d78b70]">10&nbsp;&nbsp;&#125;</div>
              </div>
              <div className="border-t border-white/10 bg-white/[.03] p-5 md:border-l md:border-t-0 flex flex-col justify-between">
                <div>
                  <div className="mono text-[10px] uppercase tracking-[.16em] text-white/35">Timed Assessment</div>
                  <div className="mt-3 text-sm font-semibold">Two Sum</div>
                  <div className="mt-1 text-xs text-white/45">20 Points · Easy</div>
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="mono text-[10px] text-white/35">COUNTDOWN TIMER</div>
                    <div className="mt-1 text-xs text-[#b9c5ad] font-mono">38:15 Remaining</div>
                  </div>
                </div>

              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-[#b9c5ad]">
              <Check className="h-4 w-4" /> All hidden test cases passed
              <span className="ml-auto mono text-[10px] text-white/35">Score: 20/20 · 0.14s</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1380px] flex-col gap-5 px-5 py-10 text-xs text-black/50 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div className="flex items-center gap-2 font-semibold text-[#1c1b19]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#1c1b19]">C</span>
          codeCaliber
        </div>
        <span>Online coding assessments with automated grading.</span>
        <div className="flex gap-5">
          <button onClick={() => navigate("/assessments")}>Assessments</button>
          <a href="https://github.com/bhaveshTripathi3112/CodeNest" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
