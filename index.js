const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// Store to save session
const store = makeInMemoryStore({});

// Main function
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['SimpleBot', 'Chrome', '1.0.0'],
    });

    store.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (body?.startsWith('.ping')) {
            await sock.sendMessage(from, { text: 'Pong!' });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot is connected ✅');
        }
    });
}

startBot();
