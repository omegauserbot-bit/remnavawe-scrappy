let scannerState = {
  isRunning: false,
  mode: 'generator',
  domain: '',
  importQueue: [],
  attempts: 0,
  okLinks: [],
  errLinks: []
};

let scraperTabId = null;
let currentProcessingUrl = null;
let isProcessingErrorPage = false; // Флаг ошибки страницы

chrome.storage.local.get(['scannerState'], (result) => {
  if (result.scannerState) {
    scannerState.okLinks = result.scannerState.okLinks || [];
    scannerState.errLinks = result.scannerState.errLinks || [];
    scannerState.attempts = result.scannerState.attempts || 0;
  }
});

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function getScraperTab() {
  if (scraperTabId) {
    try {
      await chrome.tabs.get(scraperTabId);
      return scraperTabId;
    } catch (e) {
      scraperTabId = null;
    }
  }
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
  scraperTabId = tab.id;
  return scraperTabId;
}

function saveState() {
  chrome.storage.local.set({
    scannerState: {
      okLinks: scannerState.okLinks,
      errLinks: scannerState.errLinks,
      attempts: scannerState.attempts
    }
  });
}

async function processNextUrl() {
  if (!scannerState.isRunning) return;

  let url = '';
  if (scannerState.mode === 'generator') {
    url = `https://sub.${scannerState.domain}/${generateKey()}`;
  } else if (scannerState.mode === 'import' && scannerState.importQueue.length > 0) {
    url = scannerState.importQueue.shift();
  } else {
    stopScanner();
    return;
  }

  scannerState.attempts++;
  currentProcessingUrl = url;
  isProcessingErrorPage = false;
  saveState();
  chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});

  try {
    const tabId = await getScraperTab();
    await chrome.tabs.update(tabId, { url: url });
  } catch (error) {
    console.log(`❌ ERR (навигация): ${url}`);
    scannerState.errLinks.push(url);
    saveState();
    currentProcessingUrl = null;
    setTimeout(processNextUrl, 1000);
  }
}

// Отслеживаем ошибки загрузки через onUpdated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === scraperTabId) {
    // Проверяем URL при каждом обновлении
    if (changeInfo.url || changeInfo.status) {
      const currentUrl = changeInfo.url || tab.url;
      
      // Если URL изменился на ошибку
      if (currentUrl && (currentUrl.startsWith('chrome-error://') || 
          currentUrl.includes('chrome-error') ||
          currentUrl.startsWith('chrome://neterror'))) {
        isProcessingErrorPage = true;
      }
    }
    
    if (changeInfo.status === 'complete') {
      evaluateTab(tab);
    }
  }
});

// Отслеживаем ошибки через onCommitted (более надёжно)
chrome.webNavigation?.onCommitted?.addListener((details) => {
  if (details.tabId === scraperTabId) {
    if (details.url.startsWith('chrome-error://') || 
        details.url.includes('chrome-error')) {
      isProcessingErrorPage = true;
    }
  }
});

async function evaluateTab(tab) {
  if (!scannerState.isRunning || !currentProcessingUrl) return;

  const url = currentProcessingUrl;
  const tabUrl = tab.url;

  // Проверяем флаг ошибки
  if (isProcessingErrorPage || 
      tabUrl.startsWith('chrome-error://') || 
      tabUrl.startsWith('chrome://neterror') ||
      tabUrl === 'about:blank') {
    
    console.log(`❌ ERR (error page): ${url}`);
    scannerState.errLinks.push(url);
    saveState();
    chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});
    currentProcessingUrl = null;
    isProcessingErrorPage = false;
    setTimeout(processNextUrl, 1000);
    return;
  }

  // Проверяем заголовок
  if (tab.title && (tab.title.includes('502') || tab.title.includes('Error'))) {
    console.log(`❌ ERR (title): ${url}`);
    scannerState.errLinks.push(url);
    saveState();
    chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});
    currentProcessingUrl = null;
    setTimeout(processNextUrl, 1000);
    return;
  }

  // Пробуем прочитать содержимое
  if (tabUrl === url || tabUrl.startsWith(url)) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: scraperTabId },
        func: () => {
          return {
            title: document.title,
            text: document.body.innerText,
            url: window.location.href
          };
        }
      });

      const data = results[0].result;
      
      const lowerText = data.text.toLowerCase();
      const is502 = 
        data.title.includes('502') ||
        lowerText.includes('502 bad gateway') ||
        lowerText.includes('504 gateway') ||
        lowerText.includes('cloudflare') ||
        lowerText.includes('access denied') ||
        lowerText.includes('nginx');

      if (is502) {
        scannerState.errLinks.push(data.url);
        console.log(`❌ ERR (content): ${data.url}`);
      } else {
        scannerState.okLinks.push(data.url);
        console.log(`✅ OK: ${data.url} (Len: ${data.text.length})`);
      }
      
      saveState();
      chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});
      currentProcessingUrl = null;
      
      setTimeout(() => {
        if (scannerState.isRunning) processNextUrl();
      }, 1000);

    } catch (error) {
      // ИГНОРИРУЕМ ошибку "Frame with ID 0 is showing error page"
      // Это ожидаемое поведение для страниц ошибок
      if (error.message && error.message.includes('showing error page')) {
        console.log(`❌ ERR (error frame): ${url}`);
      } else {
        console.log(`❌ ERR (script): ${url}`);
      }
      
      scannerState.errLinks.push(url);
      saveState();
      chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});
      currentProcessingUrl = null;
      setTimeout(processNextUrl, 1000);
    }
  } else {
    // Редирект
    console.log(`✅ OK (redirect): ${url}`);
    scannerState.okLinks.push(url);
    saveState();
    chrome.runtime.sendMessage({ action: 'updateUI' }).catch(() => {});
    currentProcessingUrl = null;
    setTimeout(processNextUrl, 1000);
  }
}

function startScanner(mode, domainOrQueue) {
  if (scannerState.isRunning) stopScanner();
  
  scannerState.isRunning = true;
  scannerState.mode = mode;
  
  if (mode === 'generator') {
    scannerState.domain = domainOrQueue;
  } else {
    scannerState.importQueue = domainOrQueue;
  }

  processNextUrl();
}

function stopScanner() {
  scannerState.isRunning = false;
  currentProcessingUrl = null;
  isProcessingErrorPage = false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startGenerator':
      startScanner('generator', request.domain);
      sendResponse({ success: true });
      break;
    case 'startImport':
      startScanner('import', request.urls);
      sendResponse({ success: true });
      break;
    case 'stop':
      stopScanner();
      sendResponse({ success: true });
      break;
    case 'getStatus':
      sendResponse({
        isRunning: scannerState.isRunning,
        mode: scannerState.mode,
        attempts: scannerState.attempts,
        okCount: scannerState.okLinks.length,
        errCount: scannerState.errLinks.length,
        remaining: scannerState.importQueue.length
      });
      break;
    case 'updateUI':
      sendResponse({ success: true });
      break;
    case 'clearData':
      scannerState.okLinks = [];
      scannerState.errLinks = [];
      scannerState.attempts = 0;
      saveState();
      sendResponse({ success: true });
      break;
    case 'downloadOk':
      downloadFile('output_ok.txt', scannerState.okLinks);
      sendResponse({ success: true });
      break;
    case 'downloadErr':
      downloadFile('output_err.txt', scannerState.errLinks);
      sendResponse({ success: true });
      break;
  }
  return true;
});

function downloadFile(filename, contentArray) {
  if (!contentArray || contentArray.length === 0) {
    console.warn(`Пустой файл: ${filename}`);
    return;
  }
  
  const content = contentArray.join('\n');
  const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  
  chrome.downloads.download({
    url: dataUri,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Ошибка скачивания:', chrome.runtime.lastError);
    } else {
      console.log(`✅ Файл ${filename} скачан`);
    }
  });
}