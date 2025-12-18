import QRCode from 'qrcode';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Serve uploaded files from R2
        if (url.pathname.startsWith('/uploads/')) {
            return handleGetFile(url.pathname, env, corsHeaders);
        }

        // Handle file upload
        if (url.pathname === '/upload' && request.method === 'POST') {
            return handleUpload(request, env, corsHeaders);
        }

        // Default response
        return new Response('Image to QR Code API. POST to /upload with multipart/form-data', {
            headers: corsHeaders,
        });
    },
};

async function handleGetFile(pathname, env, corsHeaders) {
    const filename = pathname.replace('/uploads/', '');

    try {
        const object = await env.UPLOADS_BUCKET.get(filename);

        if (!object) {
            return new Response('File not found', {
                status: 404,
                headers: corsHeaders
            });
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');

        return new Response(object.body, { headers });
    } catch (error) {
        return new Response('Error retrieving file: ' + error.message, {
            status: 500,
            headers: corsHeaders,
        });
    }
}

async function handleUpload(request, env, corsHeaders) {
    try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
            return new Response(JSON.stringify({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Generate unique filename using crypto for better randomness
        const timestamp = Date.now();
        const uuid = crypto.randomUUID().split('-')[0]; // Use first part of UUID for brevity
        const ext = file.name.split('.').pop() || 'bin';
        const filename = `${timestamp}-${uuid}.${ext}`;

        // Upload file to R2
        await env.UPLOADS_BUCKET.put(filename, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // Construct file URL
        const host = request.headers.get('host');
        const protocol = request.url.startsWith('https') ? 'https' : 'http';
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;

        // Generate QR code
        const qrFilename = `qr-${filename}.png`;
        let qrBuffer;

        try {
            qrBuffer = await QRCode.toBuffer(fileUrl, {
                type: 'png',
                width: 300,
            });
        } catch (qrError) {
            return new Response(JSON.stringify({
                error: 'Error generating QR code',
                message: qrError.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Upload QR code to R2
        await env.UPLOADS_BUCKET.put(qrFilename, qrBuffer, {
            httpMetadata: {
                contentType: 'image/png',
            },
        });

        const qrUrl = `${protocol}://${host}/uploads/${qrFilename}`;

        return new Response(JSON.stringify({
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            qrCodeUrl: qrUrl,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: 'Upload failed',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
