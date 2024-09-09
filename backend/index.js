import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import axios from "axios";
import gplay from "google-play-scraper";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

console.log('Initializing server...');

// app.use(cors()); // Temporarily allow all origins during development
app.use(cors({
  origin: "https://www.growthz.ai" // Replace with your actual Vercel frontend domain
}));

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
  const match = url.match(/id(\d+)/);
  const appId = match ? match[1] : null;
  console.log('Extracted Apple App ID:', appId);
  return appId;
}

// Function to extract app ID from the Google Play Store URL
function extractGooglePlayAppId(url) {
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  const appId = match ? match[1] : null;
  console.log('Extracted Google Play App ID:', appId);
  return appId;
}

// Scrape Google Play Store reviews
async function scrapeGooglePlayReviews(url) {
  const appId = extractGooglePlayAppId(url);
  if (!appId) {
    console.error('Error: Invalid Google Play Store URL', error);
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
    console.error('Error: Invalid Apple App Store URL', error);
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
  const googleReviewsText = googleReviews
    .map((review) => review.text || "")
    .join(" ");
  const appleReviewsText = appleReviews
    .map((review) => review.review || "")
    .join(" ");
  return `${googleReviewsText}\n${appleReviewsText}`;
}

// Generate USP phrases using Gemini API
async function generateUSPhrases(reviews) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `What can be the potential usp marketing headlines for ADs? Provide 20 most efficient phrases. Focus on main usp of brand.\n\n${reviews}`;

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
    console.error('Error: Google Play Store URL is mandatory', error);
    return res.status(400).send("Google Play Store URL is mandatory");
  }

  try {
    console.log('Processing /generate-phrases request...');
    // Scrape reviews from both sources
    const googlePlayReviews = await scrapeGooglePlayReviews(google_play);
    const appleStoreReviews = apple_app ? await scrapeAppleStoreReviews(apple_app) : [];

    // Combine and format reviews for prompt
    const combinedReviews = combineReviews(googlePlayReviews, appleStoreReviews);

    // Generate USP phrases
    const uspPhrases = await generateUSPhrases(combinedReviews);

    console.log('Sending USP phrases as response');

    // Send response with phrases
    res.status(200).json(uspPhrases);
  } catch (error) {
    console.error("Error generating USP phrases:", error);
    res.status(500).send("Error generating USP phrases");
  }
});

// Route to save approved phrases
app.post("/approved", async (req, res) => {
  const { phrase, email } = req.body;
  if (!phrase || !email) {
    console.error('Error: Phrase and email are required', error);
    return res.status(400).send("Phrase and email are required.");
  }
  try {
    console.log(`Saving approved phrase for ${email}`);
    await savePhraseToDatabase("approvedCommunication", email, phrase);
    res.status(200).send("Approved phrase saved successfully.");
  } catch (error) {
    console.error("Error saving approved phrase:", error);
    res.status(500).send("Error saving approved phrase.", error);
  }
});

// Route to save rejected phrases
app.post("/rejected", async (req, res) => {
  const { phrase, email } = req.body;
  if (!phrase || !email) {
    console.error('Error: Phrase and email are required', error);
    return res.status(400).send("Phrase and email are required.");
  }
  try {
    console.log(`Saving rejected phrase for ${email}`);
    await savePhraseToDatabase("rejectedCommunication", email, phrase);
    res.status(200).send("Rejected phrase saved successfully.");
  } catch (error) {
    console.error("Error saving rejected phrase:", error);
    res.status(500).send("Error saving rejected phrase.", error);
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});