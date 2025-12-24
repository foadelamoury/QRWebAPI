# Image to QR Code API

A simple REST API that accepts image uploads and generates QR codes linking to the uploaded images.

## Features 

- Upload images via POST request
- Automatic QR code generation
- QR code saved as PNG file
- Returns both image URL and QR code URL

## API Endpoint

### POST /upload

Upload an image and receive a QR code linking to it.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with key `image` (file)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "fileUrl": "http://your-domain.com/uploads/filename.png",
  "qrCodeUrl": "http://your-domain.com/uploads/qr-filename.png.png"
}
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Server runs on `http://localhost:3000`

## Testing with Postman

1. Create a POST request to `http://localhost:3000/upload`
2. Set Body to `form-data`
3. Add key `image` with type `File`
4. Select an image file
5. Send request

## Deployment

This app is deployed on [Render](https://render.com) free tier.

## Technologies

- Node.js
- Express
- Multer (file uploads)
- QRCode (QR generation)
- CORS
