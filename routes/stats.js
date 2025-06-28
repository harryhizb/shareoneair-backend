import express from 'express';
import Share from '../models/Share.js';

const router = express.Router();

// Get statistics
router.get('/', async (req, res) => {
  try {
    const stats = await Share.aggregate([
      {
        $match: {
          expiresAt: { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: null,
          totalShares: { $sum: 1 },
          textShares: {
            $sum: {
              $cond: [{ $eq: ['$type', 'text'] }, 1, 0]
            }
          },
          fileShares: {
            $sum: {
              $cond: [{ $eq: ['$type', 'file'] }, 1, 0]
            }
          },
          totalViews: { $sum: '$views' },
          totalFileSize: {
            $sum: {
              $cond: [{ $eq: ['$type', 'file'] }, '$fileSize', 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalShares: 0,
      textShares: 0,
      fileShares: 0,
      totalViews: 0,
      totalFileSize: 0
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics' 
    });
  }
});

export default router;