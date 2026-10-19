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

    // Initialize application on load
    window.addEventListener('DOMContentLoaded', () => {
      fetchPanicData();
      initDragAndDrop();
      initOnlineUserCounter();
      initTheme();
    });

    // Theme Toggle Functionality (Dark / Night Mode Switcher)
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

    // Switch between navigation tabs
    function switchTab(tabId) {
      // Manage button styles
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');

      // Manage visible panels
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      
      // If switching to database, reset the search input
      if (tabId === 'database-tab') {
        document.getElementById('db-search').value = '';
        filterDatabaseTable();
      }
    }

    // Live Online User Counter Simulator (100 to 1000 range)
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

    // Fetch JSON from endpoint
    async function fetchPanicData() {
      const targetUrl = 'https://bunny-wp-pullzone-nnbw2emihu.b-cdn.net/wp-content/uploads/panic_data.json';
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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

    // Normalizes strings and stores standard structure
    function processData(rawData) {
      if (!Array.isArray(rawData)) {
        console.error('Invalid JSON structure. Expecting array.');
        return;
      }

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

    // Populate the first level select options
    function populatePanicTypes() {
      const uniqueTypes = [...new Set(panicDatabase.map(item => item.panicType))]
        .filter(type => type.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      panicTypeSelect.innerHTML = '<option value="">-- Choose Type --</option>';
      
      uniqueTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        panicTypeSelect.appendChild(opt);
      });

      panicTypeSelect.addEventListener('change', handlePanicTypeChange);
      panicCodeSelect.addEventListener('change', handlePanicCodeChange);
      errorCodeSelect.addEventListener('change', handleErrorCodeChange);
    }

    // Dropdown 1: Triggered when Panic Type changes
    function handlePanicTypeChange() {
      const selectedType = panicTypeSelect.value;
      
      panicCodeSelect.innerHTML = '<option value="">-- Select Code --</option>';
      panicCodeSelect.disabled = true;
      errorCodeSelect.innerHTML = '<option value="">-- Select Error --</option>';
      errorCodeSelect.disabled = true;
      hideSolution();

      if (!selectedType) return;

      const filtered = panicDatabase.filter(item => item.panicType === selectedType);
      const uniqueCodes = [...new Set(filtered.map(item => item.panicCode))]
        .filter(code => code.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      panicCodeSelect.innerHTML = '<option value="">-- Choose Code --</option>';
      uniqueCodes.forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = code;
        panicCodeSelect.appendChild(opt);
      });
      
      panicCodeSelect.disabled = false;
    }

    // Dropdown 2: Triggered when Panic Code changes
    function handlePanicCodeChange() {
      const selectedType = panicTypeSelect.value;
      const selectedCode = panicCodeSelect.value;

      errorCodeSelect.innerHTML = '<option value="">-- Select Error --</option>';
      errorCodeSelect.disabled = true;
      hideSolution();

      if (!selectedCode) return;

      const filtered = panicDatabase.filter(item => 
        item.panicType === selectedType && 
        item.panicCode === selectedCode
      );

      const uniqueErrors = [...new Set(filtered.map(item => item.errorCode))]
        .filter(err => err.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      errorCodeSelect.innerHTML = '<option value="">-- Choose Error Code --</option>';
      uniqueErrors.forEach(err => {
        const opt = document.createElement('option');
        opt.value = err;
        opt.textContent = err;
        errorCodeSelect.appendChild(opt);
      });

      errorCodeSelect.disabled = false;
    }

    // Dropdown 3: Triggered when Error Code changes
    function handleErrorCodeChange() {
      const selectedType = panicTypeSelect.value;
      const selectedCode = panicCodeSelect.value;
      const selectedError = errorCodeSelect.value;

      if (!selectedError) {
        hideSolution();
        return;
      }

      const matches = panicDatabase.filter(item => 
        item.panicType === selectedType && 
        item.panicCode === selectedCode && 
        item.errorCode === selectedError
      );

      if (matches.length > 0) {
        const solutionTextStr = matches.map(m => m.solution).filter((v, i, a) => a.indexOf(v) === i).join(" OR ");
        showSolution(solutionTextStr);
      } else {
        hideSolution();
      }
    }

    function showSolution(text) {
      solutionText.innerHTML = `<strong>${text}</strong>`;
      solutionBox.style.display = 'block';
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
        
        setTimeout(() => {
          copyBtnSpan.textContent = 'Copy';
          copyBtnSpan.style.color = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }

    // DRAG AND DROP & FILE UPLOAD HANDLING
    function initDragAndDrop() {
      const dropZone = document.getElementById('drop-zone');

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('dragover');
        }, false);
      });

      dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
          handleUploadedFile(files[0]);
        }
      }, false);

      dropZone.addEventListener('click', () => {
        document.getElementById('file-upload-input').click();
      });
    }

    function handleFileSelect(event) {
      const files = event.target.files;
      if (files.length > 0) {
        handleUploadedFile(files[0]);
      }
    }

    function handleUploadedFile(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById('log-input').value = content;
        analyzeRawLog();
      };
      reader.readAsText(file);
    }

    // TAB 2: Analyze pasted raw log file
    function analyzeRawLog() {
      const logText = document.getElementById('log-input').value;
      const resultsWrapper = document.getElementById('parser-results-wrapper');
      const resultsContainer = document.getElementById('parser-results-container');
      
      if (!logText.trim()) {
        alert('Please paste a panic log output or drop a file to analyze.');
        return;
      }

      resultsContainer.innerHTML = '';
      resultsWrapper.style.display = 'block';

      const foundMatches = [];

      panicDatabase.forEach(entry => {
        const logLower = logText.toLowerCase();
        const errorCodeLower = entry.errorCode.toLowerCase();
        const panicCodeLower = entry.panicCode.toLowerCase();

        let isMatch = false;
        let matchReason = '';

        if (entry.errorCode && entry.errorCode.length >= 3 && logLower.includes(errorCodeLower)) {
          isMatch = true;
          matchReason = `Found matching Error Code: <strong>${entry.errorCode}</strong>`;
        }
        else if (entry.panicCode && entry.panicCode.length > 5 && logLower.includes(panicCodeLower)) {
          isMatch = true;
          matchReason = `Matched Panic Code: <strong>${entry.panicCode}</strong>`;
        }

        if (isMatch) {
          const duplicate = foundMatches.find(m => 
            m.errorCode === entry.errorCode && 
            m.panicCode === entry.panicCode && 
            m.solution === entry.solution
          );

          if (!duplicate) {
            foundMatches.push({ ...entry, matchReason });
          }
        }
      });

      if (foundMatches.length === 0) {
        resultsContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <p>⚠️ No matching panic patterns or error codes were found in the provided log text.</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">
              Try searching manually in the <strong>Browse Database</strong> tab or checking for raw hex codes like <code>0x80000</code>.
            </p>
          </div>
        `;
        return;
      }

      foundMatches.forEach(match => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        itemDiv.innerHTML = `
          <div class="result-meta">
            <span class="meta-tag">Type: <strong>${match.panicType}</strong></span>
            <span class="meta-tag">Code: <strong>${match.panicCode}</strong></span>
            <span class="meta-tag">Error: <strong>${match.errorCode}</strong></span>
          </div>
          <div style="font-size: 0.85rem; color: var(--accent-amber); margin: 0.25rem 0;">
            ${match.matchReason}
          </div>
          <div style="font-size: 1.15rem; font-weight: 700; color: #10b981; margin-top: 0.5rem;">
            <strong>${match.solution}</strong>
          </div>
        `;
        resultsContainer.appendChild(itemDiv);
      });
    }

    // TAB 3: Build database tables
    function buildDatabaseTable() {
      const tbody = document.getElementById('db-table-body');
      tbody.innerHTML = '';

      panicDatabase.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.panicType}</td>
          <td>${item.panicCode}</td>
          <td><code>${item.errorCode}</code></td>
          <td class="td-solution"><strong>${item.solution}</strong></td>
        `;
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
        if (text.includes(searchQuery)) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      updateTableRowCount(visibleCount);
    }

    function updateTableRowCount(count) {
      document.getElementById('db-row-count').textContent = `Showing ${count} of ${panicDatabase.length} entries`;
    }

    // Fallback data if CDN fetch fails
    function loadLocalFallbackData() {
      const fallbackJson = [
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X80000", "Solution": "It`s the Proximity Flex Cable" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X140000", "Solution": "It`s the Charging Port & Power Button Flex or Barometer" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X180000", "Solution": "It`s the Prox Flex & Power Button Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X20000", "Solution": "It`s a Sandwich Board Issue / Gyro" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X40000", "Solution": "It`s the Charging Port Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X60000", "Solution": "It`s the Proximity Flex Cable" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X1800", "Solution": "It`s Both . Charging Port Flex & Prox Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X4000", "Solution": "It`s part of the Battery" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X10000", "Solution": "It`s the Power Button Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X400", "Solution": "Try to Reball Interposer" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X800", "Solution": "It`s the Charging Port Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (1)", "Error Code": "0X1000", "Solution": "It`s the Proximity Flex Cable" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X1C0000", "Solution": "It`s the Charging Port & Power Button Flex & Prox Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0XC0000", "Solution": "It`s the Prox Flex & Charging Port Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X100000", "Solution": "It`s the Power Button Flex / Charging Port Flex" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X200000", "Solution": "It`s the Proximity Flex Cable" },
        { "Panic Type": "SMC PANIC - ASSERTION", "Panic Code": "Sensor array (2)", "Error Code": "0X300000", "Solution": "It`s the Proximity Flex Cable / Camera system" },
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
        { "Panic Type": "i2c", "Panic Code": "i2c3", "Error Code": "A11 X series", "Solution": "Display Power, Touch, Touch Seat" },
        { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "SCMto", "Solution": "Vibration" },
        { "Panic Type": "AOP PANIC", "Panic Code": "AOP PANIC", "Error Code": "Systick watchdog", "Solution": "Big Audio" },
        { "Panic Type": "A ", "Panic Code": "Panics starting with letter (A)", "Error Code": "AppleBCMWLAN", "Solution": "WiFi Bluetooth" }
      ];
      processData(fallbackJson);
    }
