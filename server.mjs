const axios = require('axios');
const gplay = require('google-play-scraper');

// Function to extract app ID from the Apple App Store URL
function extractAppleAppId(url) {
    const match = url.match(/id(\d+)/);
    return match ? match[1] : null;
}

// Function to extract app ID from the Google Play Store URL
function extractGooglePlayAppId(url) {
    const match = url.match(/id=([a-zA-Z0-9._]+)/);
    return match ? match[1] : null;
}

// Scrape reviews from Google Play Store
async function scrapeGooglePlayReviews(url) {
    const appId = extractGooglePlayAppId(url);
    if (!appId) {
        throw new Error('Invalid Google Play Store URL');
    }

    try {
        const reviews = await gplay.reviews({
            appId: appId,
            lang: 'en', // Language (optional)
            country: 'in', // Country (optional)
            sort: gplay.sort.NEWEST // Sort by newest
        });
        return reviews.slice(0, 50);
    } catch (error) {
        console.error('Error fetching Google Play Store reviews:', error);
        return [];
    }
}

// Scrape reviews from Apple App Store
async function scrapeAppleStoreReviews(url) {
    const appId = extractAppleAppId(url);
    if (!appId) {
        throw new Error('Invalid Apple App Store URL');
    }

    const apiUrl = `https://itunes.apple.com/in/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
    try {
        const response = await axios.get(apiUrl);
        const reviews = response.data.feed.entry.map(entry => ({
            author: entry.author.name.label,
            title: entry.title.label,
            review: entry.content.label,
            rating: entry['im:rating'].label
        }));
        return reviews.slice(0, 50);
    } catch (error) {
        console.error('Error fetching Apple Store reviews:', error);
        return [];
    }
}

// Format reviews for display
function formatReviews(reviews, platform) {
    return reviews.map(review => {
        if (platform === 'Google Play') {
            return review.text || ''; // Ensure you match the actual property from the API
        } else if (platform === 'Apple Store') {
            return review.review || ''; // Ensure you match the actual property from the API
        }
    });
}

// Print reviews in a formatted table
function printReviewsTable(reviews, platform) {
    if (!reviews.length) {
        console.log(`No reviews found for ${platform}.`);
        return;
    }

    const formattedReviews = formatReviews(reviews, platform);
    console.log(`\n${platform} Reviews:`);
    formattedReviews.forEach(review => {
        console.log(`${review}\n`);
    });
}

// Main execution
async function main() {
    const googlePlayAppUrl = 'https://play.google.com/store/apps/details?id=zolve.credit.card.us&hl=en'; // Replace with the actual Google Play app URL
    const appleAppUrl = 'https://apps.apple.com/in/app/zolve-global-banking/id1574344423'; // Replace with the actual Apple App Store app URL

    try {
        // Google Play Store
        const googlePlayReviews = await scrapeGooglePlayReviews(googlePlayAppUrl);
        console.log('GOOGLE Reviews -');
        printReviewsTable(googlePlayReviews, 'Google Play');

        // Apple App Store
        const appleStoreReviews = await scrapeAppleStoreReviews(appleAppUrl);
        console.log('APPLE Reviews !');
        printReviewsTable(appleStoreReviews, 'Apple Store');
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

main();
