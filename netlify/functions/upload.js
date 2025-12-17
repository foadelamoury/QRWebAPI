const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event, context) => {
    // Log for debugging
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Method not allowed',
                receivedMethod: event.httpMethod,
                message: 'Please use POST method'
            }),
        };
    }

    try {
        // Parse multipart form data
        const boundary = event.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No boundary found' }),
            };
        }

        const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
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
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'No file uploaded',
                    message: 'Please select a file to upload'
                }),
            };
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'File uploaded successfully',
                fileUrl: fileUrl,
                qrCodeUrl: qrUrl,
            }),
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Upload failed',
                message: error.message
            }),
        };
    }
};
