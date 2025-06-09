const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const csv = require('csv-parser');

let mainWindow;
let client;
let contacts = [];

function setMainWindow(win) {
    mainWindow = win;
}

function sendLog(msg) {
    if (mainWindow) {
        mainWindow.webContents.send('log-message', msg);
    }
}

function initClient(csvPath) {
    return new Promise((resolve, reject) => {
        client = new Client({
            authStrategy: new LocalAuth(),
        });

        client.on('qr', async (qr) => {
            try {
                const qrDataUrl = await qrcode.toDataURL(qr); // gera imagem base64 do QR
                mainWindow.webContents.send('qr-code', qrDataUrl); // envia pro frontend
            } catch (err) {
                sendLog('Erro ao gerar QR code em base64: ' + err.message);
            }
        });

        client.on('ready', () => {
            sendLog('Cliente WhatsApp está pronto!');
            loadCsv(csvPath)
                .then((data) => {
                    contacts = data;
                    resolve();
                })
                .catch((err) => reject(err));
        });

        client.on('auth_failure', (msg) => {
            sendLog(`Falha na autenticação: ${msg}`);
            reject(new Error(msg));
        });

        client.initialize();
    });
}

function loadCsv(path) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

async function sendMessages() {
    sendLog(`Iniciando envio de mensagens para ${contacts.length} contatos...`);
    for (const contact of contacts) {
        const phone = contact.telefone || contact.phone || contact.numero;
        if (!phone) {
            sendLog('Número de telefone inválido ou não encontrado, pulando contato.');
            continue;
        }

        const msg = 'Olá, este é um Bot Whatsapp Python!';
        try {
            await client.sendMessage(phone + '@c.us', msg);
            sendLog(`Mensagem enviada para ${phone}`);
        } catch (err) {
            sendLog(`Erro ao enviar mensagem para ${phone}: ${err.message}`);
        }
        // Delay entre mensagens (ex: 45-60s aleatório)
        await delay(45000 + Math.floor(Math.random() * 15000));
    }
    sendLog('Envio de mensagens concluído.');
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    setMainWindow,
    initClient,
    sendMessages,
};
