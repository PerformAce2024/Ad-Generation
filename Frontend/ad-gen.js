import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js"

console.log("Initializing Firebase App");

const firebaseConfig = {
    apiKey: "AIzaSyCvDykDpbRvjpHf0MBfKTTY2S9P2LpXNOw",
    authDomain: "performacemedia-750e2.firebaseapp.com",
    projectId: "performacemedia-750e2",
    storageBucket: "performacemedia-750e2.appspot.com",
    messagingSenderId: "337335887216",
    appId: "1:337335887216:web:ae64b1b44dcd9e69065bb5",
    measurementId: "G-2KJQ4YTQLB"
};

const app = initializeApp(firebaseConfig);
console.log("Firebase App initialized:", app);

const auth = getAuth();
const db = getFirestore();

console.log("Firebase Auth and Firestore initialized");

// Detect authentication state change and store email in localStorage
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);

        const loggedInUserId = user.uid;

        // Store the user's email in localStorage
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('loggedInUserId', loggedInUserId);

        console.log("User email stored in localStorage:", user.email);
        console.log("User ID stored in localStorage:", loggedInUserId);

        const docRef = doc(db, "users", loggedInUserId);
        console.log("Fetching user document from Firestore:", docRef);

        getDoc(docRef)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("User data retrieved from Firestore:", userData);

                    // Ensure you are accessing the correct properties saved in Firestore
                    const fullName = userData.fullName; // Assuming you're storing 'fullName'
                    const companyName = userData.companyName; // Assuming you're storing 'companyName'

                    // Update the DOM elements with the correct data
                    const fullNameElement = document.getElementById('loggedUserFName');
                    const companyNameElement = document.getElementById('loggedUserLName'); // Assuming you're using this to display the company name
                    const emailElement = document.getElementById('loggedUserEmail');

                    if (fullNameElement) {
                        fullNameElement.innerText = fullName; // Display fullName in the first name field
                    } else {
                        console.warn('Full name element not found in the DOM');
                    }

                    if (companyNameElement) {
                        companyNameElement.innerText = companyName; // Display companyName in the last name field
                    } else {
                        console.warn('Company name element not found in the DOM');
                    }

                    if (emailElement) {
                        emailElement.innerText = userData.email; // Assuming the email is also stored
                    } else {
                        console.warn('Email element not found in the DOM');
                    }
                } else {
                    console.log("No document found for the matching ID:", loggedInUserId);
                }
            })
            .catch((error) => {
                console.error("Error getting document from Firestore:", error);
            });
    } else {
        console.log("User is not signed in!");
    }
});

// Logout button event listener
const logoutButton = document.getElementById('logout');
if (logoutButton) {
    console.log("Logout button found, attaching event listener");
    logoutButton.addEventListener('click', () => {
        console.log("Logout button clicked, signing out user");

        // Remove user data from localStorage
        localStorage.removeItem('loggedInUserId');
        localStorage.removeItem('userEmail');

        console.log("User data removed from localStorage");

        signOut(auth)
            .then(() => {
                console.log("User signed out successfully");
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error signing out:', error);
            });
    });
} else {
    console.error("Logout button not found");
}