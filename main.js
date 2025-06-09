const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sender = require('./sender');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('start-whatsapp', async (event, csvPath) => {
    sender.setMainWindow(mainWindow);
    try {
        await sender.initClient(csvPath);
        event.reply('whatsapp-connected');
    } catch (err) {
        event.reply('log-message', `Erro ao conectar WhatsApp: ${err.message}`);
    }
});

ipcMain.on('send-messages', async (event) => {
    try {
        await sender.sendMessages();
    } catch (err) {
        event.reply('log-message', `Erro ao enviar mensagens: ${err.message}`);
    }
});
