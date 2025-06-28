import Share from '../models/Share.js';

/**
 * Generate a unique 6-character alphanumeric code
 * @returns {string} Generated code
 */
export const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a unique code that doesn't exist in the database
 * @param {number} maxAttempts Maximum number of attempts to generate unique code
 * @returns {Promise<string>} Unique code
 */
export const generateUniqueCode = async (maxAttempts = 10) => {
  let attempts = 0;
  let code;

  do {
    code = generateCode();
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique code after multiple attempts');
    }
    
    const existingShare = await Share.findByCode(code);
    if (!existingShare) {
      return code;
    }
  } while (attempts <= maxAttempts);

  throw new Error('Failed to generate unique code');
};