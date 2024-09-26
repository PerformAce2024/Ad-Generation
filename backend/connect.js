import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { connectToMongo } from './db.js';
import { processImages } from './remove-bg.js';
import 'dotenv/config';

const dbName = 'Images';
const imagesCollectionName = 'URLs';

let client;

// Function to store image URLs in MongoDB
async function storeImageUrlInMongoDB(imageUrl, iconUrl, googlePlayUrl, appleAppUrl) {
  try {
    client = await connectToMongo();
    const db = client.db(dbName);
    const imagesCollection = db.collection(imagesCollectionName);

    console.log(`Storing document in MongoDB: image_url=${imageUrl}, icon_url=${iconUrl}, google_play_url=${googlePlayUrl}, apple_app_url=${appleAppUrl}`);

    await imagesCollection.insertOne({
      image_url: imageUrl,
      icon_url: iconUrl,
      google_play_url: googlePlayUrl,
      apple_app_url: appleAppUrl,
    });

    console.log(`Successfully stored: image_url=${imageUrl}, icon_url=${iconUrl}`);
  } catch (error) {
    console.error(`Error storing URL in MongoDB: ${error.message}`);
    throw error;
  }
}

// Function to scrape image URLs from the Google Play Store and store them in MongoDB
async function scrapeAndStoreImageUrls(email, playStoreUrl, appleAppURL) {
  try {
    console.log(`Fetching page from ${playStoreUrl}...`);
    const response = await fetch(playStoreUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Extracting image URLs...');

    // Extract the icon image URL
    let iconUrl = $('img[alt="Icon image"]').attr('src');
    if (iconUrl) {
      iconUrl = iconUrl.startsWith('//') ? 'https:' + iconUrl : iconUrl;
      console.log(`Found icon URL: ${iconUrl}`);
    } else {
      console.log('No icon image found.');
    }

    // Extract screenshot image URLs (limit to first 10 images)
    const imageUrls = [];
    $('img[alt="Screenshot image"]').each((i, elem) => {
      if (i < 10) { // Limit to 10 images
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
      }
    });

    if (imageUrls.length === 0) {
      console.log('No screenshot images found.');
      return;
    }

    console.log(`Found ${imageUrls.length} screenshot URLs (limited to <=10). Now storing in MongoDB...`);

    // Call processImages from remove-bg.js after successfully storing URLs in MongoDB
    console.log('Starting background removal process...');
    await processImages(email); // Trigger background removal process

  } catch (error) {
    console.error(`Error during scraping or storing process: ${error.message}`);
  } finally {
    if (client) {
      console.log('Closing MongoDB connection...');
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

export { scrapeAndStoreImageUrls };
