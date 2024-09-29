import fetch from 'node-fetch';
import FormData from 'form-data';
import AWS from 'aws-sdk';
import { connectToMongo } from './db.js';
import 'dotenv/config';

const dbName = 'Images';
const urlsCollectionName = 'URLs';

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_EXTRACTED_IMAGE,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_EXTRACTED_IMAGE,
    region: process.env.AWS_REGION_EXTRACTED_IMAGE,
});

// Remove background from the image
async function removeBg(imageURL) {
    try {
        console.log(`Starting background removal for image URL: ${imageURL}`);
        const formData = new FormData();
        formData.append("size", "full");
        formData.append("image_url", imageURL);

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY },
            body: formData,
        });

        if (response.ok) {
            console.log('Background removed successfully for URL:', imageURL);
            return await response.arrayBuffer(); // Return the processed image buffer
        } else {
            const errorText = await response.text();
            console.error(`Failed to remove background for ${imageURL}: ${response.status} ${response.statusText} - ${errorText}`);
            return null; // Return null if it fails, so we can handle it later
        }
    } catch (error) {
        console.error('Error in removeBg function for URL:', imageURL, error);
        return null;
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
        console.log(`Image ${filename} uploaded successfully to S3. URL: ${data.Location}`);
        return data.Location;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        return null;
    }
}

// Update MongoDB record with extracted URL and app details
async function updateImageRecord(db, email, key, imageIndex, extractedUrl) {
    try {
        console.log(`Updating MongoDB record for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`);
        const urlsCollection = db.collection(urlsCollectionName);

        // Dynamic update for the correct image in the array based on imageIndex
        const updateResult = await urlsCollection.updateOne(
            { email: email },
            {
                $set: {
                    [`${key}.scraped_images.${imageIndex}.extracted_image_url`]: extractedUrl, // Dynamically update the correct field
                },
            }
        );

        if (updateResult.matchedCount > 0) {
            console.log(`Successfully updated document for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`);
        } else {
            console.log(`No document found for email: ${email}, field: ${key}`);
        }
    } catch (error) {
        console.error(`Error updating MongoDB record for email: ${email}, field: ${key}`, error);
        throw error;
    }
}

// Main function to process images
async function processImages() {
    let client;
    try {
        console.log('Starting image processing...');
        client = await connectToMongo();
        const db = client.db(dbName);

        // Fetch all documents that contain scraped images
        const documents = await db.collection(urlsCollectionName).find({}).toArray();

        // Iterate through all documents
        for (const doc of documents) {
            const { email, ...fields } = doc;
            console.log(`Processing images for email: ${email}`);

            // Iterate through each field to find ones containing "scraped_images"
            for (const key in fields) {
                const inputField = doc[key];

                if (inputField.scraped_images && Array.isArray(inputField.scraped_images)) {
                    const { scraped_images } = inputField;

                    console.log(`Processing field: ${key} with scraped_images:`, scraped_images);

                    if (!scraped_images || scraped_images.length === 0) {
                        console.log(`No images found to process for field: ${key} in email: ${email}`);
                        continue;
                    }

                    // Process each scraped image
                    for (const [imageIndex, { image_url }] of scraped_images.entries()) {
                        if (!image_url) {
                            console.log(`No image URL found for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`);
                            continue;
                        }

                        console.log(`Processing image from URL: ${image_url} for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`);

                        try {
                            // Step 1: Remove background from image
                            const noBgImageBuffer = await removeBg(image_url);
                            if (!noBgImageBuffer) {
                                console.error(`Background removal failed for image: ${image_url}, skipping...`);
                                continue;
                            }

                            // Step 2: Upload processed image to S3
                            const extractedFilename = `${key}_${Date.now()}.png`; // Use key to name the file
                            const s3Url = await uploadImageToS3(extractedFilename, noBgImageBuffer);

                            if (!s3Url) {
                                console.error(`Image upload failed for ${image_url}, skipping...`);
                                continue;
                            }

                            // Step 3: Update MongoDB record with extracted image URL
                            await updateImageRecord(db, email, key, imageIndex, s3Url);
                            console.log(`Successfully processed and uploaded image for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`);
                        } catch (error) {
                            console.error(`Error processing image for email: ${email}, field: ${key}, imageIndex: ${imageIndex}`, error);
                        }
                    }
                }
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
