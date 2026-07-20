const AdmZip = require('adm-zip');
const path = require('path');

// List of directories and file types to completely ignore
const IGNORED_DIRS = ['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'out', '__pycache__', 'venv'];
const IGNORED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.mp4', '.mp3', '.pdf', '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot', '.exe', '.dll', '.so', '.dylib', '.pyc'];

/**
 * Checks if a file path should be ignored.
 */
const shouldIgnore = (filePath) => {
  const parts = filePath.split('/');
  for (const dir of IGNORED_DIRS) {
    if (parts.includes(dir)) return true;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORED_EXTS.includes(ext)) return true;
  
  return false;
};

/**
 * Extracts a ZIP buffer, filters the files, and concatenates them into a single string.
 * @param {Buffer} zipBuffer - The raw buffer of the ZIP file
 * @returns {string} - The concatenated project code
 */
const extractAndConcatenate = (zipBuffer) => {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  
  let combinedCode = '';
  let fileCount = 0;

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    
    // Normalize path separators to forward slash
    const entryName = entry.entryName.replace(/\\/g, '/');
    
    if (shouldIgnore(entryName)) continue;
    
    const content = entry.getData().toString('utf8');
    
    // Skip likely binary files that didn't match the extension list (by checking for null bytes)
    if (content.includes('\x00')) continue;
    
    combinedCode += `\n\n// --- File: ${entryName} ---\n\n`;
    combinedCode += content;
    fileCount++;
    
    // Safety limit: To prevent massive projects from crashing the prompt context
    if (fileCount >= 200) {
      combinedCode += `\n\n// --- (Truncated: Project exceeds maximum file limit) ---\n`;
      break;
    }
  }

  if (fileCount === 0) {
    throw new Error('No valid source files found in the project.');
  }

  return combinedCode;
};

module.exports = { extractAndConcatenate };
