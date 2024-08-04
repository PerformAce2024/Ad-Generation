const urlSection = document.getElementById("urlSection");

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

    const requestUrl = "http://127.0.0.1:3000/generate-phrases";

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
      "Error retrieving phrases.";
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  // Attach the event listener to the button after the DOM is fully loaded
  const btn = document.getElementById("AdButton");
  btn.addEventListener("click", onClickHandler);
});

function displayPhrases(phrases) {
  const container = document.getElementById("phrases-container");
  container.innerHTML = ""; // Clear previous phrases

  if (Array.isArray(phrases) && phrases.length > 0) {
    phrases.forEach((phrase) => {
      const phraseElement = document.createElement("p");
      phraseElement.textContent = phrase;
      container.appendChild(phraseElement);
    });
  } else {
    container.innerHTML = "No phrases available.";
  }
}
