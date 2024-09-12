import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

// Resolve __dirname for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to extract the app name from the Google Play URL
function extractAppNameFromGooglePlayUrl(googlePlayUrl) {
  const match = googlePlayUrl.match(/id=([a-zA-Z0-9._]+)/);
  if (match && match[1]) {
    const appName = match[1].split('.').pop();  // Extract last part, e.g., 'zomato'
    console.log('Extracted app name from Google Play URL:', appName);
    return appName;
  } else {
    console.error('Invalid Google Play URL format.');
    return null;
  }
}

// Function to extract font details from the dynamically constructed website
async function extractFontDetails(googlePlayUrl) {

  let browser;

  try {
    console.log('Starting font extraction process...');

    // Extract the app name from the Google Play URL
    const appName = extractAppNameFromGooglePlayUrl(googlePlayUrl);
    if (!appName) {
      console.error('Failed to extract the app name.');
      return null;
    }

    // Construct the website URL based on the app name
    const websiteUrl = `https://www.${appName}.com`;
    console.log('Website URL constructed:', websiteUrl);

    // Launch browser with Playwright
    console.log('Launching browser...');
    const browser = await chromium.launch({
      headless: true, // Set to true if you don't want the browser UI
    });

    // Open a new page
    const page = await browser.newPage();
    console.log('New page created in the browser.');

    // Navigate to the dynamically constructed website URL
    console.log(`Navigating to ${websiteUrl}...`);
    const response = await page.goto(websiteUrl);

    // Check if the page was successfully loaded
    if (response.status() !== 200) {
      console.error(`Failed to load page: ${response.status()}`);
      return null;
    }

    await page.waitForLoadState('networkidle');
    console.log('Page loaded successfully, waiting for network to be idle.');

    // Select the h1 element to extract font details
    const h1Element = await page.$('h1');
    if (!h1Element) {
      console.error('h1 element not found on the page.');
      return null;
    }

    console.log('h1 element found, extracting font details...');

    // Extract font details
    const fontDetails = await page.evaluate(element => {
      const computedStyle = window.getComputedStyle(element);
      return {
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight
      };
    }, h1Element);

    console.log('Font details extracted:', fontDetails);

    return fontDetails;
  } catch (error) {
    console.error('Error during font extraction process:', error);
    return null;
  } finally {
    // Ensure the browser is closed even if an error occurs
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

export { extractFontDetails };
