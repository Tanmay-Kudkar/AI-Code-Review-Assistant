/**
 * 🧠 Static Complexity Analysis Service
 * 
 * This service analyzes code WITHOUT executing it and WITHOUT using an AST parser.
 * It uses clever Regex (Regular Expressions) to quickly count lines of code, 
 * functions, classes, and calculate the "Cyclomatic Complexity" (how hard the code is to read).
 */

/**
 * 📏 Count Lines of Code (LOC)
 * 
 * Splits the code by newlines and filters out blank lines and comments.
 * We don't want to penalize developers for writing good comments!
 */
const countLOC = (code) => {
  return code
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('"""') &&
        !trimmed.startsWith("'''");
    }).length;
};

/**
 * 🔍 Extract Functions using Regex
 * 
 * Scans the raw text looking for function signatures like `function foo()` or `const foo = () =>`.
 * Uses a different Regex pattern depending on the programming language!
 */
const extractFunctions = (code, language) => {
  const functions = [];

  // Language-specific Regex patterns to find function declarations
  const patterns = {
    javascript: [
      /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(.*?\)\s*=>)/g,
      /(\w+)\s*\(.*?\)\s*\{/g,
    ],
    typescript: [
      /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function|async\s+function\s+(\w+))/g,
    ],
    python: [
      /def\s+(\w+)\s*\(/g,
      /async\s+def\s+(\w+)\s*\(/g,
    ],
    java: [
      /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+\s*)?\{/g,
    ],
  };

  const lang = language.toLowerCase();
  const langPatterns = patterns[lang] || patterns['javascript']; // Fallback to JS if language is unknown

  // Execute the regex search!
  for (const pattern of langPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1] || match[2] || match[3] || 'anonymous';
      if (!functions.includes(name)) {
        functions.push(name);
      }
    }
  }

  // 🧹 Return an array of unique function names
  return [...new Set(functions)];
};

/**
 * 🏗️ Extract Classes using Regex
 * 
 * Scans the raw text looking for class declarations like `class UserData`.
 */
const extractClasses = (code, language) => {
  const classPatterns = {
    javascript: /class\s+(\w+)/g,
    typescript: /class\s+(\w+)/g,
    python: /class\s+(\w+)/g,
    java: /(?:public|private|protected)?\s*class\s+(\w+)/g,
  };

  const pattern = classPatterns[language.toLowerCase()] || classPatterns['javascript'];
  const classes = [];
  let match;
  pattern.lastIndex = 0;
  
  while ((match = pattern.exec(code)) !== null) {
    classes.push(match[1]); // Extract the class name
  }
  return [...new Set(classes)];
};

/**
 * 🌪️ Compute Cyclomatic Complexity
 * 
 * Cyclomatic Complexity is a fancy term for: "How many different paths can the code take?"
 * Every `if`, `for`, `while`, `catch`, `&&`, or `||` creates a new possible path.
 * We just count them up! Higher number = harder to read/maintain.
 */
const computeCyclomaticComplexity = (code) => {
  const decisionKeywords = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*[^:]/g, // Ternary operators (condition ? true : false)
    /&&/g,        // Logical AND
    /\|\|/g,      // Logical OR
  ];

  let count = 1; // Base complexity of every file is 1 (the main path)
  
  for (const pattern of decisionKeywords) {
    const matches = code.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
};

/**
 * 🚦 Rate Overall Difficulty
 * 
 * Returns a simple string (High/Medium/Low) based on the combined metrics.
 */
const rateDifficulty = (loc, numFunctions, cyclomatic) => {
  // 🔴 Extremely complex code
  if (cyclomatic > 20 || loc > 500 || numFunctions > 30) return 'High';
  // 🟡 Moderately complex code
  if (cyclomatic > 10 || loc > 200 || numFunctions > 10) return 'Medium';
  // 🟢 Simple, clean code
  return 'Low';
};

/**
 * 🚀 Main Analyzer Entry Point
 * 
 * Orchestrates all the regex functions above to generate the final Complexity Report.
 * 
 * @param {string} code - The raw source code to analyze
 * @param {string} language - The programming language
 * @returns {Object} A strictly structured JSON report for the frontend charts
 */
const analyzeComplexity = (code, language) => {
  // 1️⃣ Gather all the raw metrics
  const linesOfCode = countLOC(code);
  const functions = extractFunctions(code, language);
  const classes = extractClasses(code, language);
  const cyclomaticTotal = computeCyclomaticComplexity(code);
  
  // 2️⃣ Calculate the average complexity per function
  const cyclomaticAvg = functions.length > 0
    ? Math.round((cyclomaticTotal / functions.length) * 10) / 10
    : cyclomaticTotal;

  // 3️⃣ Generate a rough estimate of complexity for each individual function
  // (Since we don't have an AST, we average it out based on the total complexity)
  const complexity = functions.map((fn) => ({
    name: fn,
    complexity: Math.max(1, Math.round(cyclomaticTotal / Math.max(functions.length, 1))),
    rating: cyclomaticTotal / Math.max(functions.length, 1) > 10 ? 'High'
          : cyclomaticTotal / Math.max(functions.length, 1) > 5 ? 'Medium'
          : 'Low',
  }));

  // 4️⃣ Rate the overall file difficulty
  const difficulty = rateDifficulty(linesOfCode, functions.length, cyclomaticAvg);

  // ✨ Return the beautiful data package
  return {
    linesOfCode,
    numFunctions: functions.length,
    numClasses: classes.length,
    cyclomaticAvg,
    complexity,
    difficulty,
  };
};

module.exports = { analyzeComplexity };
