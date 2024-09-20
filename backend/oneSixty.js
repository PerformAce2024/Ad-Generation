import fetch from 'node-fetch';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import fs from 'fs/promises'; // Use fs.promises for async file operations
import { fileURLToPath } from 'url';
import { extractFontDetails } from './font-extractor.js';
import { connectToMongo } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPhraseName = 'Communications';
const approvedCollectionName = 'approvedCommunication';

const dbCreativeName = 'Images';
const urlsCollectionName = 'URLs';

// Download image function
async function downloadImage(url) {
    try {
        console.log(`Starting download of image from URL: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 10000); // 10-second timeout

        const response = await fetch(url, { signal: controller.signal });

        // Clear the timeout once the fetch is successful
        clearTimeout(timeoutId);

        if (!response.ok || !response.headers.get('content-type').includes('image')) {
            throw new Error(`Failed to download image from ${url}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('Image downloaded');
        return buffer;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`Download aborted for ${url}: Request timed out`);
            throw new Error(`Request timed out for ${url}`);
        } else {
            console.error(`Failed to download image from ${url}:`, error);
            throw new Error(`Failed to download image from ${url}`);
        }
    }
}

// Fetch approved phrases from MongoDB
async function fetchApprovedPhrases(email) {
    try {
        console.log(`Fetching approved phrases for email: ${email}`);
        const client = await connectToMongo();
        const db = client.db(dbPhraseName);
        const approvedCollection = db.collection(approvedCollectionName);

        const approvedPhrasesDocument = await approvedCollection.findOne({ email });

        if (!approvedPhrasesDocument || !approvedPhrasesDocument.phrases || approvedPhrasesDocument.phrases.length === 0) {
            console.warn(`No approved phrases found for email: ${email}`);
            return ['Default USP phrase'];  // Fallback in case there are no approved phrases
        }

        return approvedPhrasesDocument.phrases;
    } catch (error) {
        console.error('Error fetching approved phrases:', error);
        return ['Default USP phrase'];
    }
}

// Extract background color using Python script
async function getBackgroundColor(imagePath) {
    return new Promise((resolve, reject) => {
        console.log(`Extracting background color for image at: ${imagePath}`);
        const pythonProcess = spawn('python', [path.join(__dirname, 'backgroundColor.py'), imagePath]);

        pythonProcess.stdout.on('data', (data) => {
            const color = data.toString().trim();
            console.log(`Extracted background color: ${color}`);
            resolve(color);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python error while extracting background color: ${data}`);
            reject(`Python error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                reject(`Python script exited with code ${code}`);
            }
        });
    });
}

// Calculate font size
function calculateFontSize(ctx, phrase, maxWidth) {
    let fontSize = 20;
    ctx.font = `${fontSize}px Times New Roman`;
    let textWidth = ctx.measureText(phrase).width;

    while (textWidth > maxWidth && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontSize}px Times New Roman`;
    }

    return fontSize;
}

// Ensure directory exists and create it if it doesn't
async function ensureDirExists(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

// Save buffer to temporary file
async function saveBufferToTempFile(buffer) {
    const tempDir = path.join(__dirname, 'temp');
    const tempFilePath = path.join(tempDir, `${Date.now()}.png`);
    await ensureDirExists(tempDir);
    await fs.writeFile(tempFilePath, buffer);
    return tempFilePath;
}

// Fetch all image data from MongoDB
async function fetchAllImageData() {
    try {
        console.log('Connecting to MongoDB...');
        const client = await connectToMongo();
        const db = client.db(dbCreativeName);
        const urlsCollection = db.collection(urlsCollectionName);

        console.log('Fetching all image data from MongoDB...');
        const imageDataArray = await urlsCollection.find({}).toArray();

        if (imageDataArray.length === 0) {
            console.error('No image data found in MongoDB');
            throw new Error('No image data found in MongoDB');
        }

        console.log(`Fetched ${imageDataArray.length} image data entries.`);
        return imageDataArray;
    } catch (error) {
        console.error('Error fetching image data from MongoDB:', error);
        throw error;
    }
}

function convertToBase64(buffer) {
    return buffer.toString('base64');
}

// Create ad image with downloaded images and phrases, and save to disk
async function createAdImage(imageData, phrase, fontDetails, index, email) {
    try {
        const width = 160;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const iconBuffer = imageData.icon_url ? await downloadImage(imageData.icon_url) : null;
        const imageBuffer = imageData.image_url ? await downloadImage(imageData.image_url) : null;
        const extractedBuffer = imageData.extracted_url ? await downloadImage(imageData.extracted_url) : null;

        const iconFilePath = iconBuffer ? await saveBufferToTempFile(iconBuffer) : null;
        const imageFilePath = imageBuffer ? await saveBufferToTempFile(imageBuffer) : null;
        const extractedImageFilePath = extractedBuffer ? await saveBufferToTempFile(extractedBuffer) : null;

        if (!imageFilePath) {
            throw new Error('Downloaded image path is empty');
        }

        const backgroundColor = `rgb${await getBackgroundColor(imageFilePath)}`;
        console.log(`Background color is: ${backgroundColor}`);

        const iconColor = iconFilePath ? `rgb${await getBackgroundColor(iconFilePath)}` : 'rgb(255,255,255)';
        console.log(`Icon color is: ${iconColor}`);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        if (iconFilePath) {
            const iconImage = await loadImage(iconFilePath);
            ctx.drawImage(iconImage, width - 50 - 10, 10, 50, 50);
        }

        const baseImage = await loadImage(extractedImageFilePath);

        const fontSize = calculateFontSize(ctx, phrase, width - 40);
        ctx.font = `${fontSize * 1.5}px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        let textY = 80;
        const words = phrase.split(" ");
        let line = "";
        const maxLineWidth = width - 40;

        words.forEach((word, idx) => {
            const testLine = line + word + " ";
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxLineWidth && idx > 0) {
                ctx.fillText(line, width / 2, textY);
                line = word + " ";
                textY += fontSize + 5;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, width / 2, textY);

        const textHeight = textY + fontSize + 5;
        const availableHeightForImage = height - textHeight - 60;
        const aspectRatio = baseImage.width / baseImage.height;
        let imgWidth = availableHeightForImage * aspectRatio;
        let imgHeight = availableHeightForImage;

        if (imgWidth > width * 0.8) {
            imgWidth = width * 0.8;
            imgHeight = imgWidth / aspectRatio;
        }

        const x = (width - imgWidth) / 2;
        ctx.drawImage(baseImage, x, textHeight, imgWidth, imgHeight);

        const buttonHeight = 40;
        const buttonWidth = 120;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = height - buttonHeight - 20;

        ctx.fillStyle = iconColor;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = `bold 16px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'white';
        ctx.fillText('Order Now', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

        const buffer = canvas.toBuffer('image/jpeg');
        const base64String = convertToBase64(buffer);

        // Store the base64 string in localStorage
        let savedImageBase64 = JSON.parse(localStorage.getItem('savedImageBase64')) || [];
        savedImageBase64.push(`data:image/jpeg;base64,${base64String}`);
        localStorage.setItem('savedImageBase64', JSON.stringify(savedImageBase64));

        console.log('Ad image stored as base64 in localStorage.');

        return base64String;  // Returning the base64 string for reference

    } catch (error) {
        console.error('Error creating ad image:', error);
        throw error;
    }
}

// Create ads for all images
async function createAdsForAllImages({ email, google_play }) {
    try {
        const approvedPhrases = await fetchApprovedPhrases(email);
        const imageDataArray = await fetchAllImageData();
        const fontDetails = await extractFontDetails(google_play);

        const savedImagePaths = [];
        for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];

            for (let j = 0; j < approvedPhrases.length; j++) {
                console.log(`Processing image ${i} and phrase ${j}`);
                const imagePath = await createAdImage(imageData, approvedPhrases[j], fontDetails, `${i}_${j}`, email);
                savedImagePaths.push(imagePath);
            }
        }

        console.log('Finished creating ads for all images.');
        return savedImagePaths;
    } catch (error) {
        throw error;
    }
}

export { createAdsForAllImages };
