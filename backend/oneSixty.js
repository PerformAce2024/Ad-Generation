import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractFontDetails } from './font-extractor.js';
import { connectToMongo } from './db.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPhraseName = 'Communications';
const approvedCollectionName = 'approvedCommunication';

const dbCreativeName = 'Images';
const urlsCollectionName = 'URLs';

// Download image function
async function downloadImage(url, outputPath) {
    try {
        console.log(`Starting download of image from URL: ${url}`);
        const response = await fetch(url);
        const buffer = await response.buffer();
        fs.writeFileSync(outputPath, buffer);
        console.log(`Downloaded image to ${outputPath}`);
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
        textWidth = ctx.measureText(phrase).width;
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

// Create ad image with downloaded images and phrases
async function createAdImage(imageData, phrase, index, fontDetails) {
    try {
        console.log(`Creating ad image for index ${index} with phrase: "${phrase}"`);

        const localIconPath = path.join(__dirname, `icon_${index}.png`);
        if (imageData.icon_url) {
            await downloadImage(imageData.icon_url, localIconPath);
        }

        const localImagePath = path.join(__dirname, `Original_${index}.png`);
        if (imageData.image_url) {
            await downloadImage(imageData.image_url, localImagePath);
        } else {
            console.error(`No image URL found for index: ${index}`);
            return;
        }

        const localExtractedImagePath = path.join(__dirname, `Extracted_${index}.png`);
        if (imageData.extracted_url) {
            await downloadImage(imageData.extracted_url, localExtractedImagePath);
        } else {
            console.error(`No extracted image URL found for index ${index}`);
            return;
        }

        let backgroundColor = await getBackgroundColor(localImagePath);
        console.log(`Background color is: ${backgroundColor}`);
        backgroundColor = `rgb${backgroundColor}`;

        let iconColor = await getBackgroundColor(localIconPath);
        console.log(`Icon color is: ${iconColor}`);
        iconColor = `rgb${iconColor}`;

        const width = 160;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background and icon drawing
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        const iconSize = 50;
        if (fs.existsSync(localIconPath)) {
            const iconImage = await loadImage(localIconPath);
            ctx.drawImage(iconImage, width - iconSize - 10, 10, iconSize, iconSize);
        }

        const baseImage = await loadImage(localExtractedImagePath);

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
        ctx.font = 'bold 16px Times New Roman';
        ctx.fillStyle = 'white';
        ctx.fillText('Order Now', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

        const outputPath = path.join(__dirname, 'creatives', `oneSixty-${index}-${Date.now()}.png`);
        const buffer = canvas.toBuffer('image/jpeg');
        fs.writeFileSync(outputPath, buffer);

        console.log(`Ad image created at ${outputPath}`);
    } catch (error) {
        console.error('Error creating ad image:', error);
    }
}

async function createAdsForAllImages() {
    try {
        console.log('Starting process to create ads for all images...');
        const imageDataArray = await fetchAllImageData();

        for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];
            const approvedPhrases = await fetchApprovedPhrases(imageData.email);
            const fontDetails = await extractFontDetails(imageData.google_play_url);

            for (let j = 0; j < approvedPhrases.length; j++) {
                console.log(`Processing image ${i} and phrase ${j}`);
                await createAdImage(imageData, approvedPhrases[j], `${i}-${j}`, fontDetails);
            }
        }

        console.log('Finished creating ads for all images.');
    } catch (error) {
        console.error('Error processing ad images:', error);
    }
}

createAdsForAllImages();
