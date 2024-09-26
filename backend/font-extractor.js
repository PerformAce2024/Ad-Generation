import puppeteer from "puppeteer";

// Helper function to extract the app ID from the Google Play URL
function extractAppId(googlePlayUrl) {
  const match = googlePlayUrl.match(/id=([a-zA-Z0-9._]+)/);
  if (match && match[1]) {
    return match[1]; // Returns the app ID like 'zolve.credit.card.us'
  } else {
    console.error('Invalid Google Play URL format.');
    return null;
  }
}

// Helper function to extract the base URL (protocol + domain) from any URL
function extractBaseUrl(privacyPolicyUrl) {
  try {
    const urlObj = new URL(privacyPolicyUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`; // Extracting the protocol and host (domain)
    console.log(`Extracted base URL: ${baseUrl}`);
    return baseUrl;
  } catch (error) {
    console.error(`Invalid URL provided: ${privacyPolicyUrl}`, error);
    return null;
  }
}

async function extractFontDetails(googlePlayUrl) {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  console.log('New page created in Puppeteer.');

  // Extract the app ID from the Google Play URL
  const appId = extractAppId(googlePlayUrl);
  if (!appId) {
    await browser.close();
    return null;
  }

  // Generate the "See Details" (data safety) URL
  const seeDetailsUrl = `https://play.google.com/store/apps/datasafety?id=${appId}`;
  console.log(`Generated See Details URL: ${seeDetailsUrl}`);

  // Navigate to the "See Details" page
  try {
    console.log(`Navigating to See Details URL: ${seeDetailsUrl}`);
    await page.goto(seeDetailsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('See Details page loaded successfully.');
  } catch (error) {
    console.error(`Failed to load See Details URL: ${seeDetailsUrl}`, error);
    await browser.close();
    return null;
  }

  // Try to find the Privacy Policy URL on the See Details page
  try {
    // Wait for the privacy policy link to be available
    await page.waitForSelector('a[href*="privacy-policy"]', { visible: true, timeout: 60000 });
    console.log('Privacy policy link found.');

    // Extract the Privacy Policy URL
    const privacyPolicyUrl = await page.evaluate(() => {
      const privacyLinkElement = document.querySelector('a[href*="privacy-policy"]');
      return privacyLinkElement ? privacyLinkElement.href : null;
    });

    if (!privacyPolicyUrl) {
      console.error('Failed to find the Privacy Policy URL.');
      await browser.close();
      return null;
    }

    // Extract the base URL (protocol + domain)
    const baseUrl = extractBaseUrl(privacyPolicyUrl);
    if (!baseUrl) {
      await browser.close();
      return null;
    }

    // Navigate to the base URL
    console.log(`Navigating to the app's website: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('App website loaded successfully.');

    // Extract font details from the app's website
    console.log('Attempting to extract font details from the app website...');
    const fontDetails = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) {
        const computedStyle = window.getComputedStyle(h1);
        return {
          fontFamily: computedStyle.fontFamily || 'Times New Roman',
        };
      }
      return null;
    });

    if (fontDetails) {
      console.log(`Extracted font details: ${JSON.stringify(fontDetails)}`);
    } else {
      console.warn('No font details found on the app website.');
    }

    await browser.close();
    console.log('Browser closed.');
    return fontDetails;

  } catch (error) {
    console.error('An error occurred during font extraction:', error);
    await browser.close();
    return null;
  }
}

export { extractFontDetails };
