document.addEventListener("DOMContentLoaded", async () => {
    const BASE_URL = 'https://ad-generation.onrender.com'; // Update this to match your backend URL

    async function fetchCreatives() {
        try {
            const response = await fetch(`${BASE_URL}/creatives`);
            if (!response.ok) {
                throw new Error("Failed to fetch creatives.");
            }
            const creatives = await response.json();
            displayCreatives(creatives);
        } catch (error) {
            console.error("Error fetching creatives:", error);
            document.getElementById("creatives-container").innerHTML = "Failed to load creatives.";
        }
    }

    function displayCreatives(creatives) {
        const container = document.getElementById("creatives-container");
        if (!container) {
            console.error("Creatives container not found.");
            return;
        }

        if (creatives.length === 0) {
            container.innerHTML = "<p>No creatives available.</p>";
            return;
        }

        container.innerHTML = ""; // Clear previous content
        creatives.forEach((creative) => {
            const creativeDiv = document.createElement("div");
            creativeDiv.className = "bg-white shadow-lg rounded-lg overflow-hidden";
            creativeDiv.innerHTML = `
          <img src="${creative.url}" alt="Creative ${creative.name}" class="w-full">
          <div class="p-4">
            <p class="text-lg font-semibold">${creative.name}</p>
            <p class="text-sm text-gray-500">${creative.description}</p>
          </div>
        `;
            container.appendChild(creativeDiv);
        });
    }

    // Fetch and display the creatives on page load
    await fetchCreatives();
});

<script>

<h1>Your Generated Creatives</h1>
    <div id="creativesContainer"></div>
            try {
                const response = await fetch('/api/creatives');
    const creatives = await response.json();

    const creativesContainer = document.getElementById('creativesContainer');

                creatives.forEach(creative => {
                    const creativeDiv = document.createElement('div');
    creativeDiv.classList.add('creative-item');

    // Display creative image
    const creativeImage = document.createElement('img');
    creativeImage.src = creative.extracted_url;  // URL from S3
    creativeImage.alt = 'Generated Creative';

    // Display phrases
    const phraseList = document.createElement('ul');
                    creative.phrases.forEach(phrase => {
                        const phraseItem = document.createElement('li');
    phraseItem.innerText = phrase;
    phraseList.appendChild(phraseItem);
                    });

    // Append everything to creative div
    creativeDiv.appendChild(creativeImage);
    creativeDiv.appendChild(phraseList);

    creativesContainer.appendChild(creativeDiv);
                });
            } catch (error) {
        console.error('Error fetching creatives:', error);
            }
    )

    // Fetch creatives when the page loads
    window.onload = fetchCreatives;
</script>
