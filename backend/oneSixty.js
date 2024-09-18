import fetch from 'node-fetch';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import fs from 'fs';
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
        const response = await fetch(url);

        // Check for valid response and content type
        if (!response.ok || !response.headers.get('content-type').includes('image')) {
            throw new Error(`Failed to download image from ${url}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('Image downloaded');
        return buffer; // Return the image as a buffer
    } catch (error) {
        console.error(`Failed to download image from ${url}:`, error);
        throw new Error(`Failed to download image from ${url}`);
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
    console.log(`Extracting background color for image at: ${imagePath}`);
    
    return new Promise((resolve, reject) => {
        // Ensure the image path is correct and exists
        if (!imagePath) {
            reject('Image path is not provided.');
            return;
        }

        const absoluteImagePath = path.resolve(imagePath); // Convert to absolute path
        console.log(`Extracting background color for image at: ${absoluteImagePath}`);

        // Spawn the Python process
        const pythonProcess = spawn('python', [path.join(__dirname, 'backgroundColor.py'), absoluteImagePath]);

        pythonProcess.stdout.on('data', (data) => {
            const color = data.toString().trim();
            if (!color) {
                console.error('No color data extracted');
                reject('No color data extracted.');
                return;
            }
            console.log(`Extracted background color: ${color}`);
            resolve(color); // Send the extracted color back to the caller
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorMsg = data.toString().trim();
            console.error(`Python error while extracting background color: ${errorMsg}`);
            reject(`Python error: ${errorMsg}`);
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

    console.log(`Calculated font size for phrase "${phrase}" is: ${fontSize}`);
    return fontSize;
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

// Create ad image with downloaded images and phrases, and save to disk
async function createAdImage(imageData, phrase, fontDetails, index, email) {
    try {
        console.log(`Creating ad image for index ${index} with phrase: "${phrase}"`);

        const width = 160;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Download images as buffers
        const iconBuffer = imageData.icon_url ? await downloadImage(imageData.icon_url) : null;
        const imageBuffer = imageData.image_url ? await downloadImage(imageData.image_url) : null;
        const extractedBuffer = imageData.extracted_url ? await downloadImage(imageData.extracted_url) : null;

        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Downloaded image buffer is empty');
        }

        const backgroundColor = `rgb${await getBackgroundColor(imageBuffer)}`;
        console.log(`Background color is: ${backgroundColor}`);

        const iconColor = `rgb${await getBackgroundColor(iconBuffer)}`;
        console.log(`Icon color is: ${iconColor}`);

        // Background and icon drawing
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        const iconSize = 50;
        if (iconBuffer) {
            const iconImage = await loadImage(iconBuffer);
            ctx.drawImage(iconImage, width - iconSize - 10, 10, iconSize, iconSize);
        }

        const baseImage = await loadImage(extractedBuffer);

        // Calculate and set the font size based on the phrase length
        const fontSize = calculateFontSize(ctx, phrase, width - 40);
        ctx.font = `${fontSize * 1.5}px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Add text to the canvas
        let textY = 80; // Start text 80px from the top
        const words = phrase.split(" ");
        let line = "";
        const maxLineWidth = width - 40;

        // Handle text wrapping for long phrases
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

        // Draw the image
        const textHeight = textY + fontSize + 5;
        const availableHeightForImage = height - textHeight - 60; // Reserve space for the button
        const aspectRatio = baseImage.width / baseImage.height;
        let imgWidth = availableHeightForImage * aspectRatio;
        let imgHeight = availableHeightForImage;

        if (imgWidth > width * 0.8) {
            imgWidth = width * 0.8;
            imgHeight = imgWidth / aspectRatio;
        }

        const x = (width - imgWidth) / 2;
        ctx.drawImage(baseImage, x, textHeight, imgWidth, imgHeight);

        // Draw the button
        const buttonHeight = 40;
        const buttonWidth = 120;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = height - buttonHeight - 20;

        ctx.fillStyle = iconColor;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = `bold 16px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'white';
        ctx.fillText('Order Now', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

        console.log('Ad image created!');

        // Save the image to disk
        const outputPath = path.join(__dirname, 'generated', `creative_${email}_${index}.jpg`);

        // Check if 'generated' directory exists, create it if it doesn't
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const buffer = canvas.toBuffer('image/jpeg');
        fs.writeFileSync(outputPath, buffer);
        console.log(`Ad image saved at ${outputPath}`);

        // Return the file path of the saved image
        return `/generated/creative_${email}_${index}.jpg`;
    } catch (error) {
        console.error('Error creating ad image:', error);
        throw error;
    }
}

async function createAdsForAllImages({ email, google_play }) {
    try {
        console.log('Starting process to create ads for all images...');

        const approvedPhrases = await fetchApprovedPhrases(email);
        const imageDataArray = await fetchAllImageData();
        const fontDetails = await extractFontDetails(google_play);

        const savedImagePaths = [];
        for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];

            for (let j = 0; j < approvedPhrases.length; j++) {
                console.log(`Processing image ${i} and phrase ${j}`);
                const savedImagePath = await createAdImage(imageData, approvedPhrases[j], fontDetails, `${i}_${j}`, email);
                savedImagePaths.push(savedImagePath); // Store file paths
            }
        }

        console.log('Finished creating ads for all images.');
        return savedImagePaths; // Return the array of file paths
    } catch (error) {
        console.error('Error processing ad images:', error);
        throw error;
    }
}

export { createAdsForAllImages };
