import express from 'express';
import fs from 'fs';
import Share from '../models/Share.js';

const router = express.Router();

// Retrieve content by code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        error: 'Invalid code format. Code must be 6 characters long' 
      });
    }

    const share = await Share.findByCode(code);

    if (!share) {
      return res.status(404).json({ 
        error: 'Code not found or has expired' 
      });
    }

    // Check if expired
    if (share.isExpired) {
      // Delete expired share
      await Share.deleteOne({ _id: share._id });
      return res.status(410).json({ 
        error: 'Code has expired' 
      });
    }

    // Check if max views reached
    if (share.isMaxViewsReached) {
      return res.status(410).json({ 
        error: 'Maximum views reached for this content' 
      });
    }

    // Increment view count
    await share.incrementViews();

    if (share.type === 'text') {
      res.json({
        success: true,
        type: 'text',
        content: share.content,
        views: share.views,
        maxViews: share.maxViews,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt
      });
    } else if (share.type === 'file') {
      // Check if file still exists on disk
      if (!fs.existsSync(share.filePath)) {
        // File missing, clean up database entry
        await Share.deleteOne({ _id: share._id });
        return res.status(404).json({ 
          error: 'File not found on server' 
        });
      }

      res.json({
        success: true,
        type: 'file',
        fileName: share.fileName,
        fileSize: share.fileSize,
        downloadUrl: `/api/download/${share.code}`,
        views: share.views,
        maxViews: share.maxViews,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt
      });
    }
  } catch (error) {
    console.error('Retrieve error:', error);
    res.status(500).json({ 
      error: 'Retrieval failed due to server error' 
    });
  }
});

export default router;