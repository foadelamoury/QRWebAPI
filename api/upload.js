const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async function handler(req, res) {
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
        let folderName = 'uploads'; // Default folder name
        let metadata = null;

        for (const part of parts) {
            if (!part || !part.includes('Content-Disposition')) continue;

            const dataStart = part.indexOf('\r\n\r\n');
            const dataEnd = part.lastIndexOf('\r\n');

            if (dataStart === -1 || dataEnd === -1 || dataEnd <= dataStart) continue;

            const headerPart = part.substring(0, dataStart);
            const contentStart = dataStart + 4;

            // Extract the folder name
            if (headerPart.includes('name="folder"') && !headerPart.includes('filename=')) {
                folderName = part.substring(contentStart, dataEnd).trim();
            }

            // Extract the metadata
            if (headerPart.includes('name="metadata"') && !headerPart.includes('filename=')) {
                const metadataStr = part.substring(contentStart, dataEnd).trim();
                try {
                    metadata = JSON.parse(metadataStr);
                } catch (e) {
                    metadata = metadataStr;
                }
            }

            // Extract the image file
            if (headerPart.includes('name="image"')) {
                const filenameMatch = headerPart.match(/filename="(.+?)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
                const fileData = part.substring(contentStart, dataEnd);
                fileBuffer = Buffer.from(fileData, 'binary');
            }
        }

        if (!fileBuffer) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload or ensure key is "image"'
            });
        }

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadOptions = {
                folder: folderName,
                public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
            };

            if (metadata) {
                const context = {};
                if (typeof metadata === 'object' && metadata !== null) {
                    Object.entries(metadata).forEach(([key, value]) => {
                        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
                        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

                        // If value is longer than 255, split it into chunks
                        if (strValue.length > 255) {
                            const chunks = strValue.match(/.{1,255}/g);
                            chunks.forEach((chunk, index) => {
                                context[`${safeKey}_${index + 1}`] = chunk;
                            });
                        } else {
                            context[safeKey] = strValue;
                        }
                    });
                } else {
                    const strValue = String(metadata);
                    if (strValue.length > 255) {
                        const chunks = strValue.match(/.{1,255}/g);
                        chunks.forEach((chunk, index) => {
                            context[`custom_${index + 1}`] = chunk;
                        });
                    } else {
                        context.custom = strValue;
                    }
                }
                uploadOptions.context = context;
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary stream error:', error);
                        reject(error);
                    }
                    else resolve(result);
                }
            );
            uploadStream.end(fileBuffer);
        });

        const fileUrl = uploadResult.secure_url;
        const publicId = uploadResult.public_id;

        // Generate landing page URL for QR code
        const baseUrl = process.env.BASE_URL || `https://${req.headers.host || 'your-domain.vercel.app'}`;
        const landingPageUrl = `${baseUrl}/view?id=${encodeURIComponent(publicId)}`;

        // Generate QR code pointing to landing page
        const qrBuffer = await QRCode.toBuffer(landingPageUrl, {
            type: 'png',
            width: 300,
        });

        // Upload QR code to Cloudinary
        const qrResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `${folderName}/qr-codes`,
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
            landingPageUrl: landingPageUrl,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Upload failed',
            message: error.message,
            details: error.http_code ? `Status ${error.http_code}: ${JSON.stringify(error)}` : undefined
        });
    }
};

module.exports.config = config;
