import { put } from '@vercel/blob';
import QRCode from 'qrcode';
import { Readable } from 'stream';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse multipart form data
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Simple multipart parser to extract file
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
            return res.status(400).json({ error: 'No boundary found' });
        }

        const parts = buffer.toString('binary').split(`--${boundary}`);
        let fileBuffer = null;
        let filename = 'uploaded-file';
        let contentType = 'application/octet-stream';

        for (const part of parts) {
            if (part.includes('Content-Disposition') && part.includes('name="image"')) {
                const filenameMatch = part.match(/filename="(.+?)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }

                const contentTypeMatch = part.match(/Content-Type: (.+?)\r\n/);
                if (contentTypeMatch) {
                    contentType = contentTypeMatch[1];
                }

                const dataStart = part.indexOf('\r\n\r\n') + 4;
                const dataEnd = part.lastIndexOf('\r\n');
                const fileData = part.substring(dataStart, dataEnd);
                fileBuffer = Buffer.from(fileData, 'binary');
                break;
            }
        }

        if (!fileBuffer) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = filename.split('.').pop() || 'bin';
        const uniqueFilename = `${timestamp}-${random}.${ext}`;

        // Upload to Vercel Blob
        const { url: fileUrl } = await put(uniqueFilename, fileBuffer, {
            access: 'public',
            contentType: contentType,
        });

        // Generate QR code
        const qrBuffer = await QRCode.toBuffer(fileUrl, {
            type: 'png',
            width: 300,
        });

        // Upload QR code to Vercel Blob
        const qrFilename = `qr-${uniqueFilename}.png`;
        const { url: qrUrl } = await put(qrFilename, qrBuffer, {
            access: 'public',
            contentType: 'image/png',
        });

        return res.status(200).json({
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            qrCodeUrl: qrUrl,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
}
