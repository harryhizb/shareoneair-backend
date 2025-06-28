import express from 'express';
import fs from 'fs';
import Share from '../models/Share.js';

const router = express.Router();

// Download file by code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        error: 'Invalid code format' 
      });
    }

    const share = await Share.findOne({ 
      code: code.toUpperCase(), 
      type: 'file' 
    });

    if (!share) {
      return res.status(404).json({ 
        error: 'File not found' 
      });
    }

    // Check if expired
    if (share.isExpired) {
      // Delete expired share and file
      await Share.deleteOne({ _id: share._id });
      if (fs.existsSync(share.filePath)) {
        fs.unlink(share.filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting expired file:', unlinkErr);
        });
      }
      return res.status(410).json({ 
        error: 'File has expired' 
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(share.filePath)) {
      // File missing, clean up database entry
      await Share.deleteOne({ _id: share._id });
      return res.status(404).json({ 
        error: 'File not found on server' 
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.fileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', share.fileSize);
    
    // Stream the file
    const fileStream = fs.createReadStream(share.filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed due to server error' });
    }
  }
});

export default router;