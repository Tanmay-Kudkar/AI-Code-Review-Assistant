const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Map a file extension to a language identifier.
 */
const extToLanguage = {
  '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.cs': 'csharp',
  '.php': 'php', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.html': 'html',
  '.css': 'css', '.scss': 'scss', '.json': 'json', '.xml': 'xml', '.md': 'markdown',
  '.sh': 'shell', '.bash': 'shell', '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin',
  '.m': 'objective-c', '.sql': 'sql', '.scala': 'scala', '.pl': 'perl', '.r': 'r',
  '.dart': 'dart', '.lua': 'lua', '.hs': 'haskell', '.ex': 'elixir', '.exs': 'elixir',
  '.erl': 'erlang', '.clj': 'clojure', '.groovy': 'groovy', '.ps1': 'powershell',
  '.yml': 'yaml', '.yaml': 'yaml', 'dockerfile': 'dockerfile', '.graphql': 'graphql', '.gql': 'graphql'
};

/**
 * 🕵️ Map a file extension to a known language identifier.
 * Used when the user uploads a file instead of a raw snippet!
 */
const languageFromExt = (ext) => extToLanguage[ext.toLowerCase()] || 'unknown';

/**
 * 🛠️ Run ESLint statically in memory (Fast!)
 * 
 * Instead of writing a file to disk and running `eslint file.js`, 
 * we use the ESLint Node API to analyze the raw string in memory instantly!
 */
const runESLint = async (code, language) => {
  const { ESLint } = require('eslint');

  const isTS = language === 'typescript';

  // ⚙️ Configure strict rules for the static analyzer
  const eslint = new ESLint({
    overrideConfigFile: true, // Use flat config
    overrideConfig: [{
      files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: {
          ecmaFeatures: { jsx: true }
        },
        globals: {
          console: 'readonly', window: 'readonly', document: 'readonly',
          process: 'readonly', require: 'readonly', module: 'readonly',
          __dirname: 'readonly', setTimeout: 'readonly', setInterval: 'readonly',
          Promise: 'readonly', fetch: 'readonly', React: 'readonly'
        }
      },
      rules: {
        'no-unused-vars': 'warn',
        'no-console': 'off',
        'semi': ['warn', 'always'],
        'no-undef': 'error',
        'eqeqeq': 'warn',
        'no-duplicate-case': 'error',
        'no-empty': 'warn',
        'no-unreachable': 'error',
        'no-constant-condition': 'warn',
        'no-const-assign': 'error',
        'no-redeclare': 'error',
        'no-dupe-keys': 'error',
        'no-dupe-args': 'error',
        'valid-typeof': 'error',
        'no-use-before-define': 'warn',
      },
    }],
  });

  // 🚀 Lint the raw text in memory!
  const results = await eslint.lintText(code, {
    filePath: isTS ? 'file.ts' : 'file.js',
  });

  const issues = [];
  
  // 🧹 Normalize the ESLint output format into our own standard schema
  for (const result of results) {
    for (const msg of result.messages) {
      issues.push({
        line: msg.line || 0,
        column: msg.column || 0,
        severity: msg.severity === 2 ? 'error' : msg.severity === 1 ? 'warning' : 'info',
        rule: msg.ruleId || 'unknown',
        message: msg.message,
      });
    }
  }

  return issues;
};

/**
 * 🐍 Run Pylint on Python code via a temporary file
 * 
 * Unlike ESLint, Pylint doesn't easily run entirely in-memory via Node,
 * so we write the string to a temporary file, execute the CLI, and parse the JSON!
 */
const runPylint = async (code) => {
  // 1️⃣ Create a unique temporary file path
  const tmpFile = path.join(os.tmpdir(), `pylint_${Date.now()}.py`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  try {
    // 2️⃣ Execute Pylint via a shell command
    const { stdout } = await execAsync(
      `pylint "${tmpFile}" --output-format=json --disable=C0114,C0115,C0116 --score=no`,
      { timeout: 30000 }
    );
    const pylintOutput = JSON.parse(stdout || '[]');
    
    // 3️⃣ Normalize the output
    return pylintOutput.map((item) => ({
      line: item.line,
      column: item.column,
      severity: item.type === 'error' ? 'error' : item.type === 'warning' ? 'warning' : 'info',
      rule: item['message-id'],
      message: item.message,
    }));
  } catch (err) {
    // 💥 Pylint exits with a non-zero exit code (an "error") even when it successfully 
    // produces a JSON report if it found ANY issues! So we must parse the error stdout!
    if (err.stdout) {
      try {
        const pylintOutput = JSON.parse(err.stdout);
        return pylintOutput.map((item) => ({
          line: item.line,
          column: item.column,
          severity: item.type === 'error' ? 'error' : item.type === 'warning' ? 'warning' : 'info',
          rule: item['message-id'],
          message: item.message,
        }));
      } catch {
        return [];
      }
    }
    
    // If stdout is empty, it means pylint command failed completely (e.g., not installed)
    if (err.message && (err.message.includes('not found') || err.message.includes('not recognized') || err.code === 'ENOENT')) {
      return [{
        line: 1, column: 1, severity: 'warning', rule: 'system-error',
        message: 'Pylint is not installed on the server. Python static analysis is disabled.'
      }];
    }
    
    return [];
  } finally {
    // 🧹 ALWAYS clean up the temporary file, even if it crashes!
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
};

/**
 * 🌍 Universal Regex-based Linter
 * 
 * Used as a fallback for languages where we don't have a dedicated AST-based static analyzer.
 * Uses smart regex rules to catch common bugs, security flaws, and code smells across ANY language!
 */
const runUniversalLinter = (code) => {
  const issues = [];
  const lines = code.split('\n');

  const rules = [
    {
      id: 'hardcoded-credentials',
      sev: 'error',
      msg: 'Possible hardcoded credential or password detected.',
      regex: /(password|secret|api_key|token)\s*[:=]\s*["'][^"']+["']/i
    },
    {
      id: 'sql-injection-risk',
      sev: 'error',
      msg: 'Potential SQL Injection vulnerability. Avoid concatenating raw variables into SQL queries.',
      regex: /(SELECT|UPDATE|DELETE|INSERT)\s+.*(=\s*["']?\s*[\+\.]|f["'].*\{|=\s*\$[a-zA-Z])/i
    },
    {
      id: 'todo-comment',
      sev: 'info',
      msg: 'TODO or FIXME comment found. Make sure to resolve this before production.',
      regex: /\b(TODO|FIXME|HACK|XXX)\b/
    },
    {
      id: 'empty-catch',
      sev: 'warning',
      msg: 'Empty catch/except block detected. Exceptions should be handled or logged.',
      regex: /(catch\s*\([^\)]*\)\s*\{\s*\}|except\s*.*:\s*pass)/
    },
    {
      id: 'xss-risk',
      sev: 'error',
      msg: 'Potential XSS vulnerability. Direct HTML concatenation or unsafe rendering detected.',
      regex: /(dangerouslySetInnerHTML|innerHTML\s*=|new\s+Response\s*\(\s*['"]<[a-z])/i
    }
  ];

  lines.forEach((line, index) => {
    rules.forEach(rule => {
      // Don't flag rules on comment lines (except the TODO rule)
      const isComment = line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('/*');
      if (rule.id !== 'todo-comment' && isComment) return;
      
      if (rule.regex.test(line)) {
        issues.push({
          line: index + 1,
          column: 1,
          severity: rule.sev,
          rule: rule.id,
          message: rule.msg
        });
      }
    });
  });

  return issues;
};

/**
 * 📊 Summarize issues into a quick dashboard count
 */
const summarizeIssues = (issues) => {
  const summary = { errors: 0, warnings: 0, info: 0, total: 0 };
  for (const issue of issues) {
    summary.total++;
    if (issue.severity === 'error') summary.errors++;
    else if (issue.severity === 'warning') summary.warnings++;
    else summary.info++;
  }
  return summary;
};

/**
 * 🚀 Main Static Analysis Dispatcher
 * 
 * Orchestrates all the linters above based on the detected programming language.
 * 
 * @param {string} code - Raw source code string
 * @param {string} language - Language identifier (e.g., 'javascript', 'python')
 * @returns {{ issues: Array, summary: Object }}
 */
const runStaticAnalysis = async (code, language) => {
  let issues = [];

  try {
    switch (language) {
      case 'javascript':
      case 'typescript':
        issues = await runESLint(code, language);
        break;
      case 'python':
        issues = await runPylint(code);
        // Fallback to Universal Linter if Pylint is not installed on the server
        if (issues.length === 1 && issues[0].rule === 'system-error') {
          issues = runUniversalLinter(code);
        }
        break;
      default:
        // 🌍 For all other languages, run the Universal Regex Linter!
        issues = runUniversalLinter(code);
    }
  } catch (err) {
    console.error(`[StaticAnalysis] Error running analysis for ${language}:`, err.message);
    issues = [];
  }

  // ✨ Return the raw issues and the summarized counts
  return { issues, summary: summarizeIssues(issues) };
};

module.exports = { runStaticAnalysis, languageFromExt };
