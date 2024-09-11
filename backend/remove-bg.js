import fetch from 'node-fetch';
import FormData from 'form-data';
import AWS from 'aws-sdk';
import { connectToMongo } from './db.js';
import 'dotenv/config';

const dbName = 'Images'; // Database name
const urlsCollectionName = 'URLs'; // Collection name for storing image URLs

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Fetch image URLs from MongoDB
async function fetchImageUrlsFromMongoDB(db) {
    try {
        console.log('Fetching image URLs from MongoDB...');
        const urlsCollection = db.collection(urlsCollectionName);
        const urls = await urlsCollection.find({}, { projection: { image_url: 1, google_play_url: 1, apple_app_url: 1, icon_url: 1 } }).toArray();
        console.log(`Found ${urls.length} image URLs in MongoDB.`);
        return urls;
    } catch (error) {
        console.error('Error fetching image URLs:', error);
        return [];
    }
}

// Remove background from the image
async function removeBg(imageURL) {
    try {
        const formData = new FormData();
        formData.append("size", "auto");
        formData.append("image_url", imageURL);

        console.log(`Requesting RemoveBG for image URL: ${imageURL}`);
        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY },
            body: formData,
        });

        if (response.ok) {
            console.log('Background removed successfully.');
            return await response.arrayBuffer();
        } else {
            const errorText = await response.text();
            console.error(`Failed to remove background: ${response.status} ${response.statusText} Response: ${errorText}`);
            throw new Error(`${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error in removeBg function:', error);
        throw error;
    }
}

// Upload image to S3
async function uploadImageToS3(filename, buffer) {
    try {
        console.log(`Uploading image ${filename} to S3...`);
        const params = {
            Bucket: 'performace-extracted-images',
            Key: filename,
            Body: Buffer.from(buffer),
            ContentType: 'image/png',
            ACL: 'public-read',
        };

        const data = await s3.upload(params).promise();
        console.log(`Image ${filename} uploaded successfully. URL: ${data.Location}`);
        return data.Location;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
    }
}

// Update MongoDB record with extracted URL and app details
async function updateImageRecord(db, id, extractedUrl, googleAppName, appleAppName) {
    try {
        console.log(`Updating MongoDB record with ID: ${id}`);
        const urlsCollection = db.collection(urlsCollectionName);
        const updateResult = await urlsCollection.updateOne(
            { _id: id },
            {
                $set: {
                    extracted_url: extractedUrl,
                    google_app_name: googleAppName,
                    apple_app_name: appleAppName,
                }
            }
        );

        if (updateResult.matchedCount > 0) {
            console.log(`Successfully updated document with ID: ${id}`);
        } else {
            console.log(`No document found with ID: ${id}`);
        }
    } catch (error) {
        console.error(`Error updating MongoDB record with ID: ${id}`, error);
        throw error;
    }
}

// Extract Google app name from the URL
function extractGoogleAppName(url) {
    const match = url.match(/id=([a-zA-Z0-9._]+)/);
    const googleAppName = match ? match[1] : null;
    console.log(`Extracted Google app name: ${googleAppName}`);
    return googleAppName;
}

// Extract Apple app name from the URL
function extractAppleAppName(url) {
    const match = url.match(/\/id(\d+)/);
    const appleAppName = match ? match[1] : null;
    console.log(`Extracted Apple app ID: ${appleAppName}`);
    return appleAppName;
}

// Main function to process images
async function processImages() {
    let client;
    try {
        console.log('Starting image processing...');
        client = await connectToMongo();
        const db = client.db(dbName);

        const urls = await fetchImageUrlsFromMongoDB(db);

        for (const { image_url, _id, google_play_url, apple_app_url } of urls) {
            if (!image_url) {
                console.warn(`Document with ID ${_id} has no image_url defined. Skipping...`);
                continue;
            }

            console.log(`Processing image from URL: ${image_url} & (Document ID: ${_id})`);

            if (!google_play_url || !apple_app_url) {
                console.warn(`Warning: Missing google_play_url or apple_app_url for document ID: ${_id}. Skipping...`);
                continue;
            }

            try {
                const noBgImageBuffer = await removeBg(image_url);

                const googleAppName = extractGoogleAppName(google_play_url);
                const appleAppName = extractAppleAppName(apple_app_url);

                if (!googleAppName || !appleAppName) {
                    console.warn(`Could not extract app names for document ID: ${_id}. Skipping...`);
                    continue;
                }

                const extractedFilename = `${googleAppName || appleAppName}_${Date.now()}.png`;
                const s3Url = await uploadImageToS3(extractedFilename, noBgImageBuffer);

                await updateImageRecord(db, _id, s3Url, googleAppName, appleAppName);
                console.log(`Successfully processed and uploaded image for document ID: ${_id}`);
            } catch (error) {
                console.error(`Error processing image for document ID: ${_id}`, error);
            }
        }
    } catch (error) {
        console.error('Error during image processing:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

export { processImages };
