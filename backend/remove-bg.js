import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import FormData from 'form-data';
import AWS from 'aws-sdk';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
    }
});

const dbName = 'Images'; // Update the database name
const urlsCollectionName = 'URLs'; // Collection to store image URLs

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Fetch image URLs from MongoDB
async function fetchImageUrlsFromMongoDB() {
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        const db = client.db(dbName);
        const urlsCollection = db.collection(urlsCollectionName);

        console.log('Fetching image URLs from MongoDB...');
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
            headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY }, // Replace with your API key
            body: formData,
        });

        if (response.ok) {
            console.log('Background removed successfully.');
            return await response.arrayBuffer();
        } else {
            const errorText = await response.text(); // Get the detailed error response
            console.error(`Failed to remove background: ${response.status} ${response.statusText} Response: ${errorText}`);
            throw new Error(`${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error in removeBg function:', error);
        throw error;
    }
}

// Replace the function with S3 upload
async function uploadImageToS3(filename, buffer) {
    try {
        console.log(`Uploading image ${filename} to S3...`);
        const params = {
            Bucket: 'performace-extracted-images', // Replace with your S3 bucket name
            Key: filename,
            Body: Buffer.from(buffer),
            ContentType: 'image/png', // Change based on the file type
            ACL: 'public-read', // or 'private' depending on your needs
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
async function updateImageRecord(id, extractedUrl, googleAppName, appleAppName) {
    try {
        console.log(`Updating MongoDB record with ID: ${id}`);
        const db = client.db(dbName);
        const urlsCollection = db.collection(urlsCollectionName);

        const updateResult = await urlsCollection.updateOne(
            { _id: id }, // The filter to find the document by its _id
            {
                $set: {
                    extracted_url: extractedUrl, // Update the extracted_url field with the S3 URL
                    google_app_name: googleAppName, // Update the google_app_name field with the extracted bundle ID
                    apple_app_name: appleAppName // Update the apple_app_name field with the extracted app name
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
    const match = url.match(/id=([a-zA-Z0-9._]+)/); // Ensure it only extracts valid characters for app ID
    const googleAppName = match ? match[1] : null;
    console.log(`Extracted Google app name: ${googleAppName}`);
    return googleAppName;
}


function extractAppleAppName(url) {
    const match = url.match(/\/id(\d+)/); // Extract only the numerical app ID from the URL
    const appleAppName = match ? match[1] : null;
    console.log(`Extracted Apple app ID: ${appleAppName}`);
    return appleAppName;
}

// Main function to process images
async function processImages() {
    try {
        console.log('Starting image processing...');
        const urls = await fetchImageUrlsFromMongoDB();

        for (const { image_url, _id, google_play_url, apple_app_url } of urls) {
            if (!image_url) {
                console.warn(`Document with ID ${_id} has no image_url defined. Skipping...`);
                continue;
            }

            console.log(`Processing image from URL: ${image_url} & (Document ID: ${_id})`);

            // Check if google_play_url and apple_app_url are defined
            if (!google_play_url || !apple_app_url) {
                console.warn(`Warning: Missing google_play_url or apple_app_url for document ID: ${_id}. Skipping...`);
                continue;  // Skip processing if these fields are not available
            }

            try {
                // Remove background
                const noBgImageBuffer = await removeBg(image_url);

                // Extract Google and Apple app names
                const googleAppName = extractGoogleAppName(google_play_url);
                const appleAppName = extractAppleAppName(apple_app_url);

                if (!googleAppName || !appleAppName) {
                    console.warn(`Could not extract app names for document ID: ${_id}. Skipping...`);
                    continue;  // Skip this document if bundle IDs are not found
                }

                // Upload image to S3
                const extractedFilename = `${googleAppName || appleAppName}_${Date.now()}.png`;
                const s3Url = await uploadImageToS3(extractedFilename, noBgImageBuffer);

                // Update MongoDB with the extracted URL and app names
                await updateImageRecord(_id, s3Url, googleAppName, appleAppName);
                console.log(`Updating MongoDB with Google App Name: ${googleAppName} and Apple App Name: ${appleAppName}`);

                console.log(`Successfully processed and uploaded image for document ID: ${_id}`);
            } catch (error) {
                console.error(`Error processing image for document ID: ${_id}`, error);
            }
        }
    } catch (error) {
        console.error('Error during image processing:', error);
    } finally {
        console.log('Closing MongoDB connection...');
        await client.close();
        console.log('MongoDB connection closed.');
    }
}

export { processImages };
