async function onClickHandler() {
    const googlePlayURL = document.getElementById("google-play-url").value;
    const appleAppURL = document.getElementById("apple-app-url").value;
  
    console.log(googlePlayURL);
    console.log(appleAppURL);
  
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
  
      if (Array.isArray(phrases) && phrases.length > 0) {
        displayPhrases(phrases);
      } else {
        console.error("No phrases to display");
        document.getElementById("phrases-container").innerHTML =
          "No phrases available.";
      }
    } catch (error) {
      console.error("Error:", error);
      document.getElementById("phrases-container").innerHTML =
        "Error retrieving phrases. Please check your connection or try again later.";
    }
  }
  
  document.addEventListener("DOMContentLoaded", (event) => {
    // Attach the event listener to the button after the DOM is fully loaded
    const btn = document.getElementById("AdButton");
    btn.addEventListener("click", onClickHandler);
  });
  
  // Function to display phrases
  function displayPhrases(phrases) {
    const phrasesContainer = document.getElementById('phrases-list');
    if (!phrasesContainer) {
      console.error('phrasesContainer not found');
      return;
    }
  
    phrasesContainer.innerHTML = ''; // Clear previous phrases
  
    // Create table structure
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200 overflow-x-auto';
  
    // Create table header
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    thead.innerHTML = `
      <tr>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phrase</th>
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
      </tr>`;
    table.appendChild(thead);
  
    // Create table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200 overflow-x-auto';
  
    phrases.forEach(phrase => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 overflow-x-auto">${phrase}</td>
        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 overflow-x-auto">GrowthZ</td>
      `;
      tbody.appendChild(row);
    });
  
    table.appendChild(tbody);
    phrasesContainer.appendChild(table);
  }


  // document.getElementById('reset-password-form').addEventListener('submit', function(event) {
  //   event.preventDefault();
  //   const email = document.getElementById('reset-email').value;
  //   resetPassword(email);
  // });
  