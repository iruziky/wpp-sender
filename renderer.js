const { ipcRenderer } = require('electron');

const btnSelectFile = document.getElementById('btnSelectFile');
const btnConnect = document.getElementById('btnConnect');
const btnSend = document.getElementById('btnSend');
const csvFileInput = document.getElementById('csvFile');
const fileNameDiv = document.getElementById('file-name');
const logDiv = document.getElementById('log');
const qrImg = document.getElementById('qr-img');
const qrContainer = document.getElementById('qr-container');

let selectedFilePath = null;

// Selecionar arquivo CSV
btnSelectFile.addEventListener('click', () => {
    csvFileInput.click();
});

csvFileInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
        selectedFilePath = event.target.files[0].path;
        fileNameDiv.textContent = `Arquivo selecionado: ${event.target.files[0].name}`;
        btnConnect.disabled = false;
        btnSend.disabled = true;
    }
});

// Conectar ao WhatsApp (iniciar sessão)
btnConnect.addEventListener('click', () => {
    if (!selectedFilePath) {
        alert('Selecione um arquivo CSV primeiro!');
        return;
    }
    btnConnect.disabled = true;
    ipcRenderer.send('start-whatsapp', selectedFilePath);
});

// Enviar mensagens
btnSend.addEventListener('click', () => {
    btnSend.disabled = true;
    ipcRenderer.send('send-messages');
});

// Receber logs do processo e mostrar na interface
ipcRenderer.on('log-message', (event, message) => {
    appendLog(message);
});

ipcRenderer.on('qr-code', (event, qrDataUrl) => {
  qrImg.src = qrDataUrl;
  qrContainer.style.display = 'block';
});

ipcRenderer.on('whatsapp-connected', () => {
  qrContainer.style.display = 'none';
  btnSend.disabled = false;
  appendLog('WhatsApp conectado com sucesso! Você pode enviar as mensagens.');
});

function appendLog(text) {
    logDiv.textContent += text + '\n';
    logDiv.scrollTop = logDiv.scrollHeight;
}
