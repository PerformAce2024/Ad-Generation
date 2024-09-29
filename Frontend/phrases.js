document.addEventListener("DOMContentLoaded", (event) => {
  event.preventDefault();
  console.log("DOM fully loaded and parsed");

  // Attach the event listener to the button after the DOM is fully loaded
  const btn = document.getElementById("AdButton");
  if (btn) {
    console.log("AdButton found, attaching event listener");
    btn.addEventListener("click", onClickHandler);
  } else {
    console.error("AdButton not found");
  }
});

const BASE_URL = 'https://ad-generation.onrender.com';

async function onClickHandler(event) {
  event.preventDefault();
  console.log("onClickHandler triggered");

  const googlePlayURL = document.getElementById("google-play-url").value;
  if (!googlePlayURL) {
    alert("Please provide the Google Play Store URL.");
    console.warn("Google Play Store URL is missing");
    return;
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
  } else {
    console.warn("Loader not found, skipping loader display");
  }

  console.log("Google Play URL:", googlePlayURL);
  console.log("Apple App Store URL:", appleAppURL);

  try {
    console.log("Sending requests to /generate-phrases");

    const requestBody = JSON.stringify({
      google_play: googlePlayURL,
      apple_app: appleAppURL,
    });

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      redirect: "follow",
    };

    const phrasesRequestUrl = `${BASE_URL}/generate-phrases`;

    // Send request to generate phrases
    const phrasesResponse = await fetch(phrasesRequestUrl, requestOptions);

    // Handle responses for phrases
    if (!phrasesResponse.ok) {
      const errorText = await phrasesResponse.text();
      console.error(`Error in response from ${phrasesRequestUrl}:`, errorText);
      throw new Error("Network response for phrases was not ok.");
    }

    const phrases = await phrasesResponse.json();
    console.log("Phrases received from the server:", phrases);

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

function displayPhrases(phrases) {
  console.log("Preparing to display phrases");

  const phrasesContainer = document.getElementById("phrases-list");
  console.log(phrasesContainer);
  if (!phrasesContainer) {
    console.error("Phrases container element not found");
    document.getElementById("phrases-container").innerHTML = "Unable to load phrases.";
    return;
  }

  phrasesContainer.innerHTML = ""; // Clear previous phrases

  // Create structure for phrases
  const table = document.createElement("div");
  table.className = "flex flex-col gap-2";

  // Process first element: Remove "##" and style it
  let baseHeading = phrases[0].replace(/[#:]/g, '').trim(); // Remove '##' and trim extra spaces
  const firstRow = document.createElement("div");
  firstRow.innerHTML = `<strong style="text-align: center; display: block; margin-bottom: 20px; font-size: 24px">${baseHeading}</strong>`;
  table.appendChild(firstRow); // Add to the table

  phrases.shift(); // This removes the first element (phrases[0])

  // Regular expression to check if a phrase starts with a number
  const numberRegex = /^[0-9]+/;
  console.log("Displaying each phrase with appropriate buttons");

  phrases.forEach((phrase, index) => {
    // Remove all asterisks from the phrase
    const cleanedPhrase = phrase.replace(/\*/g, '');

    const row = document.createElement("div");
    row.className = "flex justify-between items-center rounded-lg p-4 shadow-2xl";
    row.id = `row-${index}`;

    // Only add buttons if the phrase starts with an integer
    if (numberRegex.test(phrase)) {
      // Assign unique IDs for each button
      const approveId = `approve-${index}`;
      const rejectId = `reject-${index}`;

      row.innerHTML = `
        <div class="flex-1 text-md text-white">
          ${cleanedPhrase}
        </div>
        <div class="flex gap-4">
          <button id="${approveId}" class="bg-green-500 hover:bg-green-600 text-white py-2 px-2 rounded-lg">Approve</button>
          <button id="${rejectId}" class="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg">Reject</button>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="flex-1 text-xl text-white">
          ${cleanedPhrase}
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

  document.getElementById('getCreativesBtn').classList.remove('hidden');
}

// Function to handle approval
function handleApproval(index, phrase) {
  console.log(`Approved phrase at index ${index}: ${phrase}`);

  // Change the text of the approve button and style
  const approveButton = document.getElementById(`approve-${index}`);
  approveButton.textContent = "Approved!";
  approveButton.classList.remove("bg-green-500", "hover:bg-green-600");
  approveButton.classList.add("bg-blue-600");
  approveButton.disabled = true;

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
    rowElement.remove();
  } else {
    console.error(`Row not found for phrase at index ${index}`);
  }

  // Send the rejected phrase to the backend
  sendPhraseToDatabase(phrase, 'reject');
}

// Function to send approved/rejected phrase to the backend
async function sendPhraseToDatabase(phrase, action) {
  console.log(`Sending ${action} phrase to database:`, phrase);

  const email = localStorage.getItem('userEmail');
  if (!email) {
    console.error('User email not found in localStorage');
    return;
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, phrase: phrase })
  };

  const endpoint = action === 'approve' ? '/approved' : '/rejected';
  const requestUrl = `${BASE_URL}${endpoint}`;

  try {
    console.log(`Making POST request to ${requestUrl} with phrase and email`);

    const response = await fetch(requestUrl, requestOptions);

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error(`Error saving phrase to database: ${errorMessage}`);
    } else {
      console.log(`${action === 'approve' ? 'Approved' : 'Rejected'} phrase saved successfully.`);
    }
  } catch (error) {
    console.error('Error while sending phrase to database:', error);
  }
}
