import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useNavigate, useParams, NavLink } from "react-router";
import { axiosClient } from "../utils/axiosClient";
import Toast from "../components/Toaster";
import {
  Sparkles,
  Wand2,
  Loader2,
  CheckCircle2,
  FileText,
  Code2,
  Plus,
  Trash2,
  ArrowLeft,
  Search,
  Filter,
  Save,
  Edit3,
} from "lucide-react";

import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/webpack";

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  difficultyLevel: z.string().min(1, "Difficulty is required"),
  tags: z.string().min(1, "Tag is required"),
  visibleTestCases: z
    .array(
      z.object({
        input: z.string().min(1, "Visible test input is required"),
        output: z.string().min(1, "Visible test output is required"),
        explanation: z.string().optional().default(""),
      })
    )
    .min(1, "At least 1 visible test case is required"),
  hiddenTestCases: z
    .array(
      z.object({
        input: z.string().min(1, "Hidden test input is required"),
        output: z.string().min(1, "Hidden test output is required"),
      })
    )
    .min(1, "At least 1 hidden test case is required"),
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

export default function EditProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [toast, setToast] = useState(null);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector list state (if visited without :id)
  const [allProblems, setAllProblems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");

  // AI Copilot state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiVisibleCount, setAiVisibleCount] = useState(3);
  const [aiHiddenCount, setAiHiddenCount] = useState(15);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
  } = useForm({
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

  const {
    fields: visibleFields,
    append: appendVisible,
    remove: removeVisible,
  } = useFieldArray({
    control,
    name: "visibleTestCases",
  });

  const {
    fields: hiddenFields,
    replace: replaceHidden,
    append: appendHidden,
    remove: removeHidden,
  } = useFieldArray({
    control,
    name: "hiddenTestCases",
  });

  // If no ID is provided, fetch all problems for selection list
  useEffect(() => {
    if (!id) {
      const fetchList = async () => {
        try {
          setLoadingList(true);
          const res = await axiosClient.get("/problem/getAllProblem");
          setAllProblems(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          console.error("Error fetching problems:", err);
          showToast("Failed to load problems list", "error");
        } finally {
          setLoadingList(false);
        }
      };
      fetchList();
    }
  }, [id]);

  // If ID is provided, fetch full problem details including hidden testcases
  useEffect(() => {
    if (!id) return;

    const fetchProblemData = async () => {
      try {
        setLoadingProblem(true);
        const res = await axiosClient.get(`/problem/admin/getProblem/${id}`);
        const prob = res.data?.data || res.data;

        if (!prob) {
          throw new Error("Problem not found");
        }

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
          const found = findLangItem(prob.startCode, lang);
          return {
            language: lang,
            initialCode: found?.initialCode || "",
          };
        });

        const formattedRefSolution = ["c++", "java", "javascript"].map((lang) => {
          const found = findLangItem(prob.referenceSolution, lang);
          return {
            language: lang,
            completeCode: found?.completeCode || "",
          };
        });

        const formattedVisible = (prob.visibleTestCases || []).map((v) => ({
          input: String(v.input ?? ""),
          output: String(v.output ?? ""),
          explanation: String(v.explanation ?? ""),
        }));

        const formattedHidden = (prob.hiddenTestCases || []).map((h) => ({
          input: String(h.input ?? ""),
          output: String(h.output ?? ""),
        }));

        reset({
          title: prob.title || "",
          description: prob.description || "",
          difficultyLevel: prob.difficultyLevel || "medium",
          tags: prob.tags || "array",
          visibleTestCases: formattedVisible.length > 0 ? formattedVisible : [{ input: "", output: "", explanation: "" }],
          hiddenTestCases: formattedHidden.length > 0 ? formattedHidden : [{ input: "", output: "" }],
          startCode: formattedStartCode,
          referenceSolution: formattedRefSolution,
        });

        if (formattedHidden.length > 0) {
          replaceHidden(formattedHidden);
        }

        setAiDifficulty(prob.difficultyLevel || "medium");
      } catch (err) {
        console.error("Error fetching problem details:", err);
        showToast(err.response?.data?.message || "Failed to load problem for editing", "error");
      } finally {
        setLoadingProblem(false);
      }
    };

    fetchProblemData();
  }, [id, reset, replaceHidden]);

  // AI Assistant for regeneration/enhancement
  const handleAiRefine = async () => {
    if (!aiPrompt.trim()) {
      showToast("Please enter a prompt to enhance or re-generate this problem", "error");
      return;
    }

    try {
      setIsGeneratingAi(true);
      setAiSuccessMsg("");

      const currentTag = getValues("tags") || "array";
      const res = await axiosClient.post("/problem/ai-generate", {
        prompt: aiPrompt.trim(),
        difficultyLevel: aiDifficulty,
        tag: currentTag,
        visibleCount: aiVisibleCount ? Number(aiVisibleCount) : 3,
        hiddenCount: aiHiddenCount ? Number(aiHiddenCount) : 15,
      });

      const generated = res.data?.data;
      if (!generated) throw new Error("No data returned from AI");

      setValue("title", generated.title || getValues("title"));
      setValue("description", generated.description || getValues("description"));
      setValue("difficultyLevel", generated.difficultyLevel || aiDifficulty);

      if (Array.isArray(generated.visibleTestCases) && generated.visibleTestCases.length > 0) {
        setValue("visibleTestCases", generated.visibleTestCases);
      }

      if (Array.isArray(generated.hiddenTestCases) && generated.hiddenTestCases.length > 0) {
        replaceHidden(generated.hiddenTestCases);
      }

      setAiSuccessMsg(`Updated problem fields using AI Copilot with ${generated.visibleTestCases?.length || 0} visible & ${generated.hiddenTestCases?.length || 0} hidden test cases!`);
      showToast("AI synthesized updates into the edit form!", "success");
    } catch (err) {
      console.error("AI refine error:", err);
      showToast(err.response?.data?.message || "AI enhancement failed", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Document upload parser for hidden test cases
  const extractHiddenTestcases = (text) => {
    const testCases = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    let currentInput = null;
    let currentOutput = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^input\s*[:=-]/i.test(line)) {
        if (currentInput !== null && currentOutput !== null) {
          testCases.push({ input: currentInput.trim(), output: currentOutput.trim() });
          currentOutput = null;
        }
        currentInput = line.replace(/^input\s*[:=-]\s*/i, "");
      } else if (/^output\s*[:=-]/i.test(line)) {
        currentOutput = line.replace(/^output\s*[:=-]\s*/i, "");
      }
    }
    if (currentInput !== null && currentOutput !== null) {
      testCases.push({ input: currentInput.trim(), output: currentOutput.trim() });
    }
    return testCases;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rawText = "";
      if (file.type === "text/plain") {
        rawText = await file.text();
      } else if (file.name.endsWith(".docx")) {
        const buffer = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buffer });
        rawText = res.value;
      } else if (file.type === "application/pdf") {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          rawText += content.items.map((item) => item.str).join(" ") + "\n";
        }
      }

      const parsed = extractHiddenTestcases(rawText);
      if (parsed.length > 0) {
        replaceHidden(parsed);
        showToast(`Parsed ${parsed.length} hidden test cases from file!`, "success");
      } else {
        showToast("Could not find standard Input/Output pairs in file.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to parse document", "error");
    }
  };

  const onInvalid = (errorsObj) => {
    let msg = "Please fill all required fields.";
    if (errorsObj.title) msg = "Problem title is required.";
    else if (errorsObj.description) msg = "Problem description is required.";
    else if (errorsObj.visibleTestCases) msg = "Visible test cases must have input and output.";
    else if (errorsObj.hiddenTestCases) msg = "Hidden test cases must have input and output.";
    else if (errorsObj.startCode) msg = "Starter code must be provided for C++, Java, and JS.";
    else if (errorsObj.referenceSolution) msg = "Reference solutions must be provided for C++, Java, and JS.";
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
          initialCode: data.startCode?.[idx]?.initialCode || "",
        })),
        referenceSolution: ["c++", "java", "javascript"].map((lang, idx) => ({
          language: lang,
          completeCode: data.referenceSolution?.[idx]?.completeCode || "",
        })),
      };

      await axiosClient.put(`/problem/update/${id}`, payload);
      showToast("Problem updated and verified successfully!", "success");
      setTimeout(() => navigate("/admin"), 1200);
    } catch (err) {
      console.error("Update problem error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to update problem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If NO id: Show Problem Selection List
  if (!id) {
    const filteredList = allProblems.filter((p) => {
      const matchSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiff = selectedDifficulty === "all" || p.difficultyLevel === selectedDifficulty;
      const matchTag = selectedTag === "all" || p.tags === selectedTag;
      return matchSearch && matchDiff && matchTag;
    });

    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-800">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                <Edit3 className="w-8 h-8 text-indigo-600" />
                Select Problem to Edit
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Choose any existing coding challenge to update its description, test cases, or solutions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/createProblem")}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                + Create New
              </button>
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer"
              >
                ← Admin Panel
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search problem by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Topics / Tags</option>
                {["array", "linkedList", "graph", "tree", "stack", "queue", "dp", "strings", "search"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of problems */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingList ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading problems...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No problems found matching your filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredList.map((prob, idx) => (
                  <div
                    key={prob._id}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                        <h3 className="font-bold text-slate-800 text-base">{prob.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            prob.difficultyLevel === "easy"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : prob.difficultyLevel === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {prob.difficultyLevel}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {prob.tags}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/editProblem/${prob._id}`)}
                      className="self-end md:self-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Problem
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If loading specific problem
  if (loadingProblem) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-600 text-sm font-medium">Loading problem data for editing...</p>
      </div>
    );
  }

  // Specific Problem Edit Form
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-800">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <Edit3 className="w-8 h-8 text-indigo-600" />
              Edit Problem
            </h1>
            <p className="text-slate-500 mt-1">
              Update challenge specifications, visible/hidden test cases, and solution code.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/editProblem")}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer"
            >
              ← Choose Different Problem
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm cursor-pointer"
            >
              Admin Panel
            </button>
          </div>
        </div>

        {/* AI ENHANCE / REGENERATE HERO CARD */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-500/30 rounded-xl backdrop-blur-md border border-indigo-400/30">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              </span>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Gemini AI Problem Refiner
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-300/30">
                    AI Assistant
                  </span>
                </h2>
                <p className="text-xs text-indigo-200">
                  Ask AI to rewrite the problem description, enhance test cases, or add more edge cases.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              <div className="md:col-span-5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Add 20 diverse hidden test cases including negatives and large limits..."
                  className="w-full h-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAiRefine();
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full h-full px-3 py-3 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-center gap-1.5 bg-slate-900/90 border border-white/20 rounded-xl px-2 py-2">
                <div className="text-center">
                  <span className="block text-[9px] uppercase font-bold text-indigo-300">Visible</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={aiVisibleCount}
                    onChange={(e) => setAiVisibleCount(e.target.value)}
                    className="w-10 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center text-amber-300 font-bold text-xs focus:ring-1 focus:ring-amber-300"
                    title="Visible Test Cases"
                  />
                </div>
                <span className="text-slate-500 font-bold text-xs mt-3">/</span>
                <div className="text-center">
                  <span className="block text-[9px] uppercase font-bold text-purple-300">Hidden</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={aiHiddenCount}
                    onChange={(e) => setAiHiddenCount(e.target.value)}
                    className="w-11 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-center text-amber-300 font-bold text-xs focus:ring-1 focus:ring-amber-300"
                    title="Hidden Test Cases"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={handleAiRefine}
                  disabled={isGeneratingAi}
                  className="w-full h-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Refining...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Refine with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiSuccessMsg && (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2.5 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* MAIN PROBLEM EDIT FORM */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* BASIC OVERVIEW */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
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
                  className="border border-slate-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  className="border border-slate-300 rounded-lg p-2.5 w-full text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    {...register("difficultyLevel")}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Algorithm Category (Tag)
                  </label>
                  <select
                    {...register("tags")}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

          {/* VISIBLE TEST CASES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                2. Visible Sample Test Cases ({visibleFields.length})
              </h2>
              <button
                type="button"
                onClick={() => appendVisible({ input: "", output: "", explanation: "" })}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Testcase
              </button>
            </div>

            <div className="space-y-4">
              {visibleFields.map((field, index) => (
                <div key={field.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
                      Sample #{index + 1}
                    </span>
                    {visibleFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVisible(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Standard Input (stdin):</span>
                      <textarea
                        {...register(`visibleTestCases.${index}.input`)}
                        rows={2}
                        placeholder="Sample input..."
                        className="border border-slate-300 rounded-lg p-2 w-full font-mono text-xs bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Expected Output (stdout):</span>
                      <textarea
                        {...register(`visibleTestCases.${index}.output`)}
                        rows={2}
                        placeholder="Sample output..."
                        className="border border-slate-300 rounded-lg p-2 w-full font-mono text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-medium block mb-1">Explanation (Optional):</span>
                    <input
                      {...register(`visibleTestCases.${index}.explanation`)}
                      placeholder="Why is this the expected output?"
                      className="border border-slate-300 rounded-lg p-2 w-full text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HIDDEN TEST CASES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-purple-600" />
                  3. Hidden Verification Test Cases ({hiddenFields.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Used by Codebox to evaluate student code submissions secretly.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer">
                  <span>📁 Upload Document</span>
                  <input
                    type="file"
                    accept=".txt,.docx,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => appendHidden({ input: "", output: "" })}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Hidden
                </button>
              </div>
            </div>

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
                      className="border border-slate-300 rounded p-1.5 w-full font-mono text-[11px] bg-white focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block mb-1">Expected Output (stdout):</span>
                    <textarea
                      {...register(`hiddenTestCases.${i}.output`)}
                      rows={2}
                      placeholder="Expected output..."
                      className="border border-slate-300 rounded p-1.5 w-full font-mono text-[11px] bg-white focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STARTER CODE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Code2 className="w-5 h-5 text-indigo-600" />
              4. Language Starter Boilerplate
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["c++", "java", "javascript"].map((lang, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {lang} Starter Code
                  </span>
                  <input type="hidden" {...register(`startCode.${i}.language`)} value={lang} />
                  <textarea
                    {...register(`startCode.${i}.initialCode`)}
                    rows={8}
                    placeholder={`Starter boilerplate for ${lang}...`}
                    className="border border-slate-300 rounded-lg p-2.5 w-full text-xs font-mono focus:ring-1 focus:ring-indigo-500 bg-white"
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
                Codebox tests these solutions against visible test cases before saving the update.
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
              onClick={() => navigate("/admin/editProblem")}
              className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validating & Updating in Codebox...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Update Problem</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
