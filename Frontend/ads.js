document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");

    // Attach the event listener to the GetCreativesBtn after the DOM is fully loaded
    const getCreativesButton = document.getElementById("getCreativesBtn");
    if (getCreativesButton) {
        console.log("GetCreativesBtn found, attaching event listener");
        getCreativesButton.addEventListener("click", onGetCreativesHandler);
    } else {
        console.error("GetCreativesBtn not found");
    }
});

const BASE_URL = 'https://ad-generation.onrender.com';

// Function for Get Creatives Button
async function onGetCreativesHandler(event) {
    event.preventDefault();
    console.log("Inside function onGetCreativesHandler");

    const loader = document.getElementById("loader");
    if (loader) {
        loader.classList.remove("hidden");
        loader.classList.add('flex');
    }

    const googlePlayURL = document.getElementById("google-play-url").value;
    const appleAppURL = document.getElementById("apple-app-url").value;
    const email = localStorage.getItem('userEmail');

    if (!googlePlayURL || !email) {
        alert("Please provide both Google Play Store URL and Email.");
        console.error("Google Play Store URL or Email is missing");
        if (loader) loader.classList.add("hidden");
        return;
    }

    try {
        const scrapeRequestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email,
                google_play: googlePlayURL,
                apple_app: appleAppURL,
            })
        };

        const creativeRequestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email,
                google_play: googlePlayURL,
            })
        };

        // Step 1: Call /scrape API
        const scrapeRequestUrl = `${BASE_URL}/scrape`;
        const scrapeResponse = await fetch(scrapeRequestUrl, scrapeRequestOptions);

        if (!scrapeResponse.ok) {
            const errorText = await scrapeResponse.text();
            throw new Error(`Error scraping data: ${errorText}`);
        }

        console.log("Scrape completed successfully.");

        // Step 2: Trigger creative generation
        const creativesRequestUrl = `${BASE_URL}/oneSixty`;
        const creativeResponse = await fetch(creativesRequestUrl, creativeRequestOptions);

        if (!creativeResponse.ok) {
            const errorText = await creativeResponse.text();
            throw new Error(`Error generating creatives: ${errorText}`);
        }

        const responseData = await creativeResponse.json();
        if (responseData.redirectUrl) {
            console.log("Creatives generated, redirecting...");
            window.location.href = responseData.redirectUrl; // Redirection logic
        } else {
            console.error("No redirectUrl found in response.");
        }

        console.log("Creatives generated successfully.");
    } catch (error) {
        console.error("Error generating creatives:", error);
        alert("An error occurred while generating creatives. Please try again.");
    } finally {
        if (loader) {
            loader.classList.add("hidden");
        }
    }
}
