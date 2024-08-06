// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// const firebaseConfig = {
//    apiKey: "AIzaSyAyzUpcpMvuEwCVqecdFoa_QpR93QGKQJc",
//     authDomain: "login-40928.firebaseapp.com",
//     projectId: "login-40928",
//     storageBucket: "login-40928.appspot.com",
//     messagingSenderId: "345628289335",
//     appId: "1:345628289335:web:6d27be01b586fb27ad92b2",
//     measurementId: "G-6WKXM1GEVW"
// };

const firebaseConfig = {
    apiKey: "AIzaSyDSt7NQZlFcOSmerHV2-K6zUgnbv2Hn5Bs",
    authDomain: "performacemedia-750e2.firebaseapp.com",
    projectId: "performacemedia-750e2",
    storageBucket: "performacemedia-750e2.appspot.com",
    messagingSenderId: "337335887216",
    appId: "1:337335887216:web:ae64b1b44dcd9e69065bb5",
    measurementId: "G-2KJQ4YTQLB"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function showMessage(message, divId) {
    var messageDiv = document.getElementById(divId);
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(function () {
        messageDiv.style.opacity = 0;
    }, 5000);
}

function isBlockedEmailDomain(email) {
    const blockedDomains = ["gmail.com", , "yahoo.com", "outlook.com", "hotmail.com","aol.com","icloud.com"]; // Add more blocked domains as needed
    const emailDomain = email.split('@')[1];
    return blockedDomains.includes(emailDomain);
}

const signUp = document.getElementById('submitSignUp');
signUp.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;
    const firstName = document.getElementById('fName').value;
    const lastName = document.getElementById('lName').value;

    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.', 'signUpMessage');
        return;
    }

    const auth = getAuth();
    const db = getFirestore();

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            const userData = {
                email: email,
                firstName: firstName,
                lastName: lastName
            };
            showMessage('Account Created Successfully', 'signUpMessage');
            const docRef = doc(db, "users", user.uid);
            setDoc(docRef, userData)
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Error writing document", error);
                });
        })
        .catch((error) => {
            const errorCode = error.code;
            if (errorCode === 'auth/email-already-in-use') {
                showMessage('Email Address Already Exists !!!', 'signUpMessage');
            } else {
                showMessage('Unable to create User', 'signUpMessage');
            }
        });
});

const signIn = document.getElementById('submitSignIn');
signIn.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.', 'signInMessage');
        return;
    }

    const auth = getAuth();

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showMessage('Login is successful', 'signInMessage');
            const user = userCredential.user;
            localStorage.setItem('loggedInUserId', user.uid);
            window.location.href = 'homepage.html';
        })
        .catch((error) => {
            const errorCode = error.code;
            if (errorCode === 'auth/invalid-credential') {
                showMessage('Incorrect Email or Password', 'signInMessage');
            } else {
                showMessage('Account does not Exist', 'signInMessage');
            }
        });
});



const logoutButton = document.getElementById('logout'); 
logoutButton.addEventListener('click', () => {
  console.log('Logout button clicked'); // Debug line
  localStorage.removeItem('loggedInUserId');
  signOut(auth)
  .then(() => {
    console.log('User signed out successfully');
    window.location.href = 'index.html';
  })
  .catch((error) => {
    console.error('Error Signing out:', error);
  });
});