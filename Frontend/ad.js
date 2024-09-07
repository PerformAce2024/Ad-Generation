document.addEventListener("DOMContentLoaded", (event) => {
  // Attach the event listener to the button after the DOM is fully loaded
  const btn = document.getElementById("AdButton");
  if (btn) {
    btn.addEventListener("click", onClickHandler);
  } else {
    console.error("AdButton not found");
  }
});

async function onClickHandler() {
  const googlePlayURL = document.getElementById("google-play-url").value;
  const appleAppURL = document.getElementById("apple-app-url").value;

  const loader = document.getElementById("loader");

  console.log("Google Play URL:", googlePlayURL);
  console.log("Apple App Store URL:", appleAppURL);

  // Show the loader
  loader.classList.remove("hidden");

  try {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      google_play: googlePlayURL,
      apple_app: appleAppURL,
    });

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const requestUrl = "https://ad-generation.onrender.com/generate-phrases";

    const response = await fetch(requestUrl, requestOptions);

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const phrases = await response.json();
    console.log("Phrases received:", phrases);

    // Hide the loader
    loader.classList.add("hidden");

    if (Array.isArray(phrases) && phrases.length > 0) {
      displayPhrases(phrases);
    } else {
      console.error("No phrases to display");
      document.getElementById("phrases-container").innerHTML =
        "No phrases available.";
    }
  } catch (error) {
    console.error("Error:", error);
    loader.classList.add("hidden");
    document.getElementById("phrases-container").innerHTML =
      "Error retrieving phrases. Please check your connection or try again later.";
  }
}

function displayPhrases(phrases) {
  const phrasesContainer = document.getElementById("phrases-list");
  if (!phrasesContainer) {
    console.error("phrasesContainer not found");
    return;
  }

  phrasesContainer.innerHTML = ""; // Clear previous phrases

  // Create structure for phrases
  const table = document.createElement("div");
  table.className = "flex flex-col gap-2";

  // Regular expression to check if a phrase starts with a number
  const numberRegex = /^[0-9]+/;

  phrases.forEach((phrase, index) => {
    const row = document.createElement("div");
    row.className =
      "flex justify-between items-center rounded-lg p-4 shadow-lg";
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

  // Now attach event listeners AFTER the elements are appended to the DOM
  phrases.forEach((phrase, index) => {
    if (numberRegex.test(phrase)) {
      const approveButton = document.getElementById(`approve-${index}`);
      const rejectButton = document.getElementById(`reject-${index}`);

      if (approveButton) {
        approveButton.addEventListener("click", () => {
          handleApproval(index, phrase);
        });
      } else {
        console.error(`Approve button not found for index ${index}`);
      }

      if (rejectButton) {
        rejectButton.addEventListener("click", () => {
          handleRejection(index, phrase);
        });
      } else {
        console.error(`Reject button not found for index ${index}`);
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
    rejectButton.remove();
  }

  // Send the approved phrase to the backend
  sendPhraseToDatabase(phrase, 'approve');
}

// Function to handle rejection (remove the phrase's row)
function handleRejection(index, phrase) {
  console.log(`Rejected phrase at index ${index}`);

  // Remove the row from the DOM
  const rowElement = document.getElementById(`row-${index}`);
  if (rowElement) {
    rowElement.remove(); // This will remove the entire row (phrase + buttons)
  } else {
    console.error(`Row not found for index ${index}`);
  }

  // Send the rejected phrase to the backend
  sendPhraseToDatabase(phrase, 'reject');
}

// Function to send approved/rejected phrase to the backend
async function sendPhraseToDatabase(phrase, action) {
  const email = localStorage.getItem('userEmail'); // Assuming the user's email is stored in localStorage after login
  if (!email) {
    console.error('User email not found.');
    return;
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phrase, email }) // Send both phrase and email
  };

  const endpoint = action === 'approve' ? '/approved' : '/rejected';
  const requestUrl = `https://ad-generation.onrender.com${endpoint}`; // Update with your backend URL

  try {
    const response = await fetch(requestUrl, requestOptions);
    if (response.ok) {
      console.log(`${action === 'approve' ? 'Approved' : 'Rejected'} phrase saved successfully.`);
    } else {
      console.error('Error saving phrase to database.');
    }
  } catch (error) {
    console.error('Network error:', error); // More specific error message
  }
}