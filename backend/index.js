import express from "express";
import cors from "cors";
import axios from "axios";
import gplay from "google-play-scraper";
import path from "path";
import sendEmail from './sendEmail.js';
import { fileURLToPath } from "url";
import { connectToMongo } from './db.js';
import { savePhraseToDatabase } from './storeCommunications.js';
import { scrapeAndStoreImageUrls } from './connect.js';
import { createAdsForAllImages } from './oneSixty.js';
import 'dotenv/config';

const app = express();
app.use(express.json());

console.log('Initializing server...');

// CORS configuration
const allowedOrigins = ['https://www.growthz.ai'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin); // Set allowed origin dynamically
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specified methods
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // Allow specified headers

  // Handle preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  next();
});

console.log('CORS enabled for https://www.growthz.ai');

// Derive __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('__dirname set to:', __dirname);

// Serve static files from the Frontend directory
app.use(express.static(path.join(__dirname, "..", "Frontend")));
console.log('Serving static files from the Frontend directory');

// Function to extract app ID from the Apple App Store URL
function extractAppleAppId(url) {
  const match = url.match(/\/app\/([^/]+)\/id(\d+)/);
  const appId = match ? match[1] : null;
  console.log('Extracted Apple app name: ', appId);
  return appId;
}

// Function to extract app ID from the Google Play Store URL
function extractGooglePlayAppId(url) {
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  const appId = match ? match[1] : null;
  console.log('Extracted Google Play App ID:', appId);
  return appId;
}

// Function to extract the app name from the Google Play URL
async function getAppNameFromGooglePlay(url) {
  const appId = extractGooglePlayAppId(url);
  if (!appId) {
    console.error('Invalid Google Play URL');
    return null;
  }

  try {
    const appDetails = await gplay.app({ appId });
    console.log('App Name:', appDetails.title);
    return appDetails.title;
  } catch (error) {
    console.error('Error fetching app details:', error);
    return null;
  }
}

// Scrape Google Play Store reviews
async function scrapeGooglePlayReviews(url) {
  const appId = extractGooglePlayAppId(url);
  if (!appId) {
    console.error('Error: Invalid Google Play Store URL');
    throw new Error("Invalid Google Play Store URL");
  }

  try {
    console.log('Fetching Google Play reviews for App ID:', appId);
    const reviews = await gplay.reviews({
      appId: appId,
      lang: "en",
      country: "in",
      sort: gplay.sort.NEWEST,
    });

    console.log(`Fetched ${reviews.data.length} reviews from Google Play Store`);
    return reviews.data.slice(0, 50);
  } catch (error) {
    console.error("Error fetching Google Play Store reviews:", error);
    return [];
  }
}

// Scrape Apple App Store reviews
async function scrapeAppleStoreReviews(url) {
  const appId = extractAppleAppId(url);
  if (!appId) {
    console.error('Error: Invalid Apple App Store URL');
    throw new Error("Invalid Apple App Store URL");
  }

  const apiUrl = `https://itunes.apple.com/in/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
  try {
    console.log('Fetching Apple App Store reviews for App ID:', appId);
    const response = await axios.get(apiUrl);
    const reviews = response.data.feed.entry.map((entry) => ({
      author: entry.author.name.label,
      title: entry.title.label,
      review: entry.content.label,
      rating: entry["im:rating"].label,
    }));

    console.log(`Fetched ${reviews.length} reviews from Apple App Store`);
    return reviews.slice(0, 50);
  } catch (error) {
    console.error("Error fetching Apple Store reviews:", error);
    return [];
  }
}

// Combine and format reviews into a single string for the prompt
function combineReviews(googleReviews, appleReviews) {
  console.log('Combining reviews from Google Play and Apple App Store');
  const googleReviewsText = googleReviews.map((review) => review.text || "").join(" ");
  const appleReviewsText = appleReviews.map((review) => review.text || "").join(" ");
  return `${googleReviewsText}\n${appleReviewsText}`;
}

// Generate USP phrases using Gemini API
async function generateUSPhrases(appName, reviews) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `What can be the 20 most efficient USP marketing headlines for ads for ${appName}? Focus only on providing the phrases category and phrases, related to the brand's main USP. Ensure there are no extra lines, tips, notes, or commentary—just the 20 headlines with its respective categories. Here's the context from the reviews:\n\n${reviews}`;

  try {
    console.log('Sending prompt to Gemini API to generate USP phrases');
    const response = await axios.post(
      apiUrl,
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    // Extract and print phrases
    const phrases = response.data.candidates[0].content.parts[0].text
      .trim()
      .split("\n")
      .filter((phrase) => phrase.trim() !== "");

    console.log('Generated USP phrases:', phrases);
    return phrases;
  } catch (error) {
    console.error("Error generating USP phrases:", error);
    return [];
  }
}

// Root endpoint
app.get("/", (req, res) => {
  console.log('Root endpoint accessed');
  res.sendFile(path.join(__dirname, "..", "Frontend", "index.html"));
});

// Endpoint to generate USP phrases
app.post("/generate-phrases", async (req, res) => {
  const { google_play, apple_app } = req.body;

  if (!google_play) {
    console.error('Error: Google Play Store URL is mandatory');
    return res.status(400).send("Google Play Store URL is mandatory");
  }

  try {
    console.log('Processing /generate-phrases request...');

    // Get the app name from Google Play
    const appName = await getAppNameFromGooglePlay(google_play);
    if (!appName) {
      return res.status(400).send("Unable to extract app name from Google Play URL.");
    }

    // Scrape reviews from both sources
    const googlePlayReviews = await scrapeGooglePlayReviews(google_play);
    const appleStoreReviews = apple_app ? await scrapeAppleStoreReviews(apple_app) : [];

    // Combine and format reviews for prompt
    const combinedReviews = combineReviews(googlePlayReviews, appleStoreReviews);

    // Generate USP phrases
    const uspPhrases = await generateUSPhrases(appName, combinedReviews);

    console.log('Sending USP phrases as response');

    // Send response with phrases
    return res.status(200).json(uspPhrases);
  } catch (error) {
    console.error("Error generating USP phrases:", error);
    return res.status(500).json({ message: "Error generating USP phrases. Possible issue with external API or data formatting.", error: error.message });
  }
});

// Route to save approved phrases
app.post("/approved", async (req, res) => {
  const { phrase, email } = req.body;
  if (!phrase || !email) {
    console.error('Error: Phrase and email are required');
    return res.status(400).send("Phrase and email are required.");
  }

  try {
    console.log(`Saving approved phrase for ${email}`);
    await savePhraseToDatabase("approvedCommunication", email, phrase);
    return res.status(200).send("Approved phrase saved successfully.");
  } catch (error) {
    console.error("Error saving approved phrase:", error);
    return res.status(500).json({ message: "Error saving approved phrase.", error: error.message });
  }
});

// Route to save rejected phrases
app.post("/rejected", async (req, res) => {
  const { phrase, email } = req.body;
  if (!phrase || !email) {
    console.error('Error: Phrase and email are required');
    return res.status(400).send("Phrase and email are required.");
  }
  try {
    console.log(`Saving rejected phrase for ${email}`);
    await savePhraseToDatabase("rejectedCommunication", email, phrase);
    return res.status(200).send("Rejected phrase saved successfully.");
  } catch (error) {
    console.error("Error saving rejected phrase:", error);
    return res.status(500).json({ message: "Error saving rejecting phrase.", error: error.message });
  }
});

// Route to trigger scraping and storing
app.post('/scrape', async (req, res) => {
  const { email, google_play, apple_app } = req.body;

  if (!google_play) {
    return res.status(400).send('Google Play Store URL is required');
  }

  try {
    console.log(`Scraping started for ${google_play} and ${apple_app}`);
    await scrapeAndStoreImageUrls(email, google_play, apple_app);  // Assuming scrapeAndStoreImageUrls is already defined
    return res.status(200).send('Scraping, storing, and background removal process completed.');
  } catch (error) {
    console.error('Error during scraping or background removal process:', error);
    return res.status(500).json({ message: "Error occurred during scraping and background removal.", error: error.message });
  }
});

// Route to generate creatives and save them as files
app.post('/oneSixty', async (req, res) => {
  const { email, google_play } = req.body;

  if (!email || !google_play) {
    return res.status(400).json({ message: 'Email and Google Play URL are required' });
  }

  const googleAppName = extractGooglePlayAppId(google_play);

  // Modify input key to replace dots in app name with underscores
  const sanitizedGoogleAppName = googleAppName.replace(/\./g, '_');
  const key = `${sanitizedGoogleAppName}`;

  console.log('Using key for fetching images - index.js:', key);

  try {
    console.log('Generating creatives...');
    const adImages = await createAdsForAllImages({ email, key });

    if (!adImages) {
      return res.status(500).json({ message: 'No creatives generated. Possible issue during creative generation.' });
    }

    // Send a success response with a signal to show the button
    return res.status(200).json({ showCreativesButton: true });
  } catch (error) {
    console.error('Error generating creatives:', error);
    return res.status(500).json({ message: 'Error generating creatives.', error: error.message });
  }
});

// Route to get creatives URLs from MongoDB
app.post('/getCreatives', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required to fetch creatives' });
  }

  try {
    const client = await connectToMongo();
    const db = client.db('Images');
    const urlsCollection = db.collection('Creatives');

    const document = await urlsCollection.findOne({ email });

    if (!document || !document.creativeUrls || document.creativeUrls.length === 0) {
      return res.status(404).json({ message: 'No creatives found for this email' });
    }

    return res.status(200).json({ urls: document.creativeUrls });
  } catch (error) {
    console.error('Error fetching creatives from MongoDB:', error);
    return res.status(500).json({ message: 'Error fetching creatives' });
  }
});

// Add your email sending route here
app.post('/api/send-email', sendEmail);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
