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

// Verifica se a data é recente (últimos 30 dias)
function isRecentDate(dateStr) {
    if (!dateStr) return false;
    const [day, month, yearAndTime] = dateStr.split('/');
    const [year, time] = yearAndTime.split(' - ');
    const formattedDate = new Date(`${year}-${month}-${day}T${time}`);
    const now = new Date();
    const diffDays = (now - formattedDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
}

// Modelos de mensagem (1 a 6)
function modelo1({ name, category }) {
    return `Oi ${name}! Vi que você se interessou por consórcio de ${category}.
Estou com condições bem interessantes hoje e posso te ajudar sem compromisso.
Quer dar uma olhada?`;
}

function modelo2({ name, category, value }) {
    return `Olá ${name}, tudo certo? Vi seu interesse por consórcio para ${category} e um valor na faixa de R$${value}.
Tenho grupos com parcelas inteligentes e ótimo prazo. Posso te mostrar uma proposta?`;
}

function modelo3({ name, category }) {
    return `Fala ${name}, tudo bem? Você simulou um consórcio pra ${category} há poucos dias.
Já chegou a ver alguma proposta real? Posso te passar opções que cabem no seu perfil!`;
}

function modelo4({ name, category }) {
    return `Oi ${name}! Estou ajudando pessoas que simularam consórcio pra ${category} com condições bem vantajosas hoje.
Posso te mandar algo rápido aqui?`;
}

function modelo5({ name, category, locally }) {
    return `Olá ${name}, vi seu interesse por consórcio de ${category}. Atendo clientes na região de ${locally} com planos acessíveis e com boas chances de contemplação.
Se quiser, te mostro como funciona.`;
}

function modelo6({ name, category }) {
    return `Oi ${name}! Vi que você considerou um consórcio mais robusto pra ${category}.
Com esse perfil, consigo propostas com grupos premium e contemplação mais rápida.
Posso te enviar?`;
}

// Escolhe um modelo aleatório entre os elegíveis (1 a 5)
function getRandomEligibleModel(contact) {
    const { Nome: name, Categoria: category, Valor: value, Data: date, 'Localização': locally } = contact;
    const isRecent = isRecentDate(date);

    const candidates = [];

    candidates.push(() => modelo1({ name, category }));

    if (value) {
        candidates.push(() => modelo2({ name, category, value }));
    }

    if (isRecent) {
        candidates.push(() => modelo3({ name, category }));
    }

    candidates.push(() => modelo4({ name, category }));

    if (locally) {
        candidates.push(() => modelo5({ name, category, locally }));
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex]();
}

// Função principal
function generateMessage(contact, modelNumber = null) {
    const name = contact.Nome;
    const category = contact.Categoria;
    const value = contact.Valor;
    const date = contact.Data;
    const locally = contact['Localização'];

    // Modelo 6 entra automaticamente se valor > 100 mil
    if (value > 100000) {
        return modelo6({ name, category });
    }

    // Se modelo específico foi solicitado (1 a 5)
    if (modelNumber && modelNumber >= 1 && modelNumber <= 5) {
        switch (modelNumber) {
            case 1:
                return modelo1({ name, category });
            case 2:
                if (!value) return "Valor ausente para o Modelo 2.";
                return modelo2({ name, category, value });
            case 3:
                if (!isRecentDate(date)) return "A data não é recente o suficiente para o Modelo 3.";
                return modelo3({ name, category });
            case 4:
                return modelo4({ name, category });
            case 5:
                if (!locally) return "Localização ausente para o Modelo 5.";
                return modelo5({ name, category, locally });
            default:
                return "Modelo inválido.";
        }
    }

    // Se nenhum modelo for especificado, escolher aleatoriamente entre os elegíveis
    return getRandomEligibleModel(contact);
}

async function sendMessages() {
    sendLog(`Iniciando envio de mensagens para ${contacts.length} contatos...`);
    for (const contact of contacts) {
        const phone = contact.Telefone;

        if (!phone) {
            sendLog('Número de telefone inválido ou não encontrado, pulando contato.');
            continue;
        }

        const msg = generateMessage(contact);
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
