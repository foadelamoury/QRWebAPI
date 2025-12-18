const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This function runs on a schedule to clean up old images
module.exports = async function handler(req, res) {
    // Basic authorization for cron job (optional but recommended)
    // You can verify a secret header if you want to secure this endpoint further

    console.log('Starting scheduled cleanup...');

    try {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
        console.log(`Deleting images older than: ${tenHoursAgo.toISOString()}`);

        let deletedCount = 0;
        let nextCursor = null;

        do {
            // Fetch all images from the image-to-qr folder
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: 'image-to-qr',
                max_results: 500,
                resource_type: 'image',
                next_cursor: nextCursor,
            });

            // Filter images older than 10 hours
            const oldImages = result.resources.filter(resource => {
                const createdAt = new Date(resource.created_at);
                return createdAt < tenHoursAgo;
            });

            // Delete each old image
            for (const image of oldImages) {
                try {
                    await cloudinary.uploader.destroy(image.public_id, {
                        resource_type: 'image',
                    });
                    deletedCount++;
                    console.log(`Deleted: ${image.public_id}`);
                } catch (error) {
                    console.error(`Failed to delete ${image.public_id}:`, error.message);
                }
            }

            nextCursor = result.next_cursor;
        } while (nextCursor);

        console.log(`Cleanup completed. Deleted ${deletedCount} images.`);

        return res.status(200).json({
            message: 'Cleanup completed successfully',
            deletedCount,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({
            error: 'Cleanup failed',
            message: error.message,
        });
    }
}
