import puppeteer from "puppeteer";

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

  // Navigate to the Google Play URL
  try {
    console.log(`Navigating to Google Play URL: ${googlePlayUrl}`);
    await page.goto(googlePlayUrl, { waitUntil: 'networkidle2' });
    console.log('Google Play Store page loaded successfully.');
  } catch (error) {
    console.error(`Failed to load Google Play URL: ${googlePlayUrl}`, error);
    await browser.close();
    return null;
  }

  try {
    // Scroll down to ensure the 'See Details' button is in the viewport
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight); // Scroll down by one viewport height
    });

    // Click on the "See Details" button
    console.log('Looking for the "See Details" button...');
    await page.waitForSelector('a.WpHeLc.VfPpkd-mRLv6.VfPpkd-RLmnJb', { visible: true });
    await page.click('a.WpHeLc.VfPpkd-mRLv6.VfPpkd-RLmnJb');
    console.log('"See Details" button clicked successfully.');

    // Wait for the privacy policy link to be available
    await page.waitForSelector('div.viuTPb a.GO2pB', { visible: true });

    // Extract the Privacy Policy URL
    const privacyPolicyUrl = await page.evaluate(() => {
      const privacyLinkElement = document.querySelector('div.viuTPb a.GO2pB');
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
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    console.log('App website loaded successfully.');

    // Extract font details from the app's website
    console.log('Attempting to extract font details from the app website...');
    const fontDetails = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) {
        const computedStyle = window.getComputedStyle(h1);
        return {
          fontFamily: computedStyle.fontFamily,
          fontSize: computedStyle.fontSize
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
