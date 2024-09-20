import fetch from 'node-fetch';
import path from 'path';
import AWS from 'aws-sdk';
import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { extractFontDetails } from './font-extractor.js';
import { connectToMongo } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPhraseName = 'Communications';
const approvedCollectionName = 'approvedCommunication';

const dbCreativeName = 'Images';
const urlsCollectionName = 'URLs';

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_CREATIVE,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_CREATIVE,
    region: process.env.AWS_REGION_CREATIVE,
});

/// Download image function
async function downloadImage(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return buffer;
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
            if (color.startsWith("Error")) {
                console.error(`Error from Python script: ${color}`);
                reject(color);
            } else {
                console.log(`Extracted background color: ${color}`);
                resolve(color);
            }
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

// Fetch all image data from MongoDB
async function fetchAllImageData() {
    try {
        console.log('Connecting to MongoDB...');
        const client = await connectToMongo();
        const db = client.db(dbCreativeName);
        const urlsCollection = db.collection(urlsCollectionName);

        console.log('Fetching all image data from MongoDB...');
        const imageDataArray = await urlsCollection.find({}, {
            projection: {
                image_url: 1,
                icon_url: 1,
                google_play_url: 1,
                apple_app_url: 1,
                extracted_url: 1
            }
        }).toArray();

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

// Store the generated S3 URLs in MongoDB
async function storeCreativeUrlsInMongo(email, creativeUrls) {
    try {
        const client = await connectToMongo();
        const db = client.db('Images');
        const urlsCollection = db.collection('Creatives');

        // Insert the document with email and URLs
        const result = await urlsCollection.updateOne(
            { email },
            { $set: { email, urls: creativeUrls } },
            { upsert: true } // Create a new document if one doesn't exist
        );

        console.log(`Successfully stored ${creativeUrls.length} URLs in MongoDB for ${email}.`);
    } catch (error) {
        console.error('Error storing creative URLs in MongoDB:', error);
        throw error;
    }
}

// Upload image to S3
async function uploadCreativesToS3(filename, buffer) {
    try {
        console.log(`Uploading creative ${filename} to S3...`);
        const params = {
            Bucket: 'growthz-creatives',
            Key: filename,
            Body: Buffer.from(buffer),
            ContentType: 'image/png',
            ACL: 'public-read',
        };

        const data = await s3.upload(params).promise();
        console.log(`Creative ${filename} uploaded successfully. URL: ${data.Location}`);
        return data.Location;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
    }
}

// Create ad image with downloaded images and phrases, and save/upload to S3
async function createAdImage(imageData, phrase, fontDetails, index, email) {
    try {
        const width = 160;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const backgroundColor = `rgb${await getBackgroundColor(imageData.image_url)}`;
        console.log(`Background color is: ${backgroundColor}`);

        const iconColor = `rgb${await getBackgroundColor(imageData.icon_url)}`;
        console.log(`Icon color is: ${iconColor}`);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        if (imageData.icon_url) {
            const iconImage = await loadImage(imageData.icon_url);
            ctx.drawImage(iconImage, width - 50 - 10, 10, 50, 50);
        }

        const baseImage = await loadImage(imageData.extracted_url);

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

        const buffer = canvas.toBuffer('image/png');

        // Upload to S3 and return the URL
        const filename = `creative_${email}_${index}.png`;
        const s3Url = await uploadCreativesToS3(filename, buffer);

        return s3Url; // Returning the URL of the uploaded creative
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

        const savedImageUrls = [];
        for (let i = 0; i < imageDataArray.length; i++) {
            for (let j = 0; j < approvedPhrases.length; j++) {
                const imageUrl = await createAdImage(imageDataArray[i], approvedPhrases[j], fontDetails, `${i}_${j}`, email);
                savedImageUrls.push(imageUrl);
            }
        }

        // Store the collected URLs in MongoDB
        await storeCreativeUrlsInMongo(email, savedImageUrls);

        console.log('Finished creating and uploading ads for all images.');
        return savedImageUrls;  // Return array of S3 URLs
    } catch (error) {
        throw error;
    }
}

export { createAdsForAllImages };
