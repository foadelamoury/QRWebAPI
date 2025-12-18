const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // Log for debugging
    console.log('Method:', req.method);
    console.log('Path:', req.url);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            receivedMethod: req.method,
            message: 'Please use POST method'
        });
    }

    try {
        // Parse multipart form data
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
            return res.status(400).json({ error: 'No boundary found' });
        }

        // Buffer the request body
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString('binary').split(`--${boundary}`);

        let fileBuffer = null;
        let filename = 'uploaded-file';

        for (const part of parts) {
            if (part.includes('Content-Disposition') && part.includes('name="image"')) {
                const filenameMatch = part.match(/filename="(.+?)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
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

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'image-to-qr',
                    public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(fileBuffer);
        });

        const fileUrl = uploadResult.secure_url;

        // Generate QR code
        const qrBuffer = await QRCode.toBuffer(fileUrl, {
            type: 'png',
            width: 300,
        });

        // Upload QR code to Cloudinary
        const qrResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'image-to-qr/qr-codes',
                    public_id: `qr-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(qrBuffer);
        });

        const qrUrl = qrResult.secure_url;

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
