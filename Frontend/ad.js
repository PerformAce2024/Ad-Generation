document.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");

  // Attach the event listener to the button after the DOM is fully loaded
  const btn = document.getElementById("AdButton");
  if (btn) {
    console.log("AdButton found, attaching event listener");
    btn.addEventListener("click", onClickHandler);
  } else {
    console.error("AdButton not found");
  }

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

async function onClickHandler() {
  console.log("onClickHandler triggered");

  const googlePlayURL = document.getElementById("google-play-url").value;
  if (!googlePlayURL) {
    alert("Please provide the Google Play Store URL.");
    console.warn("Google Play Store URL is missing");
    return; // Prevent further execution
  }

  const appleAppURL = document.getElementById("apple-app-url").value;
  if (!appleAppURL) {
    console.warn("Apple App Store URL is empty, proceeding with only Google Play URL.");
  }

  const loader = document.getElementById("loader");
  if (loader) {
    console.log("Displaying loader");
    loader.classList.remove("hidden");
    loader.classList.add('flex');
  }

  console.log("Google Play URL:", googlePlayURL);
  console.log("Apple App Store URL:", appleAppURL);

  try {
    console.log("Sending requests to /generate-phrases and /scrape");

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const requestBody = JSON.stringify({
      google_play: googlePlayURL,
      apple_app: appleAppURL,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: requestBody,
      redirect: "follow",
    };

    const phrasesRequestUrl = `${BASE_URL}/generate-phrases`;
    const scrapeRequestUrl = `${BASE_URL}/scrape`;

    // Send both requests in parallel
    const [phrasesResponse, scrapeResponse] = await Promise.all([
      fetch(phrasesRequestUrl, requestOptions),
      fetch(scrapeRequestUrl, requestOptions)
    ]);

    // Handle responses for phrases
    if (!phrasesResponse.ok) {
      const errorText = await phrasesResponse.text();
      console.error(`Error in response from ${phrasesRequestUrl}:`, errorText);
      throw new Error("Network response for phrases was not ok.");
    }

    const phrases = await phrasesResponse.json();
    console.log("Phrases received from the server:", phrases);

    // Handle responses for scrape
    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error(`Error in response from ${scrapeRequestUrl}:`, errorText);
      throw new Error("Network response for scrape was not ok.");
    }

    console.log("Scrape completed successfully.");

    // Hide the loader
    if (loader) {
      console.log("Hiding loader");
      loader.classList.add("hidden");
    }

    if (Array.isArray(phrases) && phrases.length > 0) {
      console.log("Displaying received phrases");
      displayPhrases(phrases);
    } else {
      console.error("No phrases received or available for display");
      document.getElementById("phrases-container").innerHTML = "No phrases available.";
    }
  } catch (error) {
    console.error("Error while fetching phrases:", error);
    if (loader) {
      console.log("Hiding loader due to error");
      loader.classList.add("hidden");
    }
    document.getElementById("phrases-container").innerHTML = "Error retrieving phrases. Please check your connection or try again later.";
  }
}

// Function for Get Creatives Button
async function onGetCreativesHandler() {
  console.log("Get Creatives button clicked");

  const loader = document.getElementById("loader");
  if (loader) {
    console.log("Displaying loader");
    loader.classList.remove("hidden");
    loader.classList.add('flex');
  }

  try {
    console.log("Sending requests to /oneSixty");

    const creativesRequestUrl = `${BASE_URL}/oneSixty`;

    const creativeResponse = await fetch(creativesRequestUrl, { method: 'GET' });

    if (!creativeResponse.ok) {
      const errorText = await creativeResponse.text();
      console.error(`Error in response from ${creativesRequestUrl}:`, errorText);
      throw new Error('Error generating creatives');
    }

    const result = await creativeResponse.text();
    console.log("Creatives received from the server:", result);  // Ensure the backend is responding correctly

    // Hide loader
    if (loader) {
      loader.classList.add("hidden");
    }

    // Redirect to display creatives page after generation
    window.location.href = '/display-creatives.html';
  } catch (error) {
    console.error("Error generating creatives:", error);
    if (loader) {
      loader.classList.add("hidden");
    }
  }
}

function displayPhrases(phrases) {
  console.log("Preparing to display phrases");

  const phrasesContainer = document.getElementById("phrases-list");
  console.log(phrasesContainer);  // Check if this logs null or the correct DOM element
  if (!phrasesContainer) {
    console.error("Phrases container element not found");
    document.getElementById("phrases-container").innerHTML = "Unable to load phrases.";
    return;
  }

  phrasesContainer.innerHTML = ""; // Clear previous phrases

  // Create structure for phrases
  const table = document.createElement("div");
  table.className = "flex flex-col gap-2";

  // Regular expression to check if a phrase starts with a number
  const numberRegex = /^[0-9]+/;
  console.log("Displaying each phrase with appropriate buttons");

  phrases.forEach((phrase, index) => {
    const row = document.createElement("div");
    row.className = "flex justify-between items-center rounded-lg p-4 shadow-lg";
    row.id = `row-${index}`; // Set a unique ID for each row

    // Only add buttons if the phrase starts with an integer
    if (numberRegex.test(phrase)) {
      // Assign unique IDs for each button
      const approveId = `approve-${index}`;
      const rejectId = `reject-${index}`;

      row.innerHTML = `
        <div class="flex-1 text-md text-white">
          ${phrase}
        </div>
        <div class="flex gap-4">
          <button id="${approveId}" class="bg-green-500 hover:bg-green-600 text-white py-2 px-2 rounded-lg">Approve</button>
          <button id="${rejectId}" class="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg">Reject</button>
        </div>
      `;
    } else {
      // If the phrase doesn't start with an integer, just display the phrase
      row.innerHTML = `
        <div class="flex-1 text-md text-white">
          ${phrase}
        </div>
      `;
    }

    // Append the row to the table first
    table.appendChild(row);
  });

  // Append the table to the phrases container
  phrasesContainer.appendChild(table);

  // Now attach event listeners after the elements are appended to the DOM
  phrases.forEach((phrase, index) => {
    if (numberRegex.test(phrase)) {
      const approveButton = document.getElementById(`approve-${index}`);
      const rejectButton = document.getElementById(`reject-${index}`);

      if (approveButton) {
        console.log(`Attaching approval handler to phrase at index ${index}`);
        approveButton.addEventListener("click", () => {
          handleApproval(index, phrase);
        });
      } else {
        console.error(`Approve button not found for phrase at index ${index}`);
      }

      if (rejectButton) {
        console.log(`Attaching rejection handler to phrase at index ${index}`);
        rejectButton.addEventListener("click", () => {
          handleRejection(index, phrase);
        });
      } else {
        console.error(`Reject button not found for phrase at index ${index}`);
      }
    }
  });
}

// Function to handle approval
function handleApproval(index, phrase) {
  console.log(`Approved phrase at index ${index}: ${phrase}`);

  // Change the text of the approve button and style
  const approveButton = document.getElementById(`approve-${index}`);
  approveButton.textContent = "Approved!";
  approveButton.classList.remove("bg-green-500", "hover:bg-green-600");
  approveButton.classList.add("bg-blue-600");

  // Remove the reject button
  const rejectButton = document.getElementById(`reject-${index}`);
  if (rejectButton) {
    console.log(`Removing reject button for phrase at index ${index}`);
    rejectButton.remove();
  }

  // Send the approved phrase to the backend
  sendPhraseToDatabase(phrase, 'approve');
}

// Function to handle rejection (remove the phrase's row)
function handleRejection(index, phrase) {
  console.log(`Rejected phrase at index ${index}: ${phrase}`);

  // Remove the row from the DOM
  const rowElement = document.getElementById(`row-${index}`);
  if (rowElement) {
    console.log(`Removing row for rejected phrase at index ${index}`);
    rowElement.remove(); // This will remove the entire row (phrase + buttons)
  } else {
    console.error(`Row not found for phrase at index ${index}`);
  }

  // Send the rejected phrase to the backend
  sendPhraseToDatabase(phrase, 'reject');
}

// Function to send approved/rejected phrase to the backend
async function sendPhraseToDatabase(phrase, action) {
  console.log(`Sending ${action} phrase to database:`, phrase);

  const email = localStorage.getItem('userEmail'); // Assuming the user's email is stored in localStorage after login
  if (!email) {
    console.error('User email not found in localStorage');
    return res.status(400).json({ error: 'Email is required' });
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      phrase: phrase
    }) // Send both email and phrase
  };

  const endpoint = action === 'approve' ? '/approved' : '/rejected';
  const requestUrl = `${BASE_URL}${endpoint}`;

  try {
    console.log(`Making POST request to ${requestUrl} with phrase and email`);

    const response = await fetch(requestUrl, requestOptions);

    if (!response.ok) {
      let errorMessage = 'Unknown error occurred';

      try {
        errorMessage = await response.text();
      } catch (error) {
        console.error('Error while retrieving error message from response', error);
      }

      console.error(`Error saving phrase to database: ${errorMessage}`);
    } else {
      console.log(`${action === 'approve' ? 'Approved' : 'Rejected'} phrase saved successfully.`);
    }
  } catch (error) {
    console.error('Error while sending phrase to database:', error);
  }
}