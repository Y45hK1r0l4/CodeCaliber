import React from "react";
import { useNavigate } from "react-router";
import { 
  ShieldCheck, 
  PlusCircle, 
  Edit3, 
  BookOpen, 
  UserPlus, 
  Users,
  History,
  ArrowRight
} from "lucide-react";

function AdminPanel() {
  const navigate = useNavigate();

  const features = [
    {
      title: "Live & Scheduled Assessments",
      description: "Monitor active test-takers, review test codes, and observe real-time proctoring telemetry.",
      onClick: () => navigate("/assessments"),
      button: "Open live tests",
      icon: Users,
    },
    {
      title: "Create a test",
      description: "Choose questions, set the duration and scheduled testing window, and get an instant Test Code.",
      onClick: () => navigate("/admin/createTest"),
      button: "Build timed test",
      icon: Edit3,
    },
    {
      title: "Create question",
      description: "Author coding questions with AI assistance, custom test cases, and reference solutions.",
      onClick: () => navigate("/admin/createProblem"),
      button: "Create question",
      icon: PlusCircle,
    },
    {
      title: "Problem list",
      description: "Browse, author, edit, or delete questions across your assessment catalog.",
      onClick: () => navigate("/admin/problems"),
      button: "Manage questions",
      icon: BookOpen,
    },
    {
      title: "Create evaluator account",
      description: "Admins generate evaluator credentials directly. No invitation workflow is required.",
      onClick: () => navigate("/admin/register"),
      button: "Create evaluator",
      icon: UserPlus,
    },
    {
      title: "Assessment History & Reports",
      description: "Review completed tests, candidate scorecards, cohort analytics, and anti-cheat audit trails.",
      onClick: () => navigate("/admin/history"),
      button: "View History & Reports",
      icon: History,
    },
  ];

  return (
    <section className="app-page py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
            <span>ADMIN DASHBOARD · ASSESSMENT MANAGEMENT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Create and edit questions with AI, publish timed assessments, and review candidate performance.
          </p>
        </div>

        {/* Action Grid (3 columns on large screens) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-3 group-hover:border-zinc-700 transition">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight mb-1.5">
                    {feature.title}
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                </div>

                <div>
                  <button
                    onClick={feature.onClick}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <span>{feature.button}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default AdminPanel;
