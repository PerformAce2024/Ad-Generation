import axios from 'axios';
import gplay from 'google-play-scraper';

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

async function scrapeGooglePlayReviews(url) {
    const appId = extractGooglePlayAppId(url);
    if (!appId) {
        throw new Error('Invalid Google Play Store URL');
    }

    const reviews = await gplay.reviews({
        appId: appId,
        lang: 'en', // Language (optional)
        country: 'in', // Country (optional)
        sort: gplay.sort.NEWEST // Sort by newest
    });
    return reviews.data.slice(0, 50);
}

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

function formatReviews(reviews, platform) {
    return reviews.map(review => {
        if (platform === 'Google Play') {
            return review.text || '';
        } else if (platform === 'Apple Store') {
            return review.review || '';
        }
    });
}

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

(async () => {
    // Google Play Store
    const googlePlayAppUrl = 'https://play.google.com/store/apps/details?id=zolve.credit.card.us&hl=en'; // Replace with the actual Google Play app URL
    const googlePlayReviews = await scrapeGooglePlayReviews(googlePlayAppUrl);
    console.log('GOOGLE Reviews -');
    googlePlayReviews.forEach(review => {
        console.log(`${review.text}\n`);
    });

    // Apple App Store
    const appleAppUrl = 'https://apps.apple.com/in/app/zolve-global-banking/id1574344423'; // Replace with the actual Apple App Store app URL
    const appleStoreReviews = await scrapeAppleStoreReviews(appleAppUrl);
    console.log('APPLE Reviews !');
    appleStoreReviews.forEach(review => {
        console.log(`Review: ${review.review}\n`);
    });
})();
