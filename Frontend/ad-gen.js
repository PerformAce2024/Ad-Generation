import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js"


const firebaseConfig = {
    apiKey: "AIzaSyDSt7NQZlFcOSmerHV2-K6zUgnbv2Hn5Bs",
    authDomain: "performacemedia-750e2.firebaseapp.com",
    projectId: "performacemedia-750e2",
    storageBucket: "performacemedia-750e2.appspot.com",
    messagingSenderId: "337335887216",
    appId: "1:337335887216:web:ae64b1b44dcd9e69065bb5",
    measurementId: "G-2KJQ4YTQLB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Detect authentication state change and store email in localStorage
onAuthStateChanged(auth, (user) => {
    if (user) {
        const loggedInUserId = user.uid;

        // Store the user's email in localStorage
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('loggedInUserId', loggedInUserId);

        console.log(user);
        const docRef = doc(db, "users", loggedInUserId);
        getDoc(docRef)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    document.getElementById('loggedUserFName').innerText = userData.firstName;
                    document.getElementById('loggedUserLName').innerText = userData.lastName;
                    document.getElementById('loggedUserEmail').innerText = userData.email;
                }
                else {
                    console.log("No document found the matching ID.");
                }
            })
            .catch((error) => {
                console.log("Error getting document!");
            });
    } else {
        console.log("User is not signed in!");
    }
});

const logoutButton = document.getElementById('logout');
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('userEmail');
    signOut(auth)
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error signing out:', error);
        });
});
