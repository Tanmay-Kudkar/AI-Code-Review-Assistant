// ─── AI Code Review Service ───────────────────────────────────────────────────
// Splits the review into 4 independent, focused Gemini API calls that can run
// in parallel, giving each section the AI's full attention and token budget.

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Creates a configured Gemini generative model instance.
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });
};

/**
 * Core Gemini API caller with exponential-backoff retry logic.
 *
 * @param {string} prompt - The full prompt text to send to the model
 * @param {number} [retries=2] - Maximum retry attempts on transient failure
 * @returns {Promise<string>} Raw JSON text from the model
 * @throws {Error} After all retry attempts are exhausted
 */
const callGemini = async (prompt, retries = 2) => {
  const model = getModel();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (err) {
      console.error(`[AiReview] Attempt ${attempt + 1} failed:`, err.message);
      if (attempt < retries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
      } else {
        throw new Error(`AI call failed after ${retries + 1} attempts: ${err.message}`);
      }
    }
  }
};

/**
 * Safely parses a raw JSON string, falling back to regex extraction if needed.
 * @param {string} raw
 * @returns {Object}
 */
const safeParseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {};
  }
};

// ─── Section A: AI Review ─────────────────────────────────────────────────────

/**
 * Runs a deep AI review focused on bugs, code smells, suggestions, security
 * vulnerabilities, and performance issues.
 *
 * @param {string} code - Source code to analyze
 * @param {string} language - Programming language (e.g. 'javascript', 'python')
 * @returns {Promise<{bugs: Array, smells: Array, suggestions: Array, security: Array, performance: Array}>}
 */
const runAiReviewSection = async (code, language, framework = 'none') => {
  const frameworkContext = framework !== 'none' ? ` The user has indicated this code uses the ${framework} framework, so tailor your architectural and best-practice advice accordingly.` : '';
  
  const prompt = `You are a senior software engineer and security expert with 15+ years of experience performing thorough production code reviews.

Your task: Deeply analyze the following ${language} code for bugs, code smells, security vulnerabilities, and performance issues.${frameworkContext}

Return ONLY a valid JSON object with EXACTLY these keys:
{
  "bugs": [{ "line": number|null, "description": "string", "severity": "critical|high|medium|low" }],
  "smells": [{ "type": "string", "description": "string", "location": "string" }],
  "suggestions": [{ "title": "string", "description": "string", "codeExample": "string (max 10 lines)" }],
  "security": [{ "issue": "string", "risk": "critical|high|medium|low", "recommendation": "string" }],
  "performance": [{ "issue": "string", "impact": "string", "fix": "string" }]
}

Rules:
- Be exhaustive. Do not skip any real issue, even minor ones.
- Return empty arrays [] if a category genuinely has no issues.
- For bugs, identify the exact line if possible.
- For security, be specific about the attack vector and provide a concrete fix.
- For suggestions, the codeExample must be a working ${language} snippet (max 10 lines).
- For performance, describe the runtime/memory impact precisely (e.g. "O(n²) inner loop").
- RESPOND ONLY WITH VALID JSON. No markdown, no explanation, no preamble.

${language} code to review:
\`\`\`${language}
${code}
\`\`\``;

  const raw = await callGemini(prompt);
  const parsed = safeParseJson(raw);
  return {
    bugs: parsed.bugs || [],
    smells: parsed.smells || [],
    suggestions: parsed.suggestions || [],
    security: parsed.security || [],
    performance: parsed.performance || [],
  };
};

// ─── Section B: Documentation ─────────────────────────────────────────────────

/**
 * Generates comprehensive, production-ready documentation for all functions
 * and classes in the provided code.
 *
 * @param {string} code - Source code to document
 * @param {string} language - Programming language
 * @returns {Promise<{documentation: string}>}
 */
const runDocumentationSection = async (code, language, framework = 'none') => {
  const docStyle = {
    javascript: 'JSDoc', typescript: 'TSDoc', python: 'Google-style Python docstrings',
    java: 'JavaDoc', cpp: 'Doxygen', c: 'Doxygen', go: 'GoDoc', php: 'PHPDoc',
    ruby: 'RDoc', rust: 'Rustdoc',
  }[language] || 'language-appropriate docstrings';

  const frameworkContext = framework !== 'none' ? ` Assume the context of a ${framework} application where appropriate.` : '';

  const prompt = `You are a technical documentation specialist. Your job is to write comprehensive, production-grade ${docStyle} documentation for the provided ${language} code.${frameworkContext}

Return ONLY a valid JSON object with EXACTLY this key:
{
  "documentation": "string"
}

The "documentation" value must contain complete ${docStyle} comment blocks for EVERY function, method, and class in the code. Each block MUST include:
1. A clear, professional summary description (2–3 sentences explaining what the function/class does and WHY it exists)
2. @param / :param tags with types AND descriptions for every parameter, including edge cases
3. @returns / :returns tag with type and description of the return value
4. @throws / :raises tags for every possible exception or error condition
5. @example block showing realistic usage (where applicable)
6. Notes on any important side effects, preconditions, or performance characteristics

Write the documentation as a single string with newlines (\\n) as separators, ready to be inserted directly into the source file. Do NOT describe what to write — write the actual documentation text.

RESPOND ONLY WITH VALID JSON. No markdown fences, no explanation.

${language} code to document:
\`\`\`${language}
${code}
\`\`\``;

  const raw = await callGemini(prompt);
  const parsed = safeParseJson(raw);
  return { documentation: parsed.documentation || '' };
};

// ─── Section C: Big-O Complexity Analysis ─────────────────────────────────────

/**
 * Calculates the exact time and space complexity (Big-O notation) for every
 * function and method found in the code.
 *
 * @param {string} code - Source code to analyze
 * @param {string} language - Programming language
 * @returns {Promise<{complexities: Array}>}
 */
const runBigOSection = async (code, language, framework = 'none') => {
  const frameworkContext = framework !== 'none' ? ` Keep in mind this is within a ${framework} context (e.g. built-in hooks or framework-specific lifecycle costs if applicable).` : '';
  
  const prompt = `You are an algorithms expert. Your task is to calculate the precise Big-O time and space complexity for every function and method in the provided ${language} code.${frameworkContext}

Return ONLY a valid JSON object with EXACTLY this key:
{
  "complexities": [
    {
      "functionName": "string (exact function/method name)",
      "timeComplexity": "string (e.g. O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ))",
      "spaceComplexity": "string (e.g. O(1), O(n))",
      "explanation": "string (2-3 sentences explaining WHY this complexity is correct, e.g. which loop or data structure causes it)"
    }
  ]
}

Rules:
- Analyze EVERY function and method individually. Do not group them.
- Use precise standard Big-O notation. Simplify (e.g. O(3n²) → O(n²)).
- Consider both best-case and worst-case; report worst-case unless the function is trivially O(1).
- The "explanation" field must clearly state which line/operation dominates the complexity.
- If there are no named functions, analyze the top-level logic as "main" or "global".
- RESPOND ONLY WITH VALID JSON. No markdown, no explanation, no preamble.

${language} code to analyze:
\`\`\`${language}
${code}
\`\`\``;

  const raw = await callGemini(prompt);
  const parsed = safeParseJson(raw);
  return { complexities: parsed.complexities || [] };
};

// ─── Section D: Refactoring Advice ────────────────────────────────────────────

/**
 * Generates detailed, senior-engineer-level architectural and refactoring
 * advice for the provided code.
 *
 * @param {string} code - Source code to analyze
 * @param {string} language - Programming language
 * @returns {Promise<{refactoring: string}>}
 */
const runRefactoringSection = async (code, language, framework = 'none') => {
  const frameworkContext = framework !== 'none' ? ` The code is part of a ${framework} application. Provide refactoring advice that aligns with ${framework} best practices, idiomatic patterns, and optimal file structures.` : '';

  const prompt = `You are a principal software architect with 20+ years of experience in software design, clean code, and system design.

Your task: Write a detailed, professional refactoring report for the provided ${language} code. This should read like advice from a staff engineer doing a thorough design review.${frameworkContext}

Return ONLY a valid JSON object with EXACTLY this key:
{
  "refactoring": "string"
}

The "refactoring" value must be a comprehensive prose report that covers:
1. **Overall Architecture Assessment**: Is the code well-structured? What design patterns are or should be used?
2. **Single Responsibility**: Does each function/class do one thing? Where are the violations?
3. **Separation of Concerns**: Are different layers of logic mixed together?
4. **Naming & Readability**: Are names descriptive and consistent? What should be renamed?
5. **Duplication & DRY**: What code can be extracted into reusable utilities?
6. **Error Handling**: Is error handling complete, consistent, and informative?
7. **Testability**: How easy is it to unit test this code? What refactors would improve testability?
8. **Concrete Action Plan**: Provide a numbered, prioritized list of the top 5 most impactful refactoring steps to take immediately.

Write in a direct, professional, technical tone. Be specific — reference actual function names, variable names, and line patterns from the code. Minimum 300 words.

RESPOND ONLY WITH VALID JSON. No markdown fences, no explanation.

${language} code to refactor:
\`\`\`${language}
${code}
\`\`\``;

  const raw = await callGemini(prompt);
  const parsed = safeParseJson(raw);
  return { refactoring: parsed.refactoring || '' };
};

// ─── Legacy Compatibility Wrapper ────────────────────────────────────────────
// Kept for backward compatibility. Runs all 4 sections sequentially.

/**
 * @deprecated Use the individual section runners for parallel processing.
 * Runs all AI sections sequentially and merges results.
 */
const runAiReview = async (code, language) => {
  const [reviewResult, docResult, bigOResult, refactorResult] = await Promise.allSettled([
    runAiReviewSection(code, language),
    runDocumentationSection(code, language),
    runBigOSection(code, language),
    runRefactoringSection(code, language),
  ]);

  return {
    bugs: reviewResult.status === 'fulfilled' ? reviewResult.value.bugs : [],
    smells: reviewResult.status === 'fulfilled' ? reviewResult.value.smells : [],
    suggestions: reviewResult.status === 'fulfilled' ? reviewResult.value.suggestions : [],
    security: reviewResult.status === 'fulfilled' ? reviewResult.value.security : [],
    performance: reviewResult.status === 'fulfilled' ? reviewResult.value.performance : [],
    documentation: docResult.status === 'fulfilled' ? docResult.value.documentation : '',
    refactoring: refactorResult.status === 'fulfilled' ? refactorResult.value.refactoring : '',
    complexities: bigOResult.status === 'fulfilled' ? bigOResult.value.complexities : [],
  };
};

module.exports = {
  runAiReview,
  runAiReviewSection,
  runDocumentationSection,
  runBigOSection,
  runRefactoringSection,
};
