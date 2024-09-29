import fetch from 'node-fetch';
import path from 'path';
import AWS from 'aws-sdk';
import { createCanvas, loadImage } from 'canvas';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
// import { extractFontDetails } from './font-extractor.js';
import { connectToMongo } from './db.js';
import 'dotenv/config';

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

        console.log('Approved Phrases are:', approvedPhrasesDocument.phrases);
        console.log('Approved phrases extratced successfully.')
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

        // Spawn the Python process and call the Python script
        const pythonProcess = spawn('python', [path.join(__dirname, 'backgroundColor.py'), imagePath]);

        let result = '';
        let errorOutput = '';

        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        // Collect error messages from stderr
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // Handle process close event
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}. Error output: ${errorOutput}`);
                return reject(`Python script exited with code ${code}`);
            }

            // Trim and handle the result
            result = result.trim();

            // Check if result contains an error message
            if (result.startsWith("Error")) {
                console.error(`Error from Python script: ${result}`);
                return reject(result);
            }

            if (!result) {
                console.error('No data received from Python script.');
                return reject('No data received from Python script.');
            }

            console.log(`Extracted background color: ${result}`);
            resolve(result); // Successfully resolve the background color
        });

        // Handle general errors
        pythonProcess.on('error', (err) => {
            console.error(`Failed to start Python process: ${err}`);
            reject(`Failed to start Python process: ${err.message}`);
        });

        // Optional: Add a timeout to handle long-running processes
        setTimeout(() => {
            pythonProcess.kill();
            reject('Python script took too long to execute and was terminated.');
        }, 30000); // Increase timeout to 30 seconds or more based on typical processing times.          
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
async function fetchAllImageData(key) {
    try {
        console.log('Connecting to MongoDB...');
        const client = await connectToMongo();
        const db = client.db(dbCreativeName);
        const urlsCollection = db.collection(urlsCollectionName);

        console.log('Using key for fetching images - oneSixty.js:', key); // Log key for debugging

        console.log('Fetching all image data from MongoDB...');
        const query = {};
        query[`${key}.scraped_images`] = { $exists: true, $ne: [] }; // Ensure scraped images exist

        const projection = {
            email: 1,
            [`${key}.google_play_url`]: 1,
            [`${key}.icon_url`]: 1,
            [`${key}.scraped_images.image_url`]: 1,
            [`${key}.scraped_images.extracted_image_url`]: 1
        };

        const imageDataArray = await urlsCollection.find(query, { projection }).toArray();

        if (imageDataArray.length === 0) {
            console.error('No image data found in MongoDB');
            throw new Error('No image data found in MongoDB');
        }

        console.log(`Fetched ${imageDataArray.length} image data entries.`);
        console.log('Fetched image data:', imageDataArray);
        return imageDataArray;
    } catch (error) {
        console.error('Error fetching image data from MongoDB:', error);
        throw error;
    }
}

// Store the generated S3 URLs in MongoDB
async function storeCreativeUrlsInMongo(email, creativeUrl) {
    try {
        console.log(`Updating MongoDB record for email: ${email}`);
        const client = await connectToMongo();
        const db = client.db('Images');
        console.log('Connected to Images database');

        const urlsCollection = db.collection('Creatives');
        console.log('Accessed collection: Creatives');

        console.log(`Upserting creative for email: ${email}`);
        const updateResult = await urlsCollection.updateOne(
            { email: email },
            { $push: { creativeUrls: creativeUrl } }, // Append new URLs to the existing "urls" array
            { upsert: true }
        );

        // Check if the document was updated or inserted
        if (updateResult.matchedCount > 0 || updateResult.upsertedCount > 0) {
            console.log(`Creatives added successfully for email: ${email}`);
        } else {
            console.log('Failed to add creatives');
        }

        console.log(`Storing creative URL: ${creativeUrl} for email: ${email}`);
        console.log(`Successfully stored Creatives URLs in MongoDB for ${email}.`);
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
        console.error(`Error uploading image to S3 for filename: ${filename}. Error:`, error);
        throw error;
    }
}

// Create ad image with downloaded images and phrases, and save/upload to S3
// async function createAdImage(dataIndex, imageIndex, phrase, email, scrapedImage, iconUrl, fontDetails) {
async function createAdImage(dataIndex, imageIndex, phrase, email, scrapedImage, iconUrl) {
    try {
        console.log(`Creating ad image for dataIndex: ${dataIndex}, imageIndex: ${imageIndex}, phrase: "${phrase}" & email: ${email}`);
        const width = 160;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Check if the scraped image has a valid image_url
        if (!scrapedImage?.image_url) {
            throw new Error(`No valid image URL found for scraped_image at index ${imageIndex} of dataIndex ${dataIndex}`);
        }

        const backgroundColor = `rgb${await getBackgroundColor(scrapedImage.image_url)}`;
        console.log(`Background color for image ${imageIndex}: ${backgroundColor}`);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        let iconColor = 'rgb(0, 0, 0)'; // Default color in case no icon URL

        // Only extract icon background color if iconUrl is valid
        if (iconUrl) {
            console.log(`Extracting background color for the icon at: ${iconUrl}`);
            iconColor = `rgb${await getBackgroundColor(iconUrl)}`;
            console.log(`Icon color for image ${imageIndex}: ${iconColor}`);
        } else {
            console.warn(`No icon URL provided for image ${imageIndex}, using default icon color.`);
        }

        // Load and draw icon image only if iconUrl is available
        if (iconUrl) {
            const iconImage = await loadImage(iconUrl);
            const iconSize = 50;  // Set a default icon size
            ctx.drawImage(iconImage, width - iconSize - 10, 10, iconSize, iconSize);
            console.log(`Icon drawing completed for index ${imageIndex}`);
        }

        const baseImage = await loadImage(scrapedImage.extracted_image_url);
        console.log(`Base image loaded for index ${imageIndex}`);

        const fontSize = calculateFontSize(ctx, phrase, width - 40);
        ctx.font = `${fontSize * 1.5}px Times New Roman`;
        // ctx.font = `${fontSize * 1.5}px ${fontDetails.fontFamily}`;
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
        console.log(`Image drawing completed for index ${imageIndex}`);

        const buttonHeight = 40;
        const buttonWidth = 120;
        const buttonX = (width - buttonWidth) / 2;
        const buttonY = height - buttonHeight - 20;

        ctx.fillStyle = iconColor;
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.font = 'bold 16px Times New Roman';
        // ctx.font = `bold 16px ${fontDetails.fontFamily}`;
        ctx.fillStyle = 'white';
        ctx.fillText('Order Now', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

        const buffer = canvas.toBuffer('image/png');
        console.log(`Buffer created for index ${imageIndex}`);

        // Upload to S3 and return the URL
        const filename = `creative_${email}_${dataIndex}_${imageIndex}.png`;
        const s3Url = await uploadCreativesToS3(filename, buffer);
        console.log(`Image uploaded to S3 for index ${imageIndex}`);

        return s3Url; // Returning the URL of the uploaded creative
    } catch (error) {
        console.error(`Error creating ad image for dataIndex ${dataIndex}, imageIndex ${imageIndex}, phrase: ${phrase}`, error);
        throw error;
    }
}

// Create ads for all images
async function createAdsForAllImages({ email, key }) {
    try {
        const approvedPhrases = await fetchApprovedPhrases(email);
        const imageDataArray = await fetchAllImageData(key);
        // const fontDetails = await extractFontDetails(google_play);

        const totalPhrases = approvedPhrases.length;
        console.log('Total Phrases:', totalPhrases);

        // Loop through all imageData entries
        for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];
            console.log('Image data:', imageData);  // Print entire imageData to check structure

            // Extract the specific entry using the key and safely access `icon_url`
            const imageDataEntry = imageData[key];
            const iconUrl = imageDataEntry ? imageDataEntry.icon_url : null;
            console.log(`Using iconUrl: ${iconUrl}`);  // Print icon URL to confirm

            // Check if scraped_images exist and process each image_url
            const scrapedImages = imageDataEntry?.scraped_images || [];
            console.log(`Scraped images length: ${scrapedImages.length}`);

            for (let j = 0; j < scrapedImages.length; j++) {
                const phrase = approvedPhrases[(i * scrapedImages.length + j) % totalPhrases];  // Rotate through phrases

                try {
                    console.log(`Calling createAdImage for email: ${email}, phrase: "${phrase}", image index: ${j}`);
                    // const imageUrl = await createAdImage(i, j, phrase, email, scrapedImages[j], imageData.icon_url, fontDetails);
                    const imageUrl = await createAdImage(i, j, phrase, email, scrapedImages[j], iconUrl);
                    await storeCreativeUrlsInMongo(email, imageUrl);
                } catch (error) {
                    console.error(`Error creating ad for image ${j} of imageData ${i}, phrase: "${phrase}"`, error);
                }
            }
        }

        console.log('Finished creating and uploading ads for all images.');
        return true;
    } catch (error) {
        throw error;
    }
}


export { createAdsForAllImages };
