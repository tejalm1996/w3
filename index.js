import { Client } from 'whatsapp-web.js';
import express from 'express';
import qrcode from 'qrcode';

const app = express();

// Initialize WhatsApp Web Client
const client = new Client();

// Function to send message
async function sendMessage(phoneNumber, message) {
    // Clean the phone number: remove any non-numeric characters (except the plus sign for international codes)
    const cleanedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure the number ends with "@c.us"
    const chatId = cleanedPhoneNumber + "@c.us";
    
    try {
        // Send the message using WhatsApp Web
        await client.sendMessage(chatId, message);
        console.log(`Message sent to ${phoneNumber}`);
    } catch (err) {
        console.log('Error sending message:', err);
    }
}

// Endpoint to check WhatsApp connection status and send a message
app.get('/check-whatsapp', async (req, res) => {
    const { phoneNumber, message } = req.query;  // Get phone number and message from query parameters

    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
    }

    try {
        if (client.info && client.info.wid) {
            await sendMessage(phoneNumber, message);  // Send message if WhatsApp Web is connected
            res.json({ status: 'connected', message: 'Message sent successfully' });
        } else {
            res.json({ status: 'not_connected', message: 'WhatsApp Web is not connected' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message', details: err });
    }
});

// Endpoint to serve QR code image when WhatsApp Web is not connected
app.get('/qr', (req, res) => {
    client.on('qr', (qr) => {
        // Generate QR code image
        qrcode.toDataURL(qr, function (err, url) {
            if (err) {
                console.log('Error generating QR code:', err);
                res.status(500).send('Error generating QR code');
            } else {
                // Send the QR code as an image URL to the browser
                res.json({ qr_code: url });  // Ensure only one response is sent
            }
        });
    });
});

// Handle when WhatsApp Web client is ready
client.on('ready', () => {
    console.log('WhatsApp Web is connected!');
});

// Handle any authentication or connection errors
client.on('auth_failure', (message) => {
    console.log('Authentication failed:', message);
});

// Handle connection errors
client.on('disconnected', (reason) => {
    console.log('Disconnected from WhatsApp Web:', reason);
});

// Initialize the client
client.initialize();

// Serve the HTML page to check WhatsApp connection
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp Web Integration</title>
            </head>
            <body>
                <h1>WhatsApp Web Connection Status</h1>
                <div id="status"></div>
                <div id="qr_code"></div>
                
                <script>
                    // Fetch WhatsApp connection status
                    fetch('/check-whatsapp?phoneNumber=+919158185659&message=Hello+from+the+server')
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'connected') {
                                document.getElementById('status').innerHTML = '<p>WhatsApp Web is connected!</p>';
                            } else {
                                document.getElementById('status').innerHTML = '<p>WhatsApp Web is not connected.</p>';
                                
                                // Fetch and display QR code as an image
                                fetch('/qr')
                                    .then(response => response.json())
                                    .then(data => {
                                        document.getElementById('qr_code').innerHTML = '<img src="' + data.qr_code + '" alt="Scan this QR Code">';
                                    });
                            }
                        });
                </script>
            </body>
        </html>
    `);
});

// Start the Express server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});