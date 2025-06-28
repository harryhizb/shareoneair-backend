import express from 'express';
import fs from 'fs';
import Share from '../models/Share.js';
import { generateUniqueCode } from '../utils/codeGenerator.js';
import { upload } from '../middleware/fileUpload.js';

const router = express.Router();

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { type, content } = req.body;

    if (!type || !['text', 'file'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid or missing type. Must be "text" or "file"' 
      });
    }

    // Generate unique code
    const code = await generateUniqueCode();

    if (type === 'text') {
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Text content is required and cannot be empty' 
        });
      }

      const newShare = new Share({
        code,
        type: 'text',
        content: content.trim()
      });

      await newShare.save();
      
      res.json({ 
        success: true, 
        code, 
        type: 'text',
        message: 'Text content uploaded successfully'
      });

    } else if (type === 'file') {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'File is required for file upload' 
        });
      }

      // Validate file exists
      if (!fs.existsSync(req.file.path)) {
        return res.status(500).json({ 
          error: 'File upload failed - file not saved' 
        });
      }

      const newShare = new Share({
        code,
        type: 'file',
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });

      await newShare.save();
      
      res.json({ 
        success: true, 
        code, 
        type: 'file',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: 'File uploaded successfully'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error cleaning up file after error:', err);
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error (shouldn't happen with our unique code generation)
      return res.status(500).json({ error: 'Code generation conflict, please try again' });
    }
    
    res.status(500).json({ error: 'Upload failed due to server error' });
  }
});

export default router;