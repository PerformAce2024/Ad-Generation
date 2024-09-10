import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { MongoClient } from 'mongodb';
import { processImages } from './remove-bg.js';
import 'dotenv/config';

// MongoDB configuration
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const dbName = 'Images';
const imagesCollectionName = 'URLs';

// Function to store image URLs in MongoDB
async function storeImageUrlInMongoDB(imageUrl, iconUrl, googlePlayUrl, appleAppUrl) {
  try {
    // Ensure the client is connected before performing any operations
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }

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
async function scrapeAndStoreImageUrls(playStoreUrl, appleAppURL) {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB.');

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

    console.log(`Found ${imageUrls.length} image URLs. Storing URLs in MongoDB...`);

    // Store each screenshot image along with the icon URL and app URLs in MongoDB
    for (const imageUrl of imageUrls) {
      await storeImageUrlInMongoDB(imageUrl, iconUrl, playStoreUrl, appleAppURL);
    }

    console.log('All URLs have been successfully stored in MongoDB.');

    // Call processImages from remove-bg.js after successfully storing URLs in MongoDB
    console.log('Starting background removal process...');
    await processImages(); // Trigger background removal process

  } catch (error) {
    console.error(`Error during scraping or storing process: ${error.message}`);
  } finally {
    console.log('Closing MongoDB connection...');
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

export { scrapeAndStoreImageUrls };
