import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { extractFontDetails } from './font-extractor.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const dbPhraseName = 'Communications';
const approvedCollectionName = 'approvedCommunication';

const dbCreativeName = 'Images';
const urlsCollectionName = 'URLs';

// Download image function
async function downloadImage(url, outputPath) {
    try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        fs.writeFileSync(outputPath, buffer);
        console.log(`Downloaded image to ${outputPath}`);
    } catch (error) {
        console.error(`Failed to download image from ${url}:`, error);
    }
}


// Fetch approved phrases from MongoDB
async function fetchApprovedPhrases(email) {
    try {
        console.log(`Fetching approved phrases for email: ${email}`);
        const db = client.db(dbPhraseName);
        const approvedCollection = db.collection(approvedCollectionName);

        const approvedPhrasesDocument = await approvedCollection.findOne({ email });

        if (!approvedPhrasesDocument || !approvedPhrasesDocument.phrases || approvedPhrasesDocument.phrases.length === 0) {
            console.warn(`No approved phrases found for email: ${email}`);
            return ['Default USP phrase'];  // Fallback in case there are no approved phrases
        }

        const approvedPhrases = approvedPhrasesDocument.phrases;
        console.log(`Approved phrases for ${email}:`, approvedPhrases);
        return approvedPhrases;
    } catch (error) {
        console.error('Error fetching approved phrases:', error);
        return ['Default USP phrase'];
    }
}

// Extract background color using Python script
async function getBackgroundColor(imagePath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [path.join(__dirname, 'backgroundColor.py'), imagePath]);

        pythonProcess.stdout.on('data', (data) => {
            const color = data.toString().trim();
            resolve(color);
        });

        pythonProcess.stderr.on('data', (data) => {
            reject(`Python error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(`Python script exited with code ${code}`);
            }
        });
    });
}

function calculateFontSize(ctx, phrase, maxWidth) {
    let fontSize = 20;
    ctx.font = `${fontSize}px Times New Roman`;
    let textWidth = ctx.measureText(phrase).width;

    while (textWidth > maxWidth && fontSize > 10) {
        fontSize -= 1;
        ctx.font = `${fontSize}px Times New Roman`;
        textWidth = ctx.measureText(phrase).width;
    }

    return fontSize;
}

// Fetch all image data from MongoDB
async function fetchAllImageData() {
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('MongoDB connected successfully.');

        const db = client.db(dbName);
        const urlsCollection = db.collection(urlsCollectionName);

        console.log('Fetching all image data from MongoDB...');
        const imageDataArray = await urlsCollection.find({}, {
            projection: {
                image_url: 1,
                icon_url: 1,
                google_play_url: 1,
                apple_app_url: 1,
                extracted_url: 1,
                email: 1
            }
        }).toArray();

        if (imageDataArray.length === 0) {
            throw new Error('No image data found in MongoDB');
        }

        console.log(`Fetched ${imageDataArray.length} image data entries.`);
        return imageDataArray;
    } catch (error) {
        console.error('Error fetching image data from MongoDB:', error);
        throw error;
    } finally {
        console.log('Closing MongoDB connection...');
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

// Create ad image with downloaded images and phrases
async function createAdImage(imageData, phrase, index, fontDetails) {
    try {
        console.log(`Creating ad image for index ${index}`);

        const localIconPath = path.join(__dirname, `icon_${index}.png`);
        if (imageData.icon_url) {
            await downloadImage(imageData.icon_url, localIconPath);
        }

        const localImagePath = path.join(__dirname, `Original_${index}.png`);
        if (imageData.image_url) {
            await downloadImage(imageData.image_url, localImagePath);
        } else {
            console.error(`No image URL found for index ${index}`);
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
            // ctx.drawImage(image, x-coordinate position, y-coordinate position, image width size, image height size);
        }

        const baseImage = await loadImage(localExtractedImagePath);

        // Calculate and set the font size based on the phrase length
        const fontSize = calculateFontSize(ctx, phrase, width - 40);
        ctx.font = `${fontSize * 1.5}px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Add text to the canvas
        const paddingX = 20;
        let textY = 80; // Start text 50px from the top

        // If the text is too long, manually wrap it
        const lines = phrase.split(" ");
        let line = "";
        const maxLineWidth = width - paddingX * 2;

        // Break long phrases into multiple lines
        for (let n = 0; n < lines.length; n++) {
            const testLine = line + lines[n] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxLineWidth && n > 0) {
                ctx.fillText(line, width / 2, textY);
                line = lines[n] + " ";
                textY += fontSize + 5;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, width / 2, textY);

        // Draw image and button
        const textHeight = textY + fontSize + 5;
        const buttonHeight = 40;
        const buttonMargin = 20;
        const availableHeightForImage = height - textHeight - buttonHeight - buttonMargin * 2;

        const aspectRatio = baseImage.width / baseImage.height;
        let imgWidth = availableHeightForImage * 1.1; // Use 90% of available height
        let imgHeight = imgWidth * aspectRatio;

        if (imgWidth > width * 0.8) {
            imgWidth = width * 0.8;
            imgHeight = imgWidth / aspectRatio;
        }

        const x = (width - imgWidth) / 2;
        const y = textHeight + (availableHeightForImage - imgHeight) / 2;;

        ctx.drawImage(baseImage, x, y, imgWidth, imgHeight);

        // Add button at the bottom
        const buttonWidth = 120;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = height - buttonHeight - buttonMargin;;

        ctx.fillStyle = iconColor;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.font = 'bold 16px Times New Roman';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Order Now', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

        const outputPath = path.join(__dirname, '..', 'creatives', `160x600-${index}-${Date.now()}.png`);
        const buffer = canvas.toBuffer('image/jpeg');
        fs.writeFileSync(outputPath, buffer);

        console.log(`Ad image created at ${outputPath}`);
    } catch (error) {
        console.error('Error creating ad image:', error);
    }
}

async function createAdsForAllImages() {
    try {
        const imageDataArray = await fetchAllImageData();

        for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];
            const approvedPhrases = await fetchApprovedPhrases(imageData.email);
            const fontDetails = await extractFontDetails(imageData.google_play_url);

            for (let j = 0; j < approvedPhrases.length; j++) {
                await createAdImage(imageData, approvedPhrases[j], `${i}-${j}`, fontDetails);
            }
        }
    } catch (error) {
        console.error('Error processing ad images:', error);
    }
}

createAdsForAllImages();
