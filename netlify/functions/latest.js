const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Get the latest image from Cloudinary
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'image-to-qr',
            max_results: 1,
            resource_type: 'image',
            direction: 'desc', // Sort in descending order (newest first)
            order_by: 'created_at', // Sort by creation date
        });

        if (!result.resources || result.resources.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'No images found',
                    message: 'No images have been uploaded yet'
                }),
            };
        }

        const latestImage = result.resources[0];

        // Find the corresponding QR code
        const qrResult = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'image-to-qr/qr-codes',
            max_results: 1,
            resource_type: 'image',
            direction: 'desc', // Sort in descending order (newest first)
            order_by: 'created_at', // Sort by creation date
        });

        const latestQR = qrResult.resources && qrResult.resources.length > 0
            ? qrResult.resources[0]
            : null;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Latest image retrieved successfully',
                fileUrl: latestImage.secure_url,
                qrCodeUrl: latestQR ? latestQR.secure_url : null,
                uploadedAt: latestImage.created_at,
            }),
        };

    } catch (error) {
        console.error('Error fetching latest image:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to retrieve image',
                message: error.message
            }),
        };
    }
};
