import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { connectToMongo } from './db.js';
import { processImages } from './remove-bg.js';
import 'dotenv/config';

const dbName = 'Images';
const imagesCollectionName = 'URLs';

let client;

// Function to store image URLs in MongoDB
async function storeImageUrlInMongoDB(email, inputKey, googlePlayUrl, appleAppUrl, googleAppName, appleAppName, iconUrl, imageUrls, category) {
  try {
    client = await connectToMongo();
    const db = client.db(dbName);
    const imagesCollection = db.collection(imagesCollectionName);

    console.log(`Storing document in MongoDB for email: ${email}, field: ${inputKey}`);

    const updateQuery = {
      email: email,
    };

    const updateData = {
      $set: {
        [`${inputKey}`]: {
          google_play_url: googlePlayUrl,
          apple_app_url: appleAppUrl,
          google_app_name: googleAppName,
          apple_app_name: appleAppName,
          category: category,
          icon_url: iconUrl,
          scraped_images: imageUrls.map((imageUrl) => ({
            image_url: imageUrl,
            extracted_image_url: null, // To be updated later when the background is removed
          })),
        },
      },
    };

    const options = { upsert: true }; // Insert a new document if no matching document is found
    const updateResult = await imagesCollection.updateOne(updateQuery, updateData, options);

    if (updateResult.upsertedCount > 0) {
      console.log(`Inserted new document for email: ${email}, field: ${inputKey}`);
    } else if (updateResult.modifiedCount > 0) {
      console.log(`Updated existing document for email: ${email}, field: ${inputKey}`);
    } else {
      console.log(`No document inserted or updated for email: ${email}, field: ${inputKey}`);
    }
  } catch (error) {
    console.error(`Error storing URL in MongoDB for email: ${email}, field: ${inputKey}: ${error.message}`);
    throw error;
  }
}

// Function to scrape image URLs from the Google Play Store
async function scrapeAndStoreImageUrls(email, googlePlayUrl, appleAppUrl) {
  try {
    console.log(`Fetching page from Google Play URL: ${googlePlayUrl}`);
    const response = await fetch(googlePlayUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Extracting Icon, Screenshot URLs & Category ...');

    // Extract the icon image URL
    let iconUrl = $('img[alt="Icon image"]').attr('src');
    if (iconUrl) {
      iconUrl = iconUrl.startsWith('//') ? 'https:' + iconUrl : iconUrl;
      console.log(`Found icon URL: ${iconUrl}`);
    } else {
      console.log('No icon image found.');
    }

    // Extract screenshot image URLs
    const imageUrls = [];
    $('img[alt="Screenshot image"]').each((i, elem) => {
      let imageUrl = $(elem).attr('src') || $(elem).attr('data-src');

      if (imageUrl) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl; // Ensure URL is absolute
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://play.google.com' + imageUrl;
        }
        imageUrls.push(imageUrl);
        console.log(`Found image URL: ${imageUrl}`);
      }
    });

    if (imageUrls.length === 0) {
      console.log('No screenshot images found.');
      return;
    }

    console.log(`Found ${imageUrls.length} screenshot URLs. Now storing in MongoDB...`);

    // Extract the category from the Google Play Store page dynamically
    const categoryElement = $('[itemprop="genre"] span');
    const category = categoryElement.length ? categoryElement.text().trim() : "Unknown";
    console.log(`Extracted category: ${category}`);

    // Extract Google App Name
    const googleAppName = extractGoogleAppName(googlePlayUrl);
    if (!googleAppName) {
      console.error('Error: Unable to extract Google app name.');
      return;
    }

    // Extract Apple App Name
    const appleAppName = extractAppleAppName(appleAppUrl);
    if (!appleAppName) {
      console.error('Error: Unable to extract Apple app name.');
      return;
    }

    // Modify input key to replace dots in app name with underscores
    const sanitizedGoogleAppName = googleAppName.replace(/\./g, '_');
    const inputKey = `${sanitizedGoogleAppName}`;

    // Store scraped image URLs and other details in MongoDB
    await storeImageUrlInMongoDB(email, inputKey, googlePlayUrl, appleAppUrl, googleAppName, appleAppName, iconUrl, imageUrls, category);

    console.log(`Successfully stored URLs in MongoDB for email: ${email}, field: ${inputKey}`);

    // Call processImages to remove backgrounds after storing the URLs in MongoDB
    console.log('Starting background removal process...');
    await processImages();

  } catch (error) {
    console.error(`Error during scraping or storing process for email: ${email}: ${error.message}`);
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
  const match = url.match(/\/app\/([^/]+)\/id(\d+)/);
  const appleAppName = match ? match[1] : null;
  console.log(`Extracted Apple app name: ${appleAppName}`);
  return appleAppName;
}

export { scrapeAndStoreImageUrls };
