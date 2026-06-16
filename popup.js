document.addEventListener('DOMContentLoaded', () => {
  // Элементы DOM
  const domainInput = document.getElementById('domain');
  const fileInput = document.getElementById('fileInput');
  
  const startGenBtn = document.getElementById('startGenBtn');
  const startImportBtn = document.getElementById('startImportBtn');
  const stopBtn = document.getElementById('stopBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  const downloadOkBtn = document.getElementById('downloadOkBtn');
  const downloadErrBtn = document.getElementById('downloadErrBtn');

  const attemptsCount = document.getElementById('attemptsCount');
  const okCount = document.getElementById('okCount');
  const errCount = document.getElementById('errCount');
  const statusText = document.getElementById('statusText');

  let importedUrls = [];

  // 1. Загрузка последнего использованного домена
  chrome.storage.sync.get(['lastDomain'], (result) => {
    if (result.lastDomain) {
      domainInput.value = result.lastDomain;
    }
  });

  // 2. Обработка выбора файла для импорта
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Разбиваем по строкам, убираем пробелы и оставляем только валидные URL
      importedUrls = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.startsWith('http'));
      
      // Активируем кнопку и показываем количество ссылок
      startImportBtn.disabled = importedUrls.length === 0;
      startImportBtn.textContent = `▶ Проверить файл (${importedUrls.length} ссылок)`;
    };
    reader.readAsText(file);
  });

  // 3. Функция обновления интерфейса
  function updateUI(status) {
    attemptsCount.textContent = status.attempts;
    okCount.textContent = status.okCount;
    errCount.textContent = status.errCount;
    
    if (status.isRunning) {
      if (status.mode === 'generator') {
        statusText.textContent = `🟢 Сканирование (фоновая вкладка)...`;
      } else {
        statusText.textContent = `🟢 Импорт: осталось проверить ${status.remaining}`;
      }
      statusText.style.color = '#27ae60';
      
      // Блокируем кнопки запуска во время работы
      startGenBtn.disabled = true;
      startImportBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      statusText.textContent = '🔴 Остановлен';
      statusText.style.color = '#e74c3c';
      
      // Разблокируем кнопки
      startGenBtn.disabled = false;
      startImportBtn.disabled = importedUrls.length === 0;
      stopBtn.disabled = true;
    }
  }

  // 4. Запрос текущего статуса у background.js
  function refreshStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response) {
        updateUI(response);
      }
    });
  }

  // 5. Слушаем обновления от background.js в реальном времени
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateUI') {
      refreshStatus();
    }
  });

  // 6. Обработчики кнопок
  startGenBtn.addEventListener('click', () => {
    const domain = domainInput.value.trim();
    if (!domain) return alert('Пожалуйста, введите домен!');
    
    chrome.storage.sync.set({ lastDomain: domain });
    chrome.runtime.sendMessage({ action: 'startGenerator', domain: domain }, refreshStatus);
  });

  startImportBtn.addEventListener('click', () => {
    if (importedUrls.length === 0) return;
    chrome.runtime.sendMessage({ action: 'startImport', urls: importedUrls }, refreshStatus);
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' }, refreshStatus);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Вы уверены? Это очистит всю статистику и списки найденных ссылок.')) {
      chrome.runtime.sendMessage({ action: 'clearData' }, refreshStatus);
    }
  });

  downloadOkBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'downloadOk' });
  });

  downloadErrBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'downloadErr' });
  });

  // 7. Инициализация и фоновое обновление (на случай если сообщение потерялось)
  refreshStatus();
  setInterval(refreshStatus, 1000);
});
