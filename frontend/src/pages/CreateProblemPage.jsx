import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useNavigate } from "react-router";
import { axiosClient } from "../utils/axiosClient";
import { ensureCppHeader } from "../utils/codeUtils";
import Toast from "../components/Toaster";
import { Sparkles, Bot, Wand2, Loader2, CheckCircle2, FileText, Code2, Plus, Trash2 } from "lucide-react";

import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/webpack";

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  difficultyLevel: z.string().min(1, "Difficulty is required"),
  tags: z.string().min(1, "Tag is required"),
  visibleTestCases: z.array(
    z.object({
      input: z.string().min(1, "Visible test input is required"),
      output: z.string().min(1, "Visible test output is required"),
      explanation: z.string().optional().default(""),
    })
  ).min(1, "At least 1 visible test case is required"),
  hiddenTestCases: z.array(
    z.object({
      input: z.string().min(1, "Hidden test input is required"),
      output: z.string().min(1, "Hidden test output is required"),
    })
  ).min(1, "At least 1 hidden test case is required"),
  startCode: z.array(
    z.object({
      language: z.string().min(1),
      initialCode: z.string().min(1, "Starter code is required"),
    })
  ),
  referenceSolution: z.array(
    z.object({
      language: z.string().min(1),
      completeCode: z.string().min(1, "Reference solution is required"),
    })
  ),
});

export default function CreateProblemPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Copilot state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiTag] = useState("array");
  const [aiVisibleCount, setAiVisibleCount] = useState(3);
  const [aiHiddenCount, setAiHiddenCount] = useState(15);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");


  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { register, handleSubmit, control, reset } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      description: "",
      difficultyLevel: "medium",
      tags: "array",
      visibleTestCases: [{ input: "", output: "", explanation: "" }],
      hiddenTestCases: [{ input: "", output: "" }],
      startCode: [
        { language: "c++", initialCode: "" },
        { language: "java", initialCode: "" },
        { language: "javascript", initialCode: "" },
      ],
      referenceSolution: [
        { language: "c++", completeCode: "" },
        { language: "java", completeCode: "" },
        { language: "javascript", completeCode: "" },
      ],
    },
  });

  const { fields: visibleFields, append, remove } = useFieldArray({
    control,
    name: "visibleTestCases",
  });

  const { fields: hiddenFields, replace, append: appendHidden, remove: removeHidden } = useFieldArray({
    control,
    name: "hiddenTestCases",
  });

  // AI Generation Handler
  const handleGenerateWithAi = async (customPrompt, customTag, customDiff) => {
    const promptToUse = customPrompt || aiPrompt;
    const tagToUse = customTag || aiTag;
    const diffToUse = customDiff || aiDifficulty;

    if (!promptToUse.trim()) {
      showToast("Please enter a topic or prompt for the AI Copilot", "error");
      return;
    }

    try {
      setIsGeneratingAi(true);
      setAiSuccessMsg("");

      const res = await axiosClient.post("/problem/ai-generate", {
        prompt: promptToUse.trim(),
        difficultyLevel: diffToUse,
        tag: tagToUse,
        visibleCount: aiVisibleCount ? Number(aiVisibleCount) : 3,
        hiddenCount: aiHiddenCount ? Number(aiHiddenCount) : 15,
      });

      const generated = res.data?.data;
      if (!generated) {
        throw new Error("No problem structure returned from AI");
      }

      // Format starter and reference solutions
      const normalizeLang = (l = "") => {
        const s = String(l).toLowerCase().trim();
        if (s === "cpp" || s === "c++" || s.includes("plus") || s === "c") return "c++";
        if (s === "java") return "java";
        if (s === "javascript" || s === "js") return "javascript";
        return s;
      };

      const findLangItem = (arr, targetLang) => {
        if (!Array.isArray(arr)) return null;
        const found = arr.find((item) => normalizeLang(item.language) === targetLang);
        if (found) return found;
        const targetIdx = targetLang === "c++" ? 0 : targetLang === "java" ? 1 : 2;
        return arr[targetIdx] || null;
      };

      const formattedStartCode = ["c++", "java", "javascript"].map((lang) => {
        const found = findLangItem(generated.startCode, lang);
        const code = found?.initialCode || "";
        return {
          language: lang,
          initialCode: lang === "c++" ? ensureCppHeader(code) : code,
        };
      });

      const formattedRefSolution = ["c++", "java", "javascript"].map((lang) => {
        const found = findLangItem(generated.referenceSolution, lang);
        const code = found?.completeCode || "";
        return {
          language: lang,
          completeCode: lang === "c++" ? ensureCppHeader(code) : code,
        };
      });

      const formattedHidden = (generated.hiddenTestCases || []).map((hf) => ({
        input: String(hf.input || ""),
        output: String(hf.output || ""),
      }));

      const formattedVisible = (generated.visibleTestCases || []).map((vf) => ({
        input: String(vf.input || ""),
        output: String(vf.output || ""),
        explanation: String(vf.explanation || ""),
      }));

      // Populate form fields
      reset({
        title: generated.title || "",
        description: generated.description || "",
        difficultyLevel: generated.difficultyLevel || diffToUse,
        tags: generated.tags || tagToUse,
        visibleTestCases: formattedVisible,
        hiddenTestCases: formattedHidden,
        startCode: formattedStartCode,
        referenceSolution: formattedRefSolution,
      });

      // Synchronize field array
      if (formattedHidden.length > 0) {
        replace(formattedHidden);
      }

      setAiSuccessMsg(
        `Synthesized "${generated.title}" with ${formattedVisible.length} visible & ${formattedHidden.length} hidden test cases!`
      );
      showToast("Problem synthesized successfully by Gemini Copilot!", "success");
    } catch (err) {
      console.error("AI Generation Error:", err);
      showToast(
        err.response?.data?.message || "Failed to generate problem with AI",
        "error"
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Robust parser for file upload
  const extractHiddenTestcases = (text) => {
    const regex = /INPUT:\s*([\s\S]*?)\s*OUTPUT:\s*([\s\S]*?)(?=INPUT:|$)/gi;
    const arr = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      arr.push({
        input: match[1].trim(),
        output: match[2].trim(),
      });
    }

    if (!arr.length) {
      showToast("Invalid INPUT/OUTPUT format in file", "error");
      return;
    }

    replace(arr);
    showToast(`${arr.length} hidden testcases loaded from file`, "success");
  };

  const handleDocxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    extractHiddenTestcases(result.value);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((x) => x.str).join(" ") + "\n";
    }

    extractHiddenTestcases(text);
  };

  const handleJsonUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        showToast("JSON must be an array of test cases", "error");
        return;
      }
      replace(parsed);
      showToast(`${parsed.length} hidden testcases loaded`, "success");
    } catch {
      showToast("Invalid JSON file", "error");
    }
  };

  const onInvalid = (validationErrors) => {
    console.error("Form Validation Errors:", validationErrors);
    let msg = "Please complete all required fields.";
    if (validationErrors.title) msg = validationErrors.title.message;
    else if (validationErrors.description) msg = validationErrors.description.message;
    else if (validationErrors.visibleTestCases) msg = "Please provide valid inputs and outputs for visible test cases.";
    else if (validationErrors.hiddenTestCases) msg = "Please provide at least 1 hidden test case with input and output.";
    else if (validationErrors.startCode) msg = "Please ensure starter code is provided for C++, Java, and JS.";
    else if (validationErrors.referenceSolution) msg = "Please ensure reference solutions are provided for C++, Java, and JS.";
    showToast(`Validation: ${msg}`, "error");
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const payload = {
        title: data.title.trim(),
        description: data.description.trim(),
        difficultyLevel: data.difficultyLevel.toLowerCase(),
        tags: data.tags === "linked list" ? "linkedList" : data.tags,
        visibleTestCases: data.visibleTestCases.map((v) => ({
          input: String(v.input || ""),
          output: String(v.output || ""),
          explanation: String(v.explanation || ""),
        })),
        hiddenTestCases: data.hiddenTestCases.map((h) => ({
          input: String(h.input || ""),
          output: String(h.output || ""),
        })),
        startCode: ["c++", "java", "javascript"].map((lang, idx) => ({
          language: lang,
          initialCode:
            lang === "c++"
              ? ensureCppHeader(data.startCode?.[idx]?.initialCode)
              : data.startCode?.[idx]?.initialCode || "",
        })),
        referenceSolution: ["c++", "java", "javascript"].map((lang, idx) => ({
          language: lang,
          completeCode:
            lang === "c++"
              ? ensureCppHeader(data.referenceSolution?.[idx]?.completeCode)
              : data.referenceSolution?.[idx]?.completeCode || "",
        })),
      };

      console.log("Submitting Problem Payload to backend:", payload);
      await axiosClient.post("/problem/create", payload);
      showToast("Problem created and verified successfully!", "success");
      setTimeout(() => navigate("/admin"), 1200);
    } catch (err) {
      console.error("Create Problem Submit Error:", err);
      showToast(err.response?.data?.message || err.message || "Error creating problem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-800">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <Code2 className="w-8 h-8 text-zinc-400" />
              Create Coding Problem
            </h1>
            <p className="text-slate-500 mt-1">
              Add manually, import from documents, or generate instantly using the Gemini AI Copilot.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="self-start md:self-auto px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            ← Back to Admin Panel
          </button>
        </div>

        {/* AI COPILOT HERO CARD */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-zinc-800 rounded-xl border border-zinc-700">
                <Sparkles className="w-5 h-5 text-zinc-300" />
              </span>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                  Gemini AI Problem Synthesizer
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                    Automated
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Type an algorithmic concept. AI automatically synthesizes problem statements, constraints, test suites, and reference solutions in C++, Java, and JS.
                </p>
              </div>
            </div>

            {/* INPUT CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              <div className="md:col-span-5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Medium problem on Binary Search Tree (or specify '5 visible, 20 hidden')..."
                  className="w-full h-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerateWithAi();
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full h-full px-3 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 text-sm cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2">
                <div className="text-center">
                  <span className="block text-[9px] uppercase font-bold text-zinc-400 font-mono">Visible</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={aiVisibleCount}
                    onChange={(e) => setAiVisibleCount(e.target.value)}
                    className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-white font-bold text-xs focus:ring-1 focus:ring-zinc-600"
                    title="Visible Test Cases (Default: 3)"
                  />
                </div>
                <span className="text-zinc-600 font-bold text-xs mt-3">/</span>
                <div className="text-center">
                  <span className="block text-[9px] uppercase font-bold text-zinc-400 font-mono">Hidden</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={aiHiddenCount}
                    onChange={(e) => setAiHiddenCount(e.target.value)}
                    className="w-11 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-white font-bold text-xs focus:ring-1 focus:ring-zinc-600"
                    title="Hidden Test Cases (Default: 15)"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={() => handleGenerateWithAi()}
                  disabled={isGeneratingAi}
                  className="w-full h-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Challenge</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-1 font-mono">
              <span>Standard allocation: <strong>3 Visible</strong> &amp; <strong>15 Hidden</strong> test cases.</span>
            </div>

            {/* SUCCESS BANNER */}
            {aiSuccessMsg && (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2.5 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* MAIN PROBLEM FORM */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* BASIC DETAILS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <FileText className="w-5 h-5 text-zinc-400" />
              1. Problem Overview
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Problem Title
                </label>
                <input
                  {...register("title")}
                  placeholder="e.g. Maximum Subarray Sum"
                  className="border border-slate-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-zinc-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Description (Markdown supported)
                </label>
                <textarea
                  {...register("description")}
                  placeholder="Describe the problem, input format, output format, constraints, and examples..."
                  rows={6}
                  className="border border-slate-300 rounded-lg p-2.5 w-full text-sm font-mono focus:ring-2 focus:ring-zinc-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    {...register("difficultyLevel")}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-zinc-700 focus:outline-none bg-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Primary DSA Category / Tag
                  </label>
                  <select
                    {...register("tags")}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-zinc-700 focus:outline-none bg-white"
                  >
                    <option value="array">Array</option>
                    <option value="linkedList">Linked List</option>
                    <option value="graph">Graph</option>
                    <option value="tree">Tree</option>
                    <option value="stack">Stack</option>
                    <option value="queue">Queue</option>
                    <option value="dp">Dynamic Programming</option>
                    <option value="strings">Strings</option>
                    <option value="search">Search</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* VISIBLE TESTCASES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                2. Visible Test Cases ({visibleFields.length})
              </h2>
              <button
                type="button"
                onClick={() => append({ input: "", output: "", explanation: "" })}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-800 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {visibleFields.map((f, i) => (
                <div key={f.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 bg-zinc-200 px-2.5 py-0.5 rounded-md">
                      Example Test Case {i + 1}
                    </span>
                    {visibleFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Input (stdin)</label>
                      <textarea
                        {...register(`visibleTestCases.${i}.input`)}
                        placeholder="e.g. 5\n1 2 3 4 5"
                        rows={2}
                        className="border border-slate-300 rounded-lg p-2 w-full text-xs font-mono focus:ring-1 focus:ring-zinc-700 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Expected Output (stdout)</label>
                      <textarea
                        {...register(`visibleTestCases.${i}.output`)}
                        placeholder="e.g. 15"
                        rows={2}
                        className="border border-slate-300 rounded-lg p-2 w-full text-xs font-mono focus:ring-1 focus:ring-zinc-700 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Explanation</label>
                    <input
                      {...register(`visibleTestCases.${i}.explanation`)}
                      placeholder="e.g. The sum of the whole array is 15."
                      className="border border-slate-300 rounded-lg p-2 w-full text-xs focus:ring-1 focus:ring-zinc-700 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HIDDEN TESTCASES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-zinc-400" />
                  3. Hidden Test Cases ({hiddenFields.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Used for strict verification and grading in Codebox.
                </p>
              </div>

              {/* UPLOAD SHORTCUT */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 transition-all">
                  <span>Import .docx / .pdf / .json</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".docx,.pdf,.json,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.name.endsWith(".docx")) handleDocxUpload(e);
                      else if (file.name.endsWith(".pdf")) handlePdfUpload(e);
                      else if (file.name.endsWith(".json") || file.name.endsWith(".txt"))
                        handleJsonUpload(e);
                      else showToast("Invalid file type", "error");
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => appendHidden({ input: "", output: "" })}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add One
                </button>
              </div>
            </div>

            {hiddenFields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                No hidden test cases yet. Click &quot;Generate Problem&quot; with Gemini above or upload a document.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {hiddenFields.map((hf, i) => (
                  <div key={hf.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Hidden Testcase {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeHidden(i)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Input (stdin):</span>
                      <textarea
                        {...register(`hiddenTestCases.${i}.input`)}
                        rows={2}
                        placeholder="Hidden input..."
                        className="border border-slate-300 rounded p-1.5 w-full font-mono text-[11px] bg-white focus:ring-1 focus:ring-zinc-700"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Expected Output (stdout):</span>
                      <textarea
                        {...register(`hiddenTestCases.${i}.output`)}
                        rows={2}
                        placeholder="Expected output..."
                        className="border border-slate-300 rounded p-1.5 w-full font-mono text-[11px] bg-white focus:ring-1 focus:ring-zinc-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STARTER CODE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Code2 className="w-5 h-5 text-zinc-400" />
              4. Language Starter Boilerplate
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["c++", "java", "javascript"].map((lang, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {lang} Starter Code
                  </span>
                  <input type="hidden" {...register(`startCode.${i}.language`)} value={lang} />
                  <textarea
                    {...register(`startCode.${i}.initialCode`)}
                    rows={8}
                    placeholder={`Starter boilerplate for ${lang}...`}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-xs font-mono focus:ring-1 focus:ring-zinc-700 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* REFERENCE SOLUTION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                5. Complete Working Reference Solutions
              </h2>
              <p className="text-xs text-slate-500">
                Codebox tests these solutions against visible test cases before approving problem creation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["c++", "java", "javascript"].map((lang, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    {lang} Solution
                  </span>
                  <input type="hidden" {...register(`referenceSolution.${i}.language`)} value={lang} />
                  <textarea
                    {...register(`referenceSolution.${i}.completeCode`)}
                    rows={10}
                    placeholder={`Complete runnable solution for ${lang}...`}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-xs font-mono focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validating & Creating Problem...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Publish Problem to Platform</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
