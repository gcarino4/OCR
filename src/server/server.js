// src/server/server.js

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const cors = require('cors'); // Import the CORS middleware
const path = require('path');

// Set the path to your service account key
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'amplified-vine-442405-b7-04938cc317df.json'); // Update with your service account key file path

// Initialize Google Cloud Vision client
const client = new ImageAnnotatorClient();

// Initialize Express app
const app = express();
const port = 5000;

// Enable CORS for all origins (you can customize this further)
app.use(cors());

// Middleware to parse JSON body
app.use(bodyParser.json());

// Route for the root URL (GET /)
app.get('/', (req, res) => {
  res.send('Welcome to the OCR API. Use POST /api/ocr to process images.');
});

// Set up file upload with multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// OCR endpoint for processing image
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Call Google Cloud Vision API's documentTextDetection method
    const [result] = await client.documentTextDetection(req.file.buffer);

    // Extracting text from the response
    const text = result.fullTextAnnotation ? result.fullTextAnnotation.text : 'No text detected.';

    // Send the extracted text as a response
    res.json({ text });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).send('Error processing image.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
