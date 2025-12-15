// Only use Node.js modules in server-side environment
let fs, path, LOG_PATH;
if (typeof window === 'undefined' && typeof require !== 'undefined') {
  try {
    fs = require('fs');
    path = require('path');
    LOG_PATH = path.join(__dirname, '../../.cursor/debug.log');
  } catch (error) {
    // Node modules not available
  }
}

function writeLog(data) {
  // Only write to file in server-side environment
  if (typeof window !== 'undefined' || !fs) {
    return;
  }
  try {
    const logLine = JSON.stringify(data) + '\n';
    fs.appendFileSync(LOG_PATH, logLine, 'utf8');
  } catch (error) {
    // Silently fail if we can't write logs
  }
}

function logDebug(location, message, data, hypothesisId) {
  const logData = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId
  };
  
  // Try fetch first (for client-side), fallback to file write (for server-side)
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/92723b57-559c-471f-a88e-e1218b2e558e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(() => {
      // Fallback to file write if fetch fails
      writeLog(logData);
    });
  } else {
    // Server-side: use file write
    writeLog(logData);
  }
}

module.exports = { logDebug };

