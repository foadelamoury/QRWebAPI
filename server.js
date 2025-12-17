const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use timestamp + original name to ensure uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static files from uploads directory so they can be accessed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload endpoint
app.post('/upload', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                error: 'File upload error',
                message: err.message
            });
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).json({
                error: 'Server error',
                message: err.message
            });
        }

        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }

        console.log(`File uploaded: ${req.file.filename}`);

        // Construct the URL to the uploaded file
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // Generate QR Code
        const qrFilename = `qr-${req.file.filename}.png`;
        const qrFilePath = path.join(__dirname, 'uploads', qrFilename);
        const qrUrl = `${req.protocol}://${req.get('host')}/uploads/${qrFilename}`;

        QRCode.toFile(qrFilePath, fileUrl, (err) => {
            if (err) {
                console.error('QR generation error:', err);
                return res.status(500).json({
                    error: 'Error generating QR code',
                    message: err.message
                });
            }

            console.log(`QR code generated: ${qrFilename}`);

            // Return the QR code URL and the File URL
            res.json({
                message: 'File uploaded successfully',
                fileUrl: fileUrl,
                qrCodeUrl: qrUrl
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
