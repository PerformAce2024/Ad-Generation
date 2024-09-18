document.addEventListener("DOMContentLoaded", (event) => {
    event.preventDefault();
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

    const loader = document.getElementById("loader");
    if (loader) {
        loader.classList.remove("hidden");
        loader.classList.add('flex');
    }

    const googlePlayURL = document.getElementById("google-play-url").value;
    const appleAppURL = document.getElementById("apple-app-url").value;
    const email = localStorage.getItem('loggedInUserId'); 

    if (!googlePlayURL || !email) {
        alert("Please provide both Google Play Store URL and Email.");
        console.error("Google Play Store URL or Email is missing");
        if (loader) loader.classList.add("hidden");
        return;
    }

    const requestBody = JSON.stringify({
        email: email,
        google_play: googlePlayURL,
        apple_app: appleAppURL,
    });

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
    };

    try {
        // Step 1: Call /scrape API
        const scrapeRequestUrl = `${BASE_URL}/scrape`;
        const scrapeResponse = await fetch(scrapeRequestUrl, requestOptions);

        if (!scrapeResponse.ok) {
            const errorText = await scrapeResponse.text();
            throw new Error(`Error scraping data: ${errorText}`);
        }

        console.log("Scrape completed successfully.");

        // Step 2: Call /oneSixty API to generate creatives
        const creativesRequestUrl = `${BASE_URL}/oneSixty`;
        const creativeResponse = await fetch(creativesRequestUrl, requestOptions);

        if (!creativeResponse.ok) {
            const errorText = await creativeResponse.text();
            throw new Error(`Error generating creatives: ${errorText}`);
        }

        const savedImageUrls = await creativeResponse.json();
        console.log("Creatives received from server:", savedImageUrls);

        // Step 3: Display creatives on the page
        displayCreatives(savedImageUrls);

    } catch (error) {
        console.error("Error generating creatives:", error);
        alert("An error occurred while generating creatives. Please try again.");
    } finally {
        if (loader) {
            loader.classList.add("hidden");
        }
    }
}

// Function to display creatives
function displayCreatives(imageUrls) {
    const container = document.getElementById("creatives-container");
    if (!container) {
        console.error("Creatives container not found.");
        return;
    }

    container.innerHTML = ""; // Clear previous content

    if (imageUrls.length === 0) {
        container.innerHTML = "<p>No creatives available.</p>";
        return;
    }

    // Loop over image URLs and create image elements
    imageUrls.forEach((url, index) => {
        const creativeDiv = document.createElement("div");
        creativeDiv.className = "bg-white shadow-xl rounded-lg overflow-hidden";
        creativeDiv.innerHTML = `
            <img src="${BASE_URL}${url}" alt="Creative ${index + 1}" class="w-full">
            <div class="p-4">
                <p class="text-lg font-semibold">Creative ${index + 1}</p>
                <p class="text-sm text-gray-500">Generated Ad Creative</p>
            </div>
        `;
        container.appendChild(creativeDiv);
    });
}
