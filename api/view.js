const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Logo URL - update this with your actual logo URL
const LOGO_URL = process.env.LOGO_URL || 'https://res.cloudinary.com/your-cloud/image/upload/v1/logo.png';

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
        const { id } = req.query;

        if (!id) {
            return res.status(400).send(generateErrorPage('No image ID provided'));
        }

        // Fetch the image from Cloudinary
        let imageUrl;
        try {
            const resource = await cloudinary.api.resource(id, { resource_type: 'image' });
            imageUrl = resource.secure_url;
        } catch (error) {
            console.error('Error fetching image:', error);
            return res.status(404).send(generateErrorPage('Image not found'));
        }

        // Get the base URL for sharing
        const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
        const pageUrl = `${baseUrl}/view?id=${encodeURIComponent(id)}`;

        // Generate and return the landing page HTML
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(generateLandingPage(imageUrl, pageUrl, LOGO_URL));

    } catch (error) {
        console.error('View error:', error);
        return res.status(500).send(generateErrorPage('Something went wrong'));
    }
};

function generateLandingPage(imageUrl, pageUrl, logoUrl) {
    const encodedUrl = encodeURIComponent(pageUrl);
    const encodedText = encodeURIComponent('Check out this image!');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>View Image</title>
    <meta property="og:title" content="View Image">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${pageUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            color: #333;
        }

        .container {
            width: 100%;
            max-width: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }

        .image-container {
            width: 100%;
            background: #f8f9fa;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .image-container img {
            width: 100%;
            height: auto;
            display: block;
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
        }

        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 24px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            color: #fff;
        }

        .btn-primary {
            background: #333;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            background: #444;
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        .share-section {
            width: 100%;
            text-align: center;
        }

        .share-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .share-buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .share-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }

        .share-btn:hover {
            transform: scale(1.1);
        }

        .share-btn svg {
            width: 24px;
            height: 24px;
            fill: #fff;
        }

        .share-btn.facebook { background: #1877F2; }
        .share-btn.whatsapp { background: #25D366; }
        .share-btn.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
        .share-btn.twitter { background: #000; }

        .footer {
            margin-top: 32px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            color: #999;
        }

        .footer-logo {
            width: 32px;
            height: auto;
        }

        .footer-text {
            font-weight: 500;
        }

        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 400px) {
            .container { padding: 0 10px; }
            .btn { padding: 14px 20px; font-size: 15px; }
            .share-btn { width: 50px; height: 50px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="image-container">
            <img src="${imageUrl}" alt="Shared Image" id="mainImage">
        </div>

        <div class="actions">
            <button onclick="downloadImage()" class="btn btn-primary" id="downloadBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span id="downloadText">Download Image</span>
            </button>
        </div>

        <div class="share-section">
            <p class="share-title">Share</p>
            <div class="share-buttons">
                <button onclick="shareToFacebook()" class="share-btn facebook" title="Share on Facebook">
                    <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                <button onclick="shareToWhatsApp()" class="share-btn whatsapp" title="Share on WhatsApp">
                    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                <button onclick="shareToInstagram()" class="share-btn instagram" title="Share on Instagram">
                    <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </button>
                <button onclick="shareToTwitter()" class="share-btn twitter" title="Share on X (Twitter)">
                    <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
            </div>
        </div>

        <div class="footer">
            <img src="${logoUrl}" alt="5DVR" class="footer-logo" onerror="this.style.display='none'">
            <span class="footer-text">Powered by 5DVR</span>
        </div>
    </div>

    <script>
        async function downloadImage() {
            const imageUrl = '${imageUrl}';
            const downloadBtn = document.getElementById('downloadBtn');
            const downloadText = document.getElementById('downloadText');
            
            try {
                // Update button state
                downloadBtn.disabled = true;
                downloadText.textContent = 'Downloading...';
                
                // Fetch the image
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error('Failed to fetch image');
                
                // Convert to blob
                const blob = await response.blob();
                
                // Create a temporary URL for the blob
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Extract filename from URL or use default
                const urlParts = imageUrl.split('/');
                const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
                
                // Create a temporary anchor element and trigger download
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                // Reset button state
                downloadText.textContent = 'Download Image';
                downloadBtn.disabled = false;
            } catch (error) {
                console.error('Download error:', error);
                downloadText.textContent = 'Download Failed';
                setTimeout(() => {
                    downloadText.textContent = 'Download Image';
                    downloadBtn.disabled = false;
                }, 2000);
            }
        }

        async function shareToWhatsApp() {
            const imageUrl = '${imageUrl}';
            
            try {
                // Check if Web Share API is supported
                if (navigator.share) {
                    // Fetch the image
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error('Failed to fetch image');
                    
                    // Convert to blob
                    const blob = await response.blob();
                    
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
                    
                    // Create a File object from the blob
                    const file = new File([blob], filename, { type: blob.type });
                    
                    // Check if the browser supports sharing files
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        // Share the image file
                        await navigator.share({
                            files: [file],
                            title: 'Check out this image!',
                            text: 'Check out this image!'
                        });
                    } else {
                        // Fallback: share the direct image URL
                        await navigator.share({
                            title: 'Check out this image!',
                            text: 'Check out this image!',
                            url: imageUrl
                        });
                    }
                } else {
                    // Fallback for browsers without Web Share API (desktop)
                    // Use WhatsApp Web with direct image URL
                    const text = encodeURIComponent('Check out this image!');
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://wa.me/?text=\${text}%20\${url}\`, '_blank');
                }
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    // Fallback to WhatsApp Web with direct image URL
                    const text = encodeURIComponent('Check out this image!');
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://wa.me/?text=\${text}%20\${url}\`, '_blank');
                }
            }
        }

        async function shareToFacebook() {
            const imageUrl = '${imageUrl}';
            
            try {
                // Check if Web Share API is supported
                if (navigator.share) {
                    // Fetch the image
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error('Failed to fetch image');
                    
                    // Convert to blob
                    const blob = await response.blob();
                    
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
                    
                    // Create a File object from the blob
                    const file = new File([blob], filename, { type: blob.type });
                    
                    // Check if the browser supports sharing files
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        // Share the image file
                        await navigator.share({
                            files: [file],
                            title: 'Check out this image!',
                            text: 'Check out this image!'
                        });
                    } else {
                        // Fallback: share the direct image URL
                        await navigator.share({
                            title: 'Check out this image!',
                            text: 'Check out this image!',
                            url: imageUrl
                        });
                    }
                } else {
                    // Fallback for browsers without Web Share API (desktop)
                    // Use Facebook sharer with direct image URL
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://www.facebook.com/sharer/sharer.php?u=\${url}\`, '_blank');
                }
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    // Fallback to Facebook sharer with direct image URL
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://www.facebook.com/sharer/sharer.php?u=\${url}\`, '_blank');
                }
            }
        }

        async function shareToTwitter() {
            const imageUrl = '${imageUrl}';
            
            try {
                // Check if Web Share API is supported
                if (navigator.share) {
                    // Fetch the image
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error('Failed to fetch image');
                    
                    // Convert to blob
                    const blob = await response.blob();
                    
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
                    
                    // Create a File object from the blob
                    const file = new File([blob], filename, { type: blob.type });
                    
                    // Check if the browser supports sharing files
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        // Share the image file
                        await navigator.share({
                            files: [file],
                            title: 'Check out this image!',
                            text: 'Check out this image!'
                        });
                    } else {
                        // Fallback: share the direct image URL
                        await navigator.share({
                            title: 'Check out this image!',
                            text: 'Check out this image!',
                            url: imageUrl
                        });
                    }
                } else {
                    // Fallback for browsers without Web Share API (desktop)
                    // Use Twitter intent with direct image URL
                    const text = encodeURIComponent('Check out this image!');
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://twitter.com/intent/tweet?text=\${text}&url=\${url}\`, '_blank');
                }
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    // Fallback to Twitter intent with direct image URL
                    const text = encodeURIComponent('Check out this image!');
                    const url = encodeURIComponent(imageUrl);
                    window.open(\`https://twitter.com/intent/tweet?text=\${text}&url=\${url}\`, '_blank');
                }
            }
        }

        async function shareToInstagram() {
            const imageUrl = '${imageUrl}';
            
            try {
                // Check if Web Share API is supported
                if (navigator.share) {
                    // Fetch the image
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error('Failed to fetch image');
                    
                    // Convert to blob
                    const blob = await response.blob();
                    
                    // Extract filename from URL
                    const urlParts = imageUrl.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
                    
                    // Create a File object from the blob
                    const file = new File([blob], filename, { type: blob.type });
                    
                    // Check if the browser supports sharing files
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        // Share the image file - Instagram will appear in share sheet on mobile
                        await navigator.share({
                            files: [file],
                            title: 'Check out this image!',
                            text: 'Check out this image!'
                        });
                        return; // Success, exit function
                    }
                }
                
                // Fallback: Copy image to clipboard and open Instagram
                await copyImageAndOpenInstagram(imageUrl);
                
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    // Try clipboard fallback
                    try {
                        await copyImageAndOpenInstagram(imageUrl);
                    } catch (fallbackError) {
                        console.error('Fallback error:', fallbackError);
                        showToast('Please download the image and share manually on Instagram');
                    }
                }
            }
        }

        async function copyImageAndOpenInstagram(imageUrl) {
            try {
                // Fetch the image
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error('Failed to fetch image');
                
                // Convert to blob
                const blob = await response.blob();
                
                // Try to copy image to clipboard
                if (navigator.clipboard && navigator.clipboard.write) {
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);
                    
                    // Show success toast
                    showToast('Image copied! Opening Instagram...');
                    
                    // Wait a moment for toast to show
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Try to open Instagram app (mobile) or website (desktop)
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    
                    if (isMobile) {
                        // Try Instagram app deep link first
                        window.location.href = 'instagram://camera';
                        
                        // Fallback to Instagram website after a delay
                        setTimeout(() => {
                            window.open('https://www.instagram.com/', '_blank');
                        }, 1500);
                    } else {
                        // Desktop: open Instagram website
                        window.open('https://www.instagram.com/', '_blank');
                        showToast('Image copied! Paste it in Instagram');
                    }
                } else {
                    // Clipboard API not supported, show instructions
                    showToast('Please download the image and share on Instagram');
                }
            } catch (error) {
                console.error('Copy to clipboard error:', error);
                throw error;
            }
        }

        function showToast(message) {
            // Remove any existing toast
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // Create toast element
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // Show toast with animation
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // Hide and remove toast after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3000);
        }
    </script>
</body>
</html>`;
}

function generateErrorPage(message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: #fff;
        }
        .error-container {
            text-align: center;
            padding: 40px;
        }
        h1 { color: #8B5CF6; font-size: 48px; margin-bottom: 16px; }
        p { color: rgba(255,255,255,0.7); font-size: 18px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Oops!</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}
