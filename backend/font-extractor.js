import puppeteer from "puppeteer";

// Helper function to extract the app name from Google Play URL
function extractAppNameFromGooglePlayUrl(googlePlayUrl) {
  console.log(`Extracting app name from Google Play URL: ${googlePlayUrl}`);
  
  const match = googlePlayUrl.match(/id=([a-zA-Z0-9._]+)/);
  if (match && match[1]) {
    const appName = match[1].split('.').pop(); // Extract last part, e.g., 'zomato'
    console.log(`Extracted app name: ${appName}`);
    return appName;
  } else {
    console.error('Invalid Google Play URL format.');
    return null;
  }
}

async function extractFontDetails(googlePlayUrl) {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  console.log('New page created in Puppeteer.');

  // Extract the app name from the Google Play URL
  const appName = extractAppNameFromGooglePlayUrl(googlePlayUrl);
  if (!appName) {
    console.error('Failed to extract app name.');
    await browser.close();
    return null;
  }

  // Construct the website URL and navigate to it
  const websiteUrl = `https://www.${appName}.com`;
  console.log(`Navigating to website: ${websiteUrl}`);

  try {
    await page.goto(websiteUrl, { waitUntil: 'networkidle2' });
    console.log('Website loaded successfully.');
  } catch (error) {
    console.error(`Failed to load website: ${websiteUrl}`, error);
    await browser.close();
    return null;
  }

  // Extract font details from the page
  console.log('Attempting to extract font details from the page...');
  const fontDetails = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (h1) {
      console.log('h1 element found on the page.');
      const computedStyle = window.getComputedStyle(h1);
      return {
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize
      };
    } else {
      console.log('No h1 element found on the page.');
      return null;
    }
  });

  if (fontDetails) {
    console.log(`Extracted font details: ${JSON.stringify(fontDetails)}`);
  } else {
    console.warn('No font details found.');
  }

  await browser.close();
  console.log('Browser closed.');

  return fontDetails;
}

export { extractFontDetails };
