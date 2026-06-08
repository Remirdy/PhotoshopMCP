/**
 * UXP Plugin — errorCatcher.js
 * Captures uncaught errors and displays them inside the panel DOM.
 */
window.onerror = function(message, source, lineno, colno, error) {
  const jobLog = document.getElementById("job-log");
  if (jobLog) {
    const entry = document.createElement("div");
    entry.style.color = "#ff5555";
    entry.style.padding = "8px";
    entry.style.borderBottom = "1px solid #333";
    entry.style.fontSize = "12px";
    entry.style.fontFamily = "monospace";
    const file = source ? source.substring(source.lastIndexOf("/") + 1) : "unknown";
    entry.textContent = "Error: " + message + " (" + file + ":" + lineno + ")";
    jobLog.appendChild(entry);
  }
};
