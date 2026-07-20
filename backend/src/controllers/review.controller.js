const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { asyncHandler } = require('../middleware/error.middleware');
const { runStaticAnalysis, languageFromExt } = require('../services/staticAnalysis.service');
const {
  runAiReviewSection,
  runDocumentationSection,
  runBigOSection,
  runRefactoringSection,
  generateFixSnippet,
} = require('../services/aiReview.service');
const { analyzeComplexity } = require('../services/complexity.service');
const axios = require('axios');
const { extractAndConcatenate } = require('../utils/projectParser');

// ─── Submit Review ──────────────────────────────────────────────────────────

/**
 * 🚀 POST /api/reviews
 * 
 * The entry point for submitting new code to be reviewed!
 * Accepts either raw code snippets (JSON) OR file uploads (multipart/form-data).
 */
const submitReview = asyncHandler(async (req, res) => {
  let code, language, framework, title, fileName, sourceType, repoUrl, selectedModules;

  // 1️⃣ Determine if this is a File Upload or a Code Snippet or a GitHub URL
  if (req.file) {
    // 📁 Handling File Upload (ZIP or Single File)
    const ext = path.extname(req.file.originalname).toLowerCase();
    framework = req.body.framework || 'none';
    title = req.body.title || req.file.originalname;
    fileName = req.file.originalname;

    if (req.body.selectedModules) {
      try {
        selectedModules = JSON.parse(req.body.selectedModules);
      } catch {
        selectedModules = ['aiReview', 'documentation', 'bigO', 'refactoring'];
      }
    } else {
      selectedModules = ['aiReview', 'documentation', 'bigO', 'refactoring'];
    }
    
    if (ext === '.zip') {
      sourceType = 'PROJECT';
      language = req.body.language || 'mixed';
      
      const zipBuffer = fs.readFileSync(req.file.path);
      try {
        code = extractAndConcatenate(zipBuffer);
      } catch (err) {
        fs.unlinkSync(req.file.path);
        res.status(400);
        throw new Error(`Failed to parse ZIP file: ${err.message}`);
      }
    } else {
      sourceType = 'FILE';
      language = req.body.language || languageFromExt(ext);
      code = fs.readFileSync(req.file.path, 'utf8');
    }
    
    // 🧹 Clean up: Delete the temporary file from disk
    fs.unlinkSync(req.file.path);
  } else if (req.body.githubUrl) {
    // 🐙 Handling GitHub Repository URL
    const schema = z.object({
      githubUrl: z.string().url(),
      language: z.string().optional().default('mixed'),
      framework: z.string().optional().default('none'),
      title: z.string().min(1).max(200),
      selectedModules: z.array(z.string()).optional(),
    });
    const body = schema.parse(req.body);
    selectedModules = body.selectedModules || ['aiReview', 'documentation', 'bigO', 'refactoring'];
    
    let url = body.githubUrl;
    if (url.endsWith('/')) url = url.slice(0, -1);
    
    // Attempt to download the main branch zip
    // e.g. https://github.com/facebook/react -> https://github.com/facebook/react/archive/refs/heads/main.zip
    let zipUrl = `${url}/archive/refs/heads/main.zip`;
    let response;
    
    try {
      response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Fallback to master branch
        zipUrl = `${url}/archive/refs/heads/master.zip`;
        try {
          response = await axios.get(zipUrl, { responseType: 'arraybuffer' });
        } catch (fallbackErr) {
          res.status(400);
          throw new Error('Failed to download repository. Make sure the URL is a public GitHub repository and the default branch is main or master.');
        }
      } else {
        res.status(400);
        throw new Error('Failed to fetch GitHub repository.');
      }
    }
    
    try {
      code = extractAndConcatenate(response.data);
    } catch (err) {
      res.status(400);
      throw new Error(`Failed to parse repository ZIP: ${err.message}`);
    }
    
    language = body.language;
    framework = body.framework;
    title = body.title;
    sourceType = 'GITHUB';
    repoUrl = url;
  } else {
    // ✂️ Handling Code Snippet
    const schema = z.object({
      code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code is too large'),
      language: z.string().min(1),
      framework: z.string().optional(),
      title: z.string().min(1).max(200),
      selectedModules: z.array(z.string()).optional(),
    });
    
    // Validate the snippet data
    const body = schema.parse(req.body);
    selectedModules = body.selectedModules || ['aiReview', 'documentation', 'bigO', 'refactoring'];
    code = body.code;
    language = body.language;
    framework = body.framework || 'none';
    title = body.title;
    sourceType = 'SNIPPET';
  }

  // 2️⃣ Create a placeholder review record in the database
  // It starts in the 'PROCESSING' state while the background tasks run
  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      title,
      language,
      framework,
      sourceType,
      rawCode: code,
      fileName: fileName || null,
      repoUrl: repoUrl || null,
      status: 'PROCESSING',
    },
  });

  // 3️⃣ Kick off the massive background processing pipeline!
  // ⚡ IMPORTANT: We do NOT `await` this! It runs completely in the background
  // so the user gets an instant response while the AI works behind the scenes.
  processReview(review.id, code, language, framework, selectedModules).catch((err) => {
    console.error(`[Review ${review.id}] Pipeline failed:`, err.message);
  });

  // 4️⃣ Immediately return a success message with the new review ID
  res.status(201).json({
    message: 'Review submitted and processing',
    reviewId: review.id,
  });
});

/**
 * 🏭 Background Review Processing Pipeline — Parallel AI Edition
 *
 * Stage 1: Static analysis + local complexity (run in parallel, fast)
 * Stage 2: 4 focused AI sections (run in parallel via Promise.allSettled)
 *   - Section A: AI Review (bugs / smells / suggestions / security / performance)
 *   - Section B: Documentation generation
 *   - Section C: Big-O complexity analysis
 *   - Section D: Refactoring advice
 *
 * Each AI section saves to the DB immediately when it finishes, so the
 * frontend can progressively unlock each tab as results arrive.
 */
const processReview = async (reviewId, code, language, framework, selectedModules = ['aiReview', 'documentation', 'bigO', 'refactoring']) => {
  try {
    // ─── Stage 1: Fast local analyses (run in parallel) ───────────────────────
    const [staticResult, complexityResult] = await Promise.all([
      runStaticAnalysis(code, language),
      Promise.resolve(analyzeComplexity(code, language)),
    ]);

    await Promise.all([
      prisma.staticResult.create({
        data: { reviewId, issues: staticResult.issues, summary: staticResult.summary },
      }),
      prisma.complexity.create({
        data: {
          reviewId,
          linesOfCode: complexityResult.linesOfCode,
          numFunctions: complexityResult.numFunctions,
          numClasses: complexityResult.numClasses,
          cyclomaticAvg: complexityResult.cyclomaticAvg,
          complexity: complexityResult.complexity,
          difficulty: complexityResult.difficulty,
        },
      }),
    ]);

    // ─── Stage 2: Create a placeholder aiResult row immediately ───────────────
    await prisma.aiResult.create({
      data: {
        reviewId,
        bugs: [],
        smells: [],
        suggestions: [],
        security: [],
        performance: [],
        documentation: '',
        refactoring: '',
        rawResponse: '',
        sectionsStatus: {
          aiReview: selectedModules.includes('aiReview') ? 'processing' : 'skipped',
          documentation: selectedModules.includes('documentation') ? 'processing' : 'skipped',
          bigO: selectedModules.includes('bigO') ? 'processing' : 'skipped',
          refactoring: selectedModules.includes('refactoring') ? 'processing' : 'skipped',
        },
      },
    });

    let currentSectionsStatus = {
      aiReview: selectedModules.includes('aiReview') ? 'processing' : 'skipped',
      documentation: selectedModules.includes('documentation') ? 'processing' : 'skipped',
      bigO: selectedModules.includes('bigO') ? 'processing' : 'skipped',
      refactoring: selectedModules.includes('refactoring') ? 'processing' : 'skipped',
    };

    const safeDbUpdate = async (section, status, data = {}) => {
      try {
        currentSectionsStatus[section] = status;
        await prisma.aiResult.update({
          where: { reviewId },
          data: {
            ...data,
            sectionsStatus: currentSectionsStatus,
          },
        });
      } catch (err) {
        console.error(`[Review ${reviewId}] DB Update Error for ${section}:`, err.message);
      }
    };

    // ─── Stage 2: Run all 4 AI sections sequentially ────────────────────────────
    
    // 🤖 Section A: Core AI Review
    if (selectedModules.includes('aiReview')) {
      try {
        const result = await runAiReviewSection(code, language, framework);
        await safeDbUpdate('aiReview', 'done', {
          bugs: result.bugs,
          smells: result.smells,
          suggestions: result.suggestions,
          security: result.security,
          performance: result.performance,
        });
        console.log(`[Review ${reviewId}] ✅ AI Review section done`);
      } catch (err) {
        console.error(`[Review ${reviewId}] ❌ AI Review section failed:`, err.message);
        await safeDbUpdate('aiReview', 'failed');
      }
    }

    // 📚 Section B: Documentation
    if (selectedModules.includes('documentation')) {
      try {
        const result = await runDocumentationSection(code, language, framework);
        await safeDbUpdate('documentation', 'done', {
          documentation: result.documentation,
        });
        console.log(`[Review ${reviewId}] ✅ Documentation section done`);
      } catch (err) {
        console.error(`[Review ${reviewId}] ❌ Documentation section failed:`, err.message);
        await safeDbUpdate('documentation', 'failed');
      }
    }

    // 🔢 Section C: Big-O Complexity
    if (selectedModules.includes('bigO')) {
      try {
        const result = await runBigOSection(code, language, framework);
        await safeDbUpdate('bigO', 'done', {
          complexities: result.complexities,
        });
        console.log(`[Review ${reviewId}] ✅ Big-O section done`);
      } catch (err) {
        console.error(`[Review ${reviewId}] ❌ Big-O section failed:`, err.message);
        await safeDbUpdate('bigO', 'failed');
      }
    }

    // 🏗️ Section D: Refactoring Advice
    if (selectedModules.includes('refactoring')) {
      try {
        const result = await runRefactoringSection(code, language, framework);
        await safeDbUpdate('refactoring', 'done', {
          refactoring: result.refactoring,
        });
        console.log(`[Review ${reviewId}] ✅ Refactoring section done`);
      } catch (err) {
        console.error(`[Review ${reviewId}] ❌ Refactoring section failed:`, err.message);
        await safeDbUpdate('refactoring', 'failed');
      }
    }

    // ✨ All sections settled AND saved to DB. Mark review DONE.
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'DONE' },
    });

  } catch (err) {
    console.error(`[Review ${reviewId}] Pipeline crashed:`, err.message);
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'FAILED', errorMessage: err.message },
    });
  }
};

// ─── Retry Review ─────────────────────────────────────────────────────────────

const runSingleSection = async (reviewId, code, language, framework, section) => {
  const currentAiResult = await prisma.aiResult.findUnique({ where: { reviewId } });
  if (!currentAiResult) return;
  const currentStatus = currentAiResult.sectionsStatus || {};

  const safeDbUpdate = async (status, data) => {
    currentStatus[section] = status;
    await prisma.aiResult.update({
      where: { reviewId },
      data: {
        ...data,
        sectionsStatus: currentStatus,
      },
    });
  };

  try {
    let result;
    if (section === 'aiReview') {
      result = await runAiReviewSection(code, language, framework);
      await safeDbUpdate('done', {
        bugs: result.bugs, smells: result.smells, suggestions: result.suggestions, security: result.security, performance: result.performance,
      });
    } else if (section === 'documentation') {
      result = await runDocumentationSection(code, language, framework);
      await safeDbUpdate('done', { documentation: result.documentation });
    } else if (section === 'bigO') {
      result = await runBigOSection(code, language, framework);
      await safeDbUpdate('done', { complexities: result.complexities });
    } else if (section === 'refactoring') {
      result = await runRefactoringSection(code, language, framework);
      await safeDbUpdate('done', { refactoring: result.refactoring });
    }
  } catch (err) {
    console.error(`[Review ${reviewId}] ❌ Section ${section} retry failed:`, err.message);
    await safeDbUpdate('failed', {});
  }
};

/**
 * 🔄 POST /api/reviews/:id/retry
 * 
 * Clears old results and restarts the review pipeline (or a single section) for a review.
 */
const retryReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const { section } = req.body || {}; // e.g., 'aiReview', 'documentation', 'bigO'
  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: req.user.id },
  });

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (section) {
    const aiResult = await prisma.aiResult.findUnique({ where: { reviewId } });
    if (!aiResult) {
      res.status(400);
      throw new Error('AI Result not initialized');
    }
    
    // Set section to processing
    await prisma.aiResult.update({
      where: { reviewId },
      data: {
        sectionsStatus: {
          ...aiResult.sectionsStatus,
          [section]: 'processing'
        }
      }
    });

    // Run specific section in background
    runSingleSection(reviewId, review.rawCode, review.language, review.framework, section).catch((err) => {
      console.error(`[Review ${reviewId}] Retry section failed:`, err.message);
    });

    return res.json({ message: `Review retry started for section: ${section}` });
  }

  // Fallback: Retrying the entire pipeline
  // Clear any partial results that might exist
  await prisma.aiResult.deleteMany({ where: { reviewId } });
  await prisma.staticResult.deleteMany({ where: { reviewId } });
  await prisma.complexity.deleteMany({ where: { reviewId } });

  // Reset the status to PROCESSING
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: 'PROCESSING', errorMessage: null },
  });

  // Restart the pipeline in the background
  processReview(reviewId, review.rawCode, review.language, review.framework).catch((err) => {
    console.error(`[Review ${reviewId}] Retry pipeline failed:`, err.message);
  });

  res.json({ message: 'Review retry started' });
});

// ─── List Reviews ───────────────────────────────────────────────────────────

/**
 * 📋 GET /api/reviews
 * 
 * Fetches a paginated, filterable, and searchable list of the user's past reviews.
 * Perfect for powering the Dashboard view!
 */
const listReviews = asyncHandler(async (req, res) => {
  // 1️⃣ Extract query parameters from the URL (with smart defaults)
  const {
    search = '',
    language,
    status,
    dateFrom,
    dateTo,
    page = '1',
    limit = '10',
  } = req.query;

  // 2️⃣ Calculate pagination offsets
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Hard cap at 50 items per page
  const skip = (pageNum - 1) * limitNum;

  // 3️⃣ Build a dynamic "WHERE" clause for Prisma based on the filters provided
  const where = {
    userId: req.user.id, // 🔒 ALWAYS restrict to the currently logged-in user!
    
    // 🔍 Optional Search Filter: Match the title OR the language
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { language: { contains: search, mode: 'insensitive' } },
      ],
    }),
    
    // 🏷️ Optional Exact Match Filters
    ...(language && { language }),
    ...(status && { status }),
    
    // 📅 Optional Date Range Filter
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  // 4️⃣ Execute both the Query AND the Count in parallel for maximum performance! ⚡
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // Newest first
      skip,
      take: limitNum,
      // Only select the lightweight fields we need for the dashboard cards
      select: {
        id: true,
        title: true,
        language: true,
        sourceType: true,
        status: true,
        createdAt: true,
        staticResult: { select: { summary: true } },
      },
    }),
    prisma.review.count({ where }), // Need the total count for the pagination UI
  ]);

  // 5️⃣ Return the neatly formatted data payload
  res.json({
    reviews,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ─── Get Single Review ──────────────────────────────────────────────────────

/**
 * GET /api/reviews/:id
 */
const getReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      staticResult: true,
      aiResult: true,
      complexity: true,
    },
  });

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json({ review });
});

// ─── Delete Review ──────────────────────────────────────────────────────────

/**
 * DELETE /api/reviews/:id
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ message: 'Review deleted successfully' });
});

// ─── Partial Result Getters ─────────────────────────────────────────────────

const getStaticResult = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { staticResult: true },
  });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ staticResult: review.staticResult });
});

const getAiResult = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { aiResult: true },
  });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ aiResult: review.aiResult });
});

const getComplexity = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { complexity: true },
  });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ complexity: review.complexity });
});

/**
 * GET /api/reviews/:id/ai/status
 * Returns the per-section generation status so the frontend can progressively unlock tabs.
 */
const getAiSectionsStatus = asyncHandler(async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { aiResult: { select: { sectionsStatus: true, bugs: true, smells: true, suggestions: true, security: true, performance: true, documentation: true, refactoring: true, complexities: true } } },
  });
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const aiResult = review.aiResult;
  if (!aiResult) {
    // AI processing hasn't started yet
    return res.json({
      sectionsStatus: { aiReview: 'pending', documentation: 'pending', bigO: 'pending', refactoring: 'pending' },
      hasData: { aiReview: false, documentation: false, bigO: false, refactoring: false },
    });
  }

  const status = aiResult.sectionsStatus || {};
  res.json({
    sectionsStatus: {
      aiReview: status.aiReview || 'pending',
      documentation: status.documentation || 'pending',
      bigO: status.bigO || 'pending',
      refactoring: status.refactoring || 'pending',
    },
    // Tell the frontend which sections actually have data to show
    hasData: {
      aiReview: Array.isArray(aiResult.bugs) && aiResult.bugs.length > 0 || Array.isArray(aiResult.smells) && aiResult.smells.length > 0 || Array.isArray(aiResult.suggestions) && aiResult.suggestions.length > 0 || Array.isArray(aiResult.security) && aiResult.security.length > 0,
      documentation: !!aiResult.documentation && aiResult.documentation.length > 10,
      bigO: Array.isArray(aiResult.complexities) && aiResult.complexities.length > 0,
      refactoring: !!aiResult.refactoring && aiResult.refactoring.length > 10,
    },
  });
});

// ─── Generate Fix ────────────────────────────────────────────────────────────

/**
 * 🚀 POST /api/reviews/:id/fix
 * Generates an AI fix for a specific issue inside a review
 */
const generateFix = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { issueDescription, line } = req.body;

  if (!issueDescription) {
    return res.status(400).json({ error: 'issueDescription is required' });
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  const fixCode = await generateFixSnippet(review.rawCode, review.language, issueDescription, line);

  res.json({ fixCode });
});

module.exports = {
  submitReview,
  listReviews,
  getReview,
  deleteReview,
  getStaticResult,
  getAiResult,
  getComplexity,
  getAiSectionsStatus,
  retryReview,
  generateFix,
};
