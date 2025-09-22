import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import P from 'pino';

// Logger to suppress verbose Baileys output
const logger = P({ level: 'silent' });

// Function to start the WhatsApp bot
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger,
        printQRInTerminal: true,
        auth: state,
    });

    // Event listener for connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected and ready!');
        }
    });

    // Event listener to save credentials
    sock.ev.on('creds.update', saveCreds);

    // Event listener for incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return; // Ignore messages without content

        const msgText = msg.message.extendedTextMessage?.text || msg.message.conversation || '';
        const jid = msg.key.remoteJid;

        // Check if the message contains the key phrase
        if (msgText.toLowerCase().includes('new stock count')) {
            console.log('👍 Detected "new stock count" message. Liking it now.');
            // Send a 👍 reaction to the message
            await sock.sendMessage(jid, {
                react: {
                    text: '👍',
                    key: msg.key,
                },
            });
        }
    });
}

connectToWhatsApp();
