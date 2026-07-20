const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
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
} = require('../controllers/review.controller');

// All review routes require authentication
router.use(authenticate);

router.post('/', upload.single('file'), submitReview);
router.get('/', listReviews);
router.get('/:id', getReview);
router.delete('/:id', deleteReview);
router.get('/:id/static', getStaticResult);
router.get('/:id/ai', getAiResult);
router.get('/:id/ai/status', getAiSectionsStatus);
router.get('/:id/complexity', getComplexity);
router.post('/:id/retry', retryReview);
router.post('/:id/fix', generateFix);

module.exports = router;
