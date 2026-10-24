// Global data array
let panicDatabase = [];

// Select elements
const panicTypeSelect = document.getElementById('panic-type-select');
const panicCodeSelect = document.getElementById('panic-code-select');
const errorCodeSelect = document.getElementById('error-code-select');
const solutionBox = document.getElementById('solution-box');
const solutionText = document.getElementById('solution-text');
const loadingState = document.getElementById('loading-state');
const errorAlert = document.getElementById('error-alert');

window.addEventListener('DOMContentLoaded', () => {
  fetchPanicData();
  initDragAndDrop();
  initOnlineUserCounter();
  initTheme();
  initPasteEventListener();
});

function initTheme() {
  const savedTheme = localStorage.getItem('mhtech_theme') || 'dark';
  const htmlEl = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');
  if (savedTheme === 'light') {
    htmlEl.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    htmlEl.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const htmlEl = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');
  if (htmlEl.classList.contains('dark')) {
    htmlEl.classList.remove('dark');
    localStorage.setItem('mhtech_theme', 'light');
    if (themeIcon) themeIcon.textContent = '☀️';
  } else {
    htmlEl.classList.add('dark');
    localStorage.setItem('mhtech_theme', 'dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const activeTab = document.getElementById(tabId);
  activeTab.classList.add('active');
  
  const elementsToAnimate = activeTab.querySelectorAll('.premium-stagger');
  elementsToAnimate.forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight; 
    el.style.animation = null; 
  });
  
  if (tabId === 'database-tab') {
    document.getElementById('db-search').value = '';
    filterDatabaseTable();
  }
}

function initOnlineUserCounter() {
  const onlineCountEl = document.getElementById('online-count');
  if (!onlineCountEl) return;
  let currentCount = Math.floor(Math.random() * (850 - 180 + 1)) + 180;
  onlineCountEl.textContent = currentCount;

  setInterval(() => {
    const fluctuation = Math.floor(Math.random() * 14) - 6;
    currentCount += fluctuation;
    if (currentCount > 1000) currentCount = 985;
    if (currentCount < 100) currentCount = 115;
    onlineCountEl.style.transform = 'scale(1.15)';
    onlineCountEl.style.color = fluctuation > 0 ? '#34d399' : '#f87171';
    onlineCountEl.textContent = currentCount;
    setTimeout(() => {
      onlineCountEl.style.transform = 'scale(1)';
      onlineCountEl.style.color = '';
    }, 400);
  }, 3500);
}

function checkDatabaseMatches(searchTerms) {
  const matches = [];
  if (!panicDatabase || panicDatabase.length === 0) return matches;
  panicDatabase.forEach(entry => {
    const dbErr = entry.errorCode.toUpperCase().trim();
    if (!dbErr) return;
    for (let term of searchTerms) {
      if (!term) continue;
      const cleanTerm = term.toUpperCase().trim();
      if (!cleanTerm || cleanTerm.length < 2) continue;
      const strip0xTerm = cleanTerm.replace(/^0X/, '');
      const strip0xDb = dbErr.replace(/^0X/, '');
      if (dbErr === cleanTerm || strip0xDb === strip0xTerm || dbErr.includes(cleanTerm) || dbErr.includes(strip0xTerm)) {
        const exists = matches.some(m => m.panicType === entry.panicType && m.panicCode === entry.panicCode && m.errorCode === entry.errorCode && m.solution === entry.solution);
        if (!exists) { matches.push(entry); }
        break;
      }
    }
  });
  return matches;
}

function renderConverterSummary(decDisplay, hexDisplay, termsToSearch) {
  const summaryText = document.getElementById('converter-summary-text');
  const matches = checkDatabaseMatches(termsToSearch);
  let html = `<div style="margin-bottom: 0.75rem;">Decimal: <strong>${decDisplay}</strong> &harr; Hexadecimal Pair: <strong style="color: var(--accent-emerald);">${hexDisplay}</strong></div>`;
  if (matches.length > 0) {
    html += `<div style="margin-top: 1rem; border-top: 1px dashed var(--card-border); padding-top: 0.85rem;">`;
    html += `<div style="font-size: 0.85rem; color: var(--accent-amber); font-weight: 700; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">🔍 Diagnosed Database Matches (${matches.length}):</div>`;
    matches.forEach(m => {
      html += `
        <div class="result-item animate-fade-in-up" style="margin-bottom: 0.6rem; background: rgba(255,255,255,0.03); padding: 0.85rem; border-radius: 10px;">
          <div class="result-meta">
            <span class="meta-tag">Type: <strong>${m.panicType}</strong></span>
            <span class="meta-tag">Code: <strong>${m.panicCode}</strong></span>
            <span class="meta-tag">Error Code: <strong>${m.errorCode}</strong></span>
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: #10b981; margin-top: 0.4rem;">🛠️ ${m.solution}</div>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">ℹ️ No direct hardware solution match found in database for code "${hexDisplay}".</div>`;
  }
  summaryText.innerHTML = html;
}

function convertFromDecimal() {
  const decVal = document.getElementById('dec-input').value.trim();
  const hexInput = document.getElementById('hex-input');
  const summaryText = document.getElementById('converter-summary-text');
  if (decVal === '') {
    hexInput.value = '';
    summaryText.textContent = 'Enter a value in either field above to convert and search database instantly.';
    return;
  }
  const parts = decVal.split(/[\s,]+/);
  const hexResults = [];
  const termsToSearch = [];
  for (let part of parts) {
    if (!part) continue;
    const num = parseInt(part, 10);
    if (isNaN(num)) {
      summaryText.innerHTML = `<span style="color: #f87171;">⚠️ Invalid Decimal number: "${part}"</span>`;
      return;
    }
    const hexStr = '0x' + num.toString(16).toUpperCase();
    hexResults.push(hexStr);
    termsToSearch.push(hexStr, num.toString(16).toUpperCase(), '0X' + num.toString(16).toUpperCase());
  }
  const finalHex = hexResults.join(' ');
  hexInput.value = finalHex;
  renderConverterSummary(decVal, finalHex, termsToSearch);
}

function convertFromHex() {
  let hexVal = document.getElementById('hex-input').value.trim();
  const decInput = document.getElementById('dec-input');
  const summaryText = document.getElementById('converter-summary-text');
  if (hexVal === '') {
    decInput.value = '';
    summaryText.textContent = 'Enter a value in either field above to convert and search database instantly.';
    return;
  }
  const parts = hexVal.split(/[\s,]+/);
  const decResults = [];
  const formattedHexParts = [];
  const termsToSearch = [];
  for (let part of parts) {
    if (!part) continue;
    let cleanHex = part.replace(/^0x/i, '');
    const num = parseInt(cleanHex, 16);
    termsToSearch.push(part, cleanHex, '0X' + cleanHex);
    if (isNaN(num)) {
      decResults.push(part);
      formattedHexParts.push(part);
    } else {
      decResults.push(num);
      formattedHexParts.push(part.startsWith('0x') || part.startsWith('0X') ? part : '0x' + part);
    }
  }
  const finalDec = decResults.join(', ');
  const finalHexDisplay = formattedHexParts.join(' ');
  decInput.value = finalDec;
  renderConverterSummary(finalDec, finalHexDisplay, termsToSearch);
}

async function fetchPanicData() {
  const targetUrl = 'https://bunny-wp-pullzone-nnbw2emihu.b-cdn.net/wp-content/uploads/panic_data.json';
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const rawData = await response.json();
    processData(rawData);
  } catch (err) {
    console.warn('Unable to fetch remote panic log database, loading local fallback data.', err);
    errorAlert.style.display = 'block';
    document.getElementById('error-message').textContent = `Could not fetch database from CDN: ${err.message}. Loading local database instead.`;
    loadLocalFallbackData();
  } finally {
    loadingState.style.display = 'none';
    panicTypeSelect.disabled = false;
  }
}

function processData(rawData) {
  if (!Array.isArray(rawData)) return;
  panicDatabase = rawData.map(item => {
    return {
      panicType: (item["Panic Type"] || item["panicType"] || "").trim(),
      panicCode: (item["Panic Code"] || item["panicCode"] || "").trim(),
      errorCode: (item["Error Code"] || item["errorCode"] || "").trim(),
      solution: (item["Solution"] || item["solution"] || "").trim()
    };
  });
  populatePanicTypes();
  buildDatabaseTable();
}

function populatePanicTypes() {
  const uniqueTypes = [...new Set(panicDatabase.map(item => item.panicType))].filter(type => type.length > 0).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  panicTypeSelect.innerHTML = '<option value="">-- Choose Type --</option>';
  uniqueTypes.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type; opt.textContent = type;
    panicTypeSelect.appendChild(opt);
  });
  panicTypeSelect.addEventListener('change', handlePanicTypeChange);
  panicCodeSelect.addEventListener('change', handlePanicCodeChange);
  errorCodeSelect.addEventListener('change', handleErrorCodeChange);
}

function handlePanicTypeChange() {
  const selectedType = panicTypeSelect.value;
  panicCodeSelect.innerHTML = '<option value="">-- Select Code --</option>';
  panicCodeSelect.disabled = true;
  errorCodeSelect.innerHTML = '<option value="">-- Select Error --</option>';
  errorCodeSelect.disabled = true;
  hideSolution();
  if (!selectedType) return;
  const filtered = panicDatabase.filter(item => item.panicType === selectedType);
  const uniqueCodes = [...new Set(filtered.map(item => item.panicCode))].filter(code => code.length > 0).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  panicCodeSelect.innerHTML = '<option value="">-- Choose Code --</option>';
  uniqueCodes.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code; opt.textContent = code;
    panicCodeSelect.appendChild(opt);
  });
  panicCodeSelect.disabled = false;
}

function handlePanicCodeChange() {
  const selectedType = panicTypeSelect.value;
  const selectedCode = panicCodeSelect.value;
  errorCodeSelect.innerHTML = '<option value="">-- Select Error --</option>';
  errorCodeSelect.disabled = true;
  hideSolution();
  if (!selectedCode) return;
  const filtered = panicDatabase.filter(item => item.panicType === selectedType && item.panicCode === selectedCode);
  const uniqueErrors = [...new Set(filtered.map(item => item.errorCode))].filter(err => err.length > 0).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  errorCodeSelect.innerHTML = '<option value="">-- Choose Error Code --</option>';
  uniqueErrors.forEach(err => {
    const opt = document.createElement('option');
    opt.value = err; opt.textContent = err;
    errorCodeSelect.appendChild(opt);
  });
  errorCodeSelect.disabled = false;
}

function handleErrorCodeChange() {
  const selectedType = panicTypeSelect.value;
  const selectedCode = panicCodeSelect.value;
  const selectedError = errorCodeSelect.value;
  if (!selectedError) { hideSolution(); return; }
  const matches = panicDatabase.filter(item => item.panicType === selectedType && item.panicCode === selectedCode && item.errorCode === selectedError);
  if (matches.length > 0) {
    const solutionTextStr = matches.map(m => m.solution).filter((v, i, a) => a.indexOf(v) === i).join(" OR ");
    showSolution(solutionTextStr);
  } else { hideSolution(); }
}

function showSolution(text) {
  solutionText.innerHTML = `<strong>${text}</strong>`;
  solutionBox.style.display = 'block';
  solutionBox.classList.add('premium-pulse');
  setTimeout(() => solutionBox.classList.remove('premium-pulse'), 1000);
}

function hideSolution() {
  solutionBox.style.display = 'none';
  solutionText.innerHTML = 'Select all dropdown fields to view the solution.';
}

function resetDropdowns() {
  panicTypeSelect.value = '';
  panicCodeSelect.innerHTML = '<option value="">-- Select Type First --</option>';
  panicCodeSelect.disabled = true;
  errorCodeSelect.innerHTML = '<option value="">-- Select Code First --</option>';
  errorCodeSelect.disabled = true;
  hideSolution();
}

function copySolution() {
  const textToCopy = solutionText.innerText;
  if (!textToCopy || textToCopy.includes('Select all dropdown')) return;
  navigator.clipboard.writeText(textToCopy).then(() => {
    const copyBtnSpan = document.querySelector('#copy-btn span');
    copyBtnSpan.textContent = 'Copied!';
    copyBtnSpan.style.color = '#10b981';
    setTimeout(() => { copyBtnSpan.textContent = 'Copy'; copyBtnSpan.style.color = ''; }, 2000);
  });
}

function initDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); }, false); });
  ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); }, false); });
  dropZone.addEventListener('drop', (e) => { const dt = e.dataTransfer; if (dt.files.length > 0) { handleUploadedFile(dt.files[0]); } }, false);
  dropZone.addEventListener('click', () => { document.getElementById('file-upload-input').click(); });
}

function initPasteEventListener() {
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        switchTab('parser-tab');
        handleUploadedFile(item.getAsFile());
        break;
      }
    }
  });
}

function handleFileSelect(event) { if (event.target.files.length > 0) { handleUploadedFile(event.target.files[0]); } }

function handleUploadedFile(file) {
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name || '')) {
    processImageOCR(file);
  } else {
    const reader = new FileReader();
    reader.onload = function(e) { document.getElementById('log-input').value = e.target.result; analyzeRawLog(); };
    reader.readAsText(file);
  }
}

function preprocessImageForOCR(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = 2.5;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imgData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        let contrast = 1.5;
        let contrastVal = (gray - 128) * contrast + 128;
        let finalColor = contrastVal > 145 ? 255 : 0; 
        data[i] = data[i+1] = data[i+2] = finalColor; 
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

function postProcessOCRText(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/\bO\s*x/ig, '0x'); 
  cleaned = cleaned.replace(/\b0\s*X/ig, '0x');
  cleaned = cleaned.replace(/(0x[a-fA-F0-9]*)[oO]([a-fA-F0-9]*)/ig, (match) => {
    return match.replace(/[oO]/g, '0');
  });
  return cleaned;
}

async function processImageOCR(imageFile) {
  const ocrStatusBox = document.getElementById('ocr-status-box');
  const ocrStatusText = document.getElementById('ocr-status-text');
  const logInput = document.getElementById('log-input');
  
  ocrStatusBox.style.display = 'flex';
  ocrStatusText.innerHTML = '<strong>Advanced AI Analysis:</strong> Preparing & Enhancing Photo...';
  
  try {
    if (typeof Tesseract === 'undefined') throw new Error('OCR Library not loaded yet.');
    
    const processedImageUrl = await preprocessImageForOCR(imageFile);
    ocrStatusText.innerHTML = '<strong>Advanced AI Analysis:</strong> Initializing OCR Engine...';
    
    const result = await Tesseract.recognize(processedImageUrl, 'eng', {
      logger: m => { 
        if (m.status === 'recognizing text') {
          ocrStatusText.innerHTML = `<strong>Advanced AI Scanning:</strong> ${Math.round(m.progress * 100)}% completed`; 
        } else {
          const statusCap = m.status.charAt(0).toUpperCase() + m.status.slice(1);
          ocrStatusText.innerHTML = `<strong>AI Engine:</strong> ${statusCap}...`;
        }
      }
    });
    
    if (result.data.text && result.data.text.trim().length > 0) {
      const finalText = postProcessOCRText(result.data.text);
      logInput.value = finalText;
      ocrStatusText.innerHTML = '✅ <strong>Advanced AI Analysis Completed!</strong>';
      setTimeout(() => { ocrStatusBox.style.display = 'none'; }, 2500);
      analyzeRawLog();
    } else { throw new Error('Could not read clear text from the photo. Try a clearer image.'); }
  } catch (err) {
    ocrStatusText.innerHTML = `⚠️ <strong>AI Analysis Error:</strong> ${err.message || 'Could not extract text.'}`;
    setTimeout(() => { ocrStatusBox.style.display = 'none'; }, 5000);
  }
}

const appleHardwareMap = {
  "iPhone11,2": "iPhone XS", "iPhone11,4": "iPhone XS Max", "iPhone11,6": "iPhone XS Max", "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11", "iPhone12,3": "iPhone 11 Pro", "iPhone12,5": "iPhone 11 Pro Max", "iPhone12,8": "iPhone SE (2nd Gen)",
  "iPhone13,1": "iPhone 12 mini", "iPhone13,2": "iPhone 12", "iPhone13,3": "iPhone 12 Pro", "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,2": "iPhone 13 Pro", "iPhone14,3": "iPhone 13 Pro Max", "iPhone14,4": "iPhone 13 mini", "iPhone14,5": "iPhone 13", "iPhone14,6": "iPhone SE (3rd Gen)",
  "iPhone14,7": "iPhone 14", "iPhone14,8": "iPhone 14 Plus", "iPhone15,2": "iPhone 14 Pro", "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15", "iPhone15,5": "iPhone 15 Plus", "iPhone16,1": "iPhone 15 Pro", "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,1": "iPhone 16 Pro", "iPhone17,2": "iPhone 16 Pro Max", "iPhone17,3": "iPhone 16", "iPhone17,4": "iPhone 16 Plus"
};

function extractDeviceAndOS(text) {
  const modelMatch = text.match(/(?:Hardware Model|Model|Machine-model|product)\s*[:=]\s*"?([a-zA-Z0-9,\.°]+)/i);
  let model = 'Unknown';
  if (modelMatch) {
    let rawModel = modelMatch[1].replace(/[\"°]/g, '').trim(); 
    if (appleHardwareMap[rawModel]) { model = appleHardwareMap[rawModel]; } else { model = rawModel; }
  }

  const osMatch = text.match(/(?:OS Version|OS-version|OSVersion|0s_version|os version)\s*[:=]+\s*"?([^\n\r"]+)/i);
  let os = 'Unknown';
  if (osMatch) {
    let rawOS = osMatch[1].trim();
    rawOS = rawOS.replace(/iPhone OS\s*/i, 'iOS ');
    if (/^[\d\.]+$/.test(rawOS)) { rawOS = 'iOS ' + rawOS; }
    os = rawOS;
  }
  return { model, os };
}

function analyzeRawLog() {
  const logText = document.getElementById('log-input').value;
  const resultsWrapper = document.getElementById('parser-results-wrapper');
  const resultsContainer = document.getElementById('parser-results-container');
  const deviceInfoBox = document.getElementById('device-info-highlight');
  const highlightModel = document.getElementById('highlight-model');
  const highlightIOS = document.getElementById('highlight-ios');
  
  if (!logText.trim()) {
    alert('Please paste panic log output, or drop a text file / photo to analyze.');
    return;
  }

  const devInfo = extractDeviceAndOS(logText);
  if (devInfo.model !== 'Unknown' || devInfo.os !== 'Unknown') {
    highlightModel.textContent = devInfo.model;
    highlightIOS.textContent = devInfo.os;
    deviceInfoBox.style.display = 'flex';
    deviceInfoBox.classList.add('animate-fade-in-up');
  } else {
    deviceInfoBox.style.display = 'none';
  }

  resultsContainer.innerHTML = '';
  resultsWrapper.style.display = 'block';
  const foundMatches = [];

  // =========================================================================
  // NEW FUNCTION: ADVANCED DICTIONARY PATTERN MATCHING (Highly Accurate)
  // =========================================================================
  const advancedDictionary = {
      "smc bsc failure": "Battery Data Line or Charging Port Flex",
      "t80t sbau": "Battery Data Line (T80T SBAU) error - Check Battery or Flex",
      "t80t": "Battery Data Line error - Check Battery",
      "tg0b": "Battery Thermal Sensor missing",
      "mic1": "Power Button Flex (Mic 1)",
      "prs0": "Charging Port or Barometer",
      "als": "Proximity Sensor / Earpiece Flex",
      "aop panic": "Charging IC / Audio IC issue",
      "i2c0": "Display or Screen issue",
      "i2c2": "Rear Camera issue"
  };

  const logLower = logText.toLowerCase();

  for (let code in advancedDictionary) {
      if (logLower.includes(code)) {
          const isDuplicate = foundMatches.some(m => m.errorCode === code.toUpperCase());
          if (!isDuplicate) {
              foundMatches.push({
                  panicType: "AI Pattern Match",
                  panicCode: "Known Component",
                  errorCode: code.toUpperCase(),
                  solution: advancedDictionary[code],
                  matchReason: `Direct text match: <strong>${code.toUpperCase()}</strong>`
              });
          }
      }
  }
  // =========================================================================
  // END ADVANCED DICTIONARY MATCHING
  // =========================================================================

  panicDatabase.forEach(entry => {
    const errorCodeLower = entry.errorCode.toLowerCase();
    const panicCodeLower = entry.panicCode.toLowerCase();
    let isMatch = false; let matchReason = '';

    if (entry.errorCode && entry.errorCode.length >= 3 && logLower.includes(errorCodeLower)) {
      isMatch = true; matchReason = `Found matching Error Code: <strong>${entry.errorCode}</strong>`;
    } else if (entry.panicCode && entry.panicCode.length > 5 && logLower.includes(panicCodeLower)) {
      isMatch = true; matchReason = `Matched Panic Code: <strong>${entry.panicCode}</strong>`;
    }
    
    if (isMatch) {
      const duplicate = foundMatches.find(m => m.errorCode === entry.errorCode && m.panicCode === entry.panicCode && m.solution === entry.solution);
      if (!duplicate) { foundMatches.push({ ...entry, matchReason }); }
    }
  });

  if (foundMatches.length === 0) {
    resultsContainer.innerHTML = `
      <div class="animate-fade-in-up" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <p>⚠️ No matching panic patterns or error codes were found in the provided log text.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">
          Try searching manually in the <strong>Browse Database</strong> tab or checking for raw hex codes like <code>0x80000</code>.
        </p>
      </div>`;
    return;
  }

  foundMatches.forEach((match, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'result-item animate-fade-in-up';
    itemDiv.style.animationDelay = `${index * 0.15}s`;
    itemDiv.innerHTML = `
      <div class="result-meta">
        <span class="meta-tag">Type: <strong>${match.panicType}</strong></span>
        <span class="meta-tag">Code: <strong>${match.panicCode}</strong></span>
        <span class="meta-tag">Error: <strong>${match.errorCode}</strong></span>
      </div>
      <div style="font-size: 0.85rem; color: var(--accent-amber); margin: 0.25rem 0;">${match.matchReason}</div>
      <div style="font-size: 1.15rem; font-weight: 700; color: #10b981; margin-top: 0.5rem;"><strong>${match.solution}</strong></div>
    `;
    resultsContainer.appendChild(itemDiv);
  });
}

function buildDatabaseTable() {
  const tbody = document.getElementById('db-table-body');
  tbody.innerHTML = '';
  panicDatabase.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.panicType}</td><td>${item.panicCode}</td><td><code>${item.errorCode}</code></td><td class="td-solution"><strong>${item.solution}</strong></td>`;
    tbody.appendChild(tr);
  });
  updateTableRowCount(panicDatabase.length);
}

function filterDatabaseTable() {
  const searchQuery = document.getElementById('db-search').value.toLowerCase().trim();
  const rows = document.querySelectorAll('#db-table-body tr');
  let visibleCount = 0;
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(searchQuery)) { row.style.display = ''; visibleCount++; } else { row.style.display = 'none'; }
  });
  updateTableRowCount(visibleCount);
}

function updateTableRowCount(count) { document.getElementById('db-row-count').textContent = `Showing ${count} of ${panicDatabase.length} entries`; }

function loadLocalFallbackData() {
  const fallbackJson = [
    // NEW: SMC BSC AND T80T SBAU ADDED TO FALLBACK DATA
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "SMC BSC failure", "Error Code": "T80T SBAU", "Solution": "Battery Data Line or Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "SMC BSC failure", "Error Code": "SMC BSC", "Solution": "Battery or Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X80000", "Solution": "It\`s the Proximity Flex Cable" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X140000", "Solution": "It\`s the Charging Port & Power Button Flex or Barometer" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X180000", "Solution": "It\`s the Prox Flex & Power Button Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X20000", "Solution": "It\`s a Sandwich Board Issue / Gyro" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X40000", "Solution": "It\`s the Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X60000", "Solution": "It\`s the Proximity Flex Cable" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X1800", "Solution": "It\`s Both . Charging Port Flex & Prox Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X4000", "Solution": "It\`s part of the Battery" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X10000", "Solution": "It\`s the Power Button Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X400", "Solution": "Try to Reball Interposer" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X800", "Solution": "It\`s the Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X1000", "Solution": "It\`s the Proximity Flex Cable" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X1C0000", "Solution": "It\`s the Charging Port & Power Button Flex & Prox Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0XC0000", "Solution": "It\`s the Prox Flex & Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X100000", "Solution": "It\`s the Power Button Flex / Charging Port Flex" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X200000", "Solution": "It\`s the Proximity Flex Cable" },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X300000", "Solution": "It\`s the Proximity Flex Cable / Camera system" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TT1P TT2P", "Solution": "Screen" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TG0B", "Solution": "Battery No Data" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TP3R", "Solution": "NTC Problem" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TP1A", "Solution": "Battery Failure" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TP2A TP3R TP4H", "Solution": "Battery/Screen" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TG0V TTSA", "Solution": "Charging Port Flex" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "Prs0", "Solution": "Charging Port Flex / U7400" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "MIC1", "Solution": "Charging Port Flex" },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "MIC2", "Solution": "Power Key Flex" },
    { "Panic Type": "i2c", "Panic Code": "i2c0", "Error Code": "A11 series", "Solution": "U2700 U5600 U5660 U6110 J6400" },
    { "Panic Type": "i2c", "Panic Code": "i2c1", "Error Code": "A11 Series.", "Solution": "J4300 J6400" },
    { "Panic Type": "i2c", "Panic Code": "i2c2", "Error Code": "A11", "Solution": "U3301 J4200 U5000" },
    { "Panic Type": "i2c", "Panic Code": "i2c3", "Error Code": "A11 X series", "Solution": "Display Power, Touch, Touch Seat, etc." },
    { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "SCMto", "Solution": "Vibration" },
    { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "Systick watchdog", "Solution": "Big Audio" },
    { "Panic Type": "A ", "Panic Code": "Panics starting with letter (A)", "Error Code": "AppleBCMWLAN", "Solution": "WiFi Bluetooth" },
    { "Panic Type": "NVMe / Storage", "Panic Code": "ANS2", "Error Code": "AppleANS", "Solution": "NAND Storage issue. Check NAND power lines, reball or replace NAND." },
    { "Panic Type": "NVMe / Storage", "Panic Code": "PCIe Timeout", "Error Code": "ApplePCIe", "Solution": "NAND, Wi-Fi or Baseband connection issue. Check PCIe lines." },
    { "Panic Type": "Baseband", "Panic Code": "AppleBaseband", "Error Code": "Baseband", "Solution": "Baseband CPU or PMU failure. Check BB lines." },
    { "Panic Type": "Watchdog Timeout", "Panic Code": "thermalmonitord", "Error Code": "Missing Sensor", "Solution": "Check Charging Port Flex, Power Button Flex, or Battery data lines." },
    { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "no-pulse", "Solution": "Barometer, Gyroscope, or ALS sensor failure." },
    { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "LPP", "Solution": "Low Power Partition issue - Check Audio IC or Tristar/Hydra." },
    { "Panic Type": "Kernel Panic", "Panic Code": "WDT timeout", "Error Code": "WDT", "Solution": "Watchdog timeout. CPU, Battery SWI line, or Software issue." },
    { "Panic Type": "Kernel Panic", "Panic Code": "Sleep/Wake", "Error Code": "Sleep/Wake hang", "Solution": "Tristar / Tigris / Hydra USB charging IC." },
    { "Panic Type": "Kernel Panic", "Panic Code": "AppleCS42L", "Error Code": "Audio IC", "Solution": "Audio Codec IC issue. Reball or replace Audio IC." },
    { "Panic Type": "i2c", "Panic Code": "i2c0", "Error Code": "General", "Solution": "Display PMU (Chestnut), Backlight IC, or Display connector." },
    { "Panic Type": "i2c", "Panic Code": "i2c1", "Error Code": "General", "Solution": "Touch IC, ALS, Proximity, Front/Rear Cameras." },
    { "Panic Type": "i2c", "Panic Code": "i2c2", "Error Code": "General", "Solution": "Audio IC, Speaker Amp, Tristar/Hydra, Taptic Engine." },
    { "Panic Type": "i2c", "Panic Code": "i2c3", "Error Code": "General", "Solution": "Baseband, NFC, EEPROM." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TG0V", "Solution": "Battery / Charging port temperature sensor data missing." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TG1B", "Solution": "Battery connection or Battery data failure." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TG1v", "Solution": "Charging Port Flex / Battery issue." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TP0D", "Solution": "Back Glass Flex / Wireless Charging Coil issue." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "TP7R", "Solution": "Screen / Display Flex sensor missing." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "VD0C", "Solution": "Charging port flex issue (common on iPhone 12/13 series)." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "NFC", "Solution": "NFC antenna or IC issue." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "ALS", "Solution": "Ambient Light Sensor / Earpiece flex cable." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "MIC3", "Solution": "Screen / Earpiece Flex microphone failure." },
    { "Panic Type": "Userspace watchdog timeout", "Panic Code": "Userspace watchdog timeout", "Error Code": "MIC4", "Solution": "Rear Camera / Flash mic failure." },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0x2000000", "Solution": "Battery communication line (SWI)." },
    { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0x4000000", "Solution": "Charging Port Flex / Tigris IC." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "Gas Gauge", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "TG0V", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "TB0V", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "TG0B", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "0x4000", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "0x500000", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." },
    { "Panic Type": "Battery / Communication", "Panic Code": "Battery Issue", "Error Code": "0xa1", "Solution": "• Try a known-good original battery. <br>• Check battery connector on board. <br>• If a battery tag-on flex is used, check its soldering." }
  ];
  processData(fallbackJson);
}
