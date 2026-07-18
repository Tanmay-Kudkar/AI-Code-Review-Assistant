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
} = require('../services/aiReview.service');
const { analyzeComplexity } = require('../services/complexity.service');

// ─── Submit Review ──────────────────────────────────────────────────────────

/**
 * 🚀 POST /api/reviews
 * 
 * The entry point for submitting new code to be reviewed!
 * Accepts either raw code snippets (JSON) OR file uploads (multipart/form-data).
 */
const submitReview = asyncHandler(async (req, res) => {
  let code, language, framework, title, fileName, sourceType;

  // 1️⃣ Determine if this is a File Upload or a Code Snippet
  if (req.file) {
    // 📁 Handling File Upload
    const ext = path.extname(req.file.originalname).toLowerCase();
    language = req.body.language || languageFromExt(ext);
    framework = req.body.framework || 'none';
    title = req.body.title || req.file.originalname;
    fileName = req.file.originalname;
    sourceType = 'FILE';
    
    // Read the file contents from disk into memory
    code = fs.readFileSync(req.file.path, 'utf8');
    
    // 🧹 Clean up: Delete the temporary file from disk so we don't run out of storage
    fs.unlinkSync(req.file.path);
  } else {
    // ✂️ Handling Code Snippet
    const schema = z.object({
      code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code is too large'),
      language: z.string().min(1),
      framework: z.string().optional(),
      title: z.string().min(1).max(200),
    });
    
    // Validate the snippet data
    const body = schema.parse(req.body);
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
      status: 'PROCESSING',
    },
  });

  // 3️⃣ Kick off the massive background processing pipeline!
  // ⚡ IMPORTANT: We do NOT `await` this! It runs completely in the background
  // so the user gets an instant response while the AI works behind the scenes.
  processReview(review.id, code, language, framework).catch((err) => {
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
const processReview = async (reviewId, code, language, framework) => {
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
    // This lets the frontend know the AI work has started, and each section
    // will update this same row as it finishes.
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
          aiReview: 'processing',
          documentation: 'processing',
          bigO: 'processing',
          refactoring: 'processing',
        },
      },
    });

    // ─── Stage 2: Run all 4 AI sections in parallel ────────────────────────────
    // Each section independently calls Gemini, then immediately saves its output.
    // Promise.allSettled ensures one failure doesn't block the rest.
    await Promise.allSettled([

      // 🤖 Section A: Core AI Review
      runAiReviewSection(code, language, framework).then(async (result) => {
        await prisma.aiResult.update({
          where: { reviewId },
          data: {
            bugs: result.bugs,
            smells: result.smells,
            suggestions: result.suggestions,
            security: result.security,
            performance: result.performance,
            sectionsStatus: { aiReview: 'done', documentation: 'processing', bigO: 'processing', refactoring: 'processing' },
          },
        });
        console.log(`[Review ${reviewId}] ✅ AI Review section done`);
      }).catch(async (err) => {
        console.error(`[Review ${reviewId}] ❌ AI Review section failed:`, err.message);
        await prisma.aiResult.update({
          where: { reviewId },
          data: { sectionsStatus: { aiReview: 'failed', documentation: 'processing', bigO: 'processing', refactoring: 'processing' } },
        });
      }),

      // 📚 Section B: Documentation
      runDocumentationSection(code, language, framework).then(async (result) => {
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: {
            documentation: result.documentation,
            sectionsStatus: { ...status, documentation: 'done' },
          },
        });
        console.log(`[Review ${reviewId}] ✅ Documentation section done`);
      }).catch(async (err) => {
        console.error(`[Review ${reviewId}] ❌ Documentation section failed:`, err.message);
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: { sectionsStatus: { ...status, documentation: 'failed' } },
        });
      }),

      // 🔢 Section C: Big-O Complexity
      runBigOSection(code, language, framework).then(async (result) => {
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: {
            complexities: result.complexities,
            sectionsStatus: { ...status, bigO: 'done' },
          },
        });
        console.log(`[Review ${reviewId}] ✅ Big-O section done`);
      }).catch(async (err) => {
        console.error(`[Review ${reviewId}] ❌ Big-O section failed:`, err.message);
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: { sectionsStatus: { ...status, bigO: 'failed' } },
        });
      }),

      // 🏗️ Section D: Refactoring Advice
      runRefactoringSection(code, language, framework).then(async (result) => {
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: {
            refactoring: result.refactoring,
            sectionsStatus: { ...status, refactoring: 'done' },
          },
        });
        console.log(`[Review ${reviewId}] ✅ Refactoring section done`);
      }).catch(async (err) => {
        console.error(`[Review ${reviewId}] ❌ Refactoring section failed:`, err.message);
        const current = await prisma.aiResult.findUnique({ where: { reviewId }, select: { sectionsStatus: true } });
        const status = (current?.sectionsStatus || {});
        await prisma.aiResult.update({
          where: { reviewId },
          data: { sectionsStatus: { ...status, refactoring: 'failed' } },
        });
      }),
    ]);

    // ✨ All sections settled. Mark review DONE.
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

/**
 * 🔄 POST /api/reviews/:id/retry
 * 
 * Clears old results and restarts the review pipeline for a failed review.
 */
const retryReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const review = await prisma.review.findUnique({
    where: { id: reviewId, userId: req.user.id },
  });

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

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
};
