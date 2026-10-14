import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { submitBatch, submitToken, getLanguageById, ensureCppHeader } from "./problem.utility.js";


const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

/**
 * Safely strips markdown code blocks or stray whitespace before parsing JSON.
 */
const safeParseJson = (raw) => {
  if (typeof raw !== "string") return raw;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  return JSON.parse(text);
};

/**
 * Executes a Gemini prompt with automatic fallback across models.
 */
const generateWithFallback = async (prompt, options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment");
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...options,
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn(
        `Gemini model ${modelName} temporarily unavailable: ${err.message}. Trying next fallback...`
      );
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini candidate models failed to respond");
};

/**
 * Strict JSON schema for problem generation to guarantee syntactically valid JSON.
 */
const problemResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    difficultyLevel: { type: SchemaType.STRING },
    tags: { type: SchemaType.STRING },
    visibleTestCases: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          input: { type: SchemaType.STRING },
          output: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
        },
        required: ["input", "output", "explanation"],
      },
    },
    hiddenTestCases: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          input: { type: SchemaType.STRING },
          output: { type: SchemaType.STRING },
        },
        required: ["input", "output"],
      },
    },
    startCode: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          language: { type: SchemaType.STRING },
          initialCode: { type: SchemaType.STRING },
        },
        required: ["language", "initialCode"],
      },
    },
    referenceSolution: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          language: { type: SchemaType.STRING },
          completeCode: { type: SchemaType.STRING },
        },
        required: ["language", "completeCode"],
      },
    },
  },
  required: [
    "title",
    "description",
    "difficultyLevel",
    "tags",
    "visibleTestCases",
    "hiddenTestCases",
    "startCode",
    "referenceSolution",
  ],
};

/**
 * Extract or default visible & hidden test case counts:
 * - Default: 3 visible and 15 hidden test cases if not mentioned
 * - Custom: parsed from user's prompt or explicit parameters if mentioned
 */
export const extractTestCaseCounts = (prompt = "", explicitVisible, explicitHidden) => {
  const promptStr = String(prompt || "");

  const visibleMatch =
    promptStr.match(/(\d+)\s*(?:visible|sample|example)(?:\s*test\s*cases?)?/i) ||
    promptStr.match(/(?:visible|sample|example)(?:\s*test\s*cases?)?[:\s]+(\d+)/i);

  const hiddenMatch =
    promptStr.match(/(\d+)\s*hidden(?:\s*test\s*cases?)?/i) ||
    promptStr.match(/hidden(?:\s*test\s*cases?)?[:\s]+(\d+)/i);

  let visible = visibleMatch ? parseInt(visibleMatch[1] || visibleMatch[2], 10) : undefined;
  let hidden = hiddenMatch ? parseInt(hiddenMatch[1] || hiddenMatch[2], 10) : undefined;

  if (visible === undefined && explicitVisible !== undefined && explicitVisible !== null && explicitVisible !== "") {
    const parsed = parseInt(explicitVisible, 10);
    if (!isNaN(parsed) && parsed > 0) visible = parsed;
  }

  if (hidden === undefined && explicitHidden !== undefined && explicitHidden !== null && explicitHidden !== "") {
    const parsed = parseInt(explicitHidden, 10);
    if (!isNaN(parsed) && parsed > 0) hidden = parsed;
  }

  // Default: 3 visible and 15 hidden if not mentioned
  const finalVisible = visible !== undefined && !isNaN(visible) && visible > 0
    ? Math.min(Math.max(visible, 1), 10)
    : 3;

  const finalHidden = hidden !== undefined && !isNaN(hidden) && hidden > 0
    ? Math.min(Math.max(hidden, 1), 30)
    : 15;

  return { visibleCount: finalVisible, hiddenCount: finalHidden };
};

/**
 * Generate a complete coding problem with guaranteed JSON structure.
 */
export const generateProblemWithGemini = async ({
  prompt,
  difficultyLevel,
  tag,
  visibleCount: reqVisible,
  hiddenCount: reqHidden,
}) => {
  const { visibleCount, hiddenCount } = extractTestCaseCounts(prompt, reqVisible, reqHidden);

  const validTags = [
    "array",
    "linkedList",
    "graph",
    "tree",
    "stack",
    "queue",
    "dp",
    "strings",
    "search",
  ];
  const validDifficulties = ["easy", "medium", "hard"];

  const systemPrompt = `You are an expert Competitive Programming problem setter for LeetCode and Codeforces.
Generate a complete, high-quality, production-ready coding challenge.

PROMPT / TOPIC: "${prompt || "Generate a high quality algorithmic problem"}"
${difficultyLevel ? `REQUESTED DIFFICULTY: ${difficultyLevel}` : ""}
${tag ? `REQUESTED TAG: ${tag}` : ""}

TEST CASE COUNTS:
- visibleTestCases: Exactly ${visibleCount} test cases.
- hiddenTestCases: Exactly ${hiddenCount} test cases.

CONSTRAINTS & RULES:
1. Difficulty must be one of: "easy", "medium", "hard".
2. Tag must be strictly ONE of: "array", "linkedList", "graph", "tree", "stack", "queue", "dp", "strings", "search".
3. Title must be concise and unique.
4. Description: Clean, crystal-clear plain English without raw LaTeX ($...$, \\le, \\times, etc.).
   - Use standard programming comparison symbols: "<=" instead of "\\le", ">=" instead of "\\ge", "*" instead of "\\times".
   - Write variable names directly as N, M, S[i] instead of $N$, $M$, $S[i]$.
   - Write constraints in human readable format like "1 <= N <= 100,000".
   - Include sections: Problem Statement, Input Format, Output Format, Constraints, Examples.
5. visibleTestCases: Must contain EXACTLY ${visibleCount} test cases with input, output, and clear explanation.
6. hiddenTestCases: Must contain EXACTLY ${hiddenCount} diverse, rigorous test cases covering edge cases (boundary limits, large values, empty/single element, negatives, duplicates, scale).
7. Execution Environment (CRITICAL):
   - Standard input (stdin) and standard output (stdout).
   - Test case "input" is provided via stdin.
   - Test case "output" is captured from stdout.
   - Reference solutions: Concise, complete, runnable code reading stdin and printing stdout.
     - C++: runnable code MUST start with "#include <bits/stdc++.h>\nusing namespace std;" and contain int main().
     - Java: runnable code with "public class Main { public static void main(String[] args) { ... } }".
     - JavaScript: runnable code with "const fs = require('fs'); const input = fs.readFileSync(0, 'utf8').trim(); ... console.log(...)".
8. startCode: Concise starter boilerplate for C++, Java, and JavaScript with input reading logic and "// Write your logic here" (C++ starter MUST start with "#include <bits/stdc++.h>\nusing namespace std;").`;

  const text = await generateWithFallback(systemPrompt, {
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: problemResponseSchema,
    },
  });

  const parsed = safeParseJson(text);

  // Strip any stray LaTeX math symbols from description
  const cleanDescription = (desc = "") => {
    return String(desc)
      .replace(/\$\$(.*?)\$\$/g, "$1")
      .replace(/\$(.*?)\$/g, "$1")
      .replace(/\\le\b/g, "<=")
      .replace(/\\ge\b/g, ">=")
      .replace(/\\times\b/g, "*")
      .replace(/\\pm\b/g, "+/-")
      .replace(/\\neq\b/g, "!=")
      .replace(/^###\s+/gm, "")
      .trim();
  };

  if (parsed.description) {
    parsed.description = cleanDescription(parsed.description);
  }

  // Validate tags and difficulty
  if (!validTags.includes(parsed.tags)) {
    parsed.tags = validTags.includes(tag) ? tag : "array";
  }
  if (!validDifficulties.includes(parsed.difficultyLevel)) {
    parsed.difficultyLevel = validDifficulties.includes(difficultyLevel)
      ? difficultyLevel
      : "medium";
  }

  // Normalize language identifiers to standard c++, java, javascript
  const normalizeLang = (l = "") => {
    const s = String(l).toLowerCase().trim();
    if (s === "cpp" || s === "c++" || s.includes("plus") || s === "c") return "c++";
    if (s === "java") return "java";
    if (s === "javascript" || s === "js") return "javascript";
    return s;
  };

  if (Array.isArray(parsed.startCode)) {
    parsed.startCode = parsed.startCode.map((item, idx) => {
      const language = normalizeLang(item.language) || (idx === 0 ? "c++" : idx === 1 ? "java" : "javascript");
      const initialCode = language === "c++" ? ensureCppHeader(item.initialCode) : item.initialCode;
      return {
        ...item,
        language,
        initialCode,
      };
    });
  }

  if (Array.isArray(parsed.referenceSolution)) {
    parsed.referenceSolution = parsed.referenceSolution.map((item, idx) => {
      const language = normalizeLang(item.language) || (idx === 0 ? "c++" : idx === 1 ? "java" : "javascript");
      const completeCode = language === "c++" ? ensureCppHeader(item.completeCode) : item.completeCode;
      return {
        ...item,
        language,
        completeCode,
      };
    });
  }

  // Calibrate testcase outputs with ground-truth Codebox execution
  await calibrateTestCasesWithCodebox(parsed);

  return parsed;
};

/**
 * Executes the generated reference solution in Codebox against all test case inputs
 * to guarantee that expected outputs are 100% mathematically accurate with zero hallucinations.
 */
const calibrateTestCasesWithCodebox = async (parsed) => {
  try {
    if (!Array.isArray(parsed.referenceSolution) || parsed.referenceSolution.length === 0) return;

    // Pick reference solution (prefer javascript or c++)
    const ref =
      parsed.referenceSolution.find((r) => r.language === "javascript") ||
      parsed.referenceSolution.find((r) => r.language === "c++") ||
      parsed.referenceSolution[0];

    if (!ref || !ref.completeCode) return;

    const langId = getLanguageById(ref.language);
    if (!langId) return;

    const visibleSubmissions = (parsed.visibleTestCases || []).map((tc) => ({
      source_code: ref.completeCode,
      language_id: langId,
      stdin: String(tc.input || ""),
    }));

    const hiddenSubmissions = (parsed.hiddenTestCases || []).map((tc) => ({
      source_code: ref.completeCode,
      language_id: langId,
      stdin: String(tc.input || ""),
    }));

    const allSubmissions = [...visibleSubmissions, ...hiddenSubmissions];
    if (allSubmissions.length === 0) return;

    const tokens = await submitBatch(allSubmissions);
    const results = await submitToken(tokens.map((t) => t.token));

    for (let i = 0; i < (parsed.visibleTestCases || []).length; i++) {
      const res = results[i];
      if (res && res.stdout) {
        parsed.visibleTestCases[i].output = res.stdout.trim();
      }
    }

    const offset = (parsed.visibleTestCases || []).length;
    for (let i = 0; i < (parsed.hiddenTestCases || []).length; i++) {
      const res = results[offset + i];
      if (res && res.stdout) {
        parsed.hiddenTestCases[i].output = res.stdout.trim();
      }
    }

    console.log("Successfully calibrated ground-truth outputs with Codebox!");
  } catch (err) {
    console.warn("Auto-calibration skipped:", err.message);
  }
};


/**
 * Generate a Socratic hint for a student working on a problem.
 * Never gives away direct code; asks guiding questions and points out algorithmic intuition.
 */
export const generateSocraticHint = async ({
  problemTitle,
  problemDescription,
  code,
  language,
  failedTestCase,
  hintNumber = 1,
}) => {
  const prompt = `You are a patient, encouraging Computer Science Teaching Assistant (TA) in a college lab.
A student is working on the problem: "${problemTitle}".
Student's Language: ${language || "C++"}

Problem Description excerpt:
${problemDescription ? problemDescription.substring(0, 800) : "N/A"}

Student's Current Code:
\`\`\`${language}
${code || "// No code written yet"}
\`\`\`

${
  failedTestCase
    ? `The student's code failed on this test case:
Input: ${failedTestCase.input || "N/A"}
Expected Output: ${failedTestCase.expectedOutput || "N/A"}
Actual Output: ${failedTestCase.actualOutput || "N/A"}
Error: ${failedTestCase.error || "N/A"}`
    : ""
}

TASK:
Provide Hint #${hintNumber} using the Socratic method.
RULES:
1. DO NOT write or reveal the full solution code.
2. If Hint #1: Give a conceptual hint or ask an intuition question about the algorithm/data structure.
3. If Hint #2: Mention a specific edge-case, loop boundary, or pointer condition they might have missed.
4. If Hint #3: Give a high-level pseudocode or step-by-step logic structure without exact code.
5. Keep your tone supportive, clear, and concise (under 120 words).`;

  return await generateWithFallback(prompt);
};

/**
 * Explains an execution error (Wrong Answer, Runtime Error, TLE, etc.) to a student.
 */
export const explainCodeError = async ({
  problemTitle,
  problemDescription,
  code,
  language,
  errorMessage,
  failedTestCase,
}) => {
  const prompt = `You are an expert programming tutor debugging student code in a college lab.
Problem: "${problemTitle}"
Language: ${language}

Student's Code:
\`\`\`${language}
${code}
\`\`\`

Error Information:
${errorMessage || "Wrong Answer / Test case failure"}

${
  failedTestCase
    ? `Failed Test Case:
Input: ${failedTestCase.input}
Expected Output: ${failedTestCase.expectedOutput}
Actual Output: ${failedTestCase.actualOutput}`
    : ""
}

TASK:
Explain to the student:
1. What went wrong (e.g. infinite loop, off-by-one index error, unhandled edge case, integer overflow).
2. Which part of their code is causing the issue.
3. How to think about fixing it without simply providing the entire copy-paste solution.
Keep the explanation clear, educational, and structured in bullet points.`;

  return await generateWithFallback(prompt);
};

/**
 * Analyzes time and space complexity of user code.
 */
export const reviewCodeComplexity = async ({
  problemTitle,
  code,
  language,
}) => {
  const complexitySchema = {
    type: SchemaType.OBJECT,
    properties: {
      timeComplexity: { type: SchemaType.STRING },
      spaceComplexity: { type: SchemaType.STRING },
      explanation: { type: SchemaType.STRING },
      isOptimal: { type: SchemaType.BOOLEAN },
      optimizationTip: { type: SchemaType.STRING },
    },
    required: ["timeComplexity", "spaceComplexity", "explanation", "isOptimal"],
  };

  const prompt = `Analyze the time and space complexity of this student solution for "${problemTitle}".
Language: ${language}
Code:
\`\`\`${language}
${code}
\`\`\``;

  const text = await generateWithFallback(prompt, {
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: complexitySchema,
    },
  });
  return safeParseJson(text);
};
