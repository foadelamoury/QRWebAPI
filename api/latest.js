const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the latest image from Cloudinary
        // Note: Cloudinary's direction parameter doesn't always work reliably,
        // so we fetch more results and sort them ourselves
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'image-to-qr',
            max_results: 100,
            resource_type: 'image',
        });

        // Filter out QR codes (we only want the uploaded images, not the generated QR codes)
        const uploadedImages = result.resources.filter(resource =>
            !resource.public_id.includes('qr-codes/qr-')
        );

        // Sort by created_at in descending order (newest first)
        uploadedImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (!uploadedImages || uploadedImages.length === 0) {
            return res.status(404).json({
                error: 'No images found',
                message: 'No images have been uploaded yet'
            });
        }

        const latestImage = uploadedImages[0];

        // Find the corresponding QR code
        // Fetch multiple QR codes and sort manually (same issue as with images)
        const qrResult = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'image-to-qr/qr-codes',
            max_results: 100,
            resource_type: 'image',
        });

        // Sort QR codes by created_at in descending order (newest first)
        let latestQR = null;
        if (qrResult.resources && qrResult.resources.length > 0) {
            const sortedQRs = qrResult.resources.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
            latestQR = sortedQRs[0];
        }

        return res.status(200).json({
            message: 'Latest image retrieved successfully',
            fileUrl: latestImage.secure_url,
            qrCodeUrl: latestQR ? latestQR.secure_url : null,
            uploadedAt: latestImage.created_at,
        });

    } catch (error) {
        console.error('Error fetching latest image:', error);
        return res.status(500).json({
            error: 'Failed to retrieve image',
            message: error.message
        });
    }
}
