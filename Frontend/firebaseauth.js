// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log("Initializing Firebase App");

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
console.log("Firebase App initialized:", app);

const auth = getAuth();
const db = getFirestore();
console.log("Auth and Firestore initialized");

function showMessage(message) {
    console.log("Message displayed:", message);
    alert(message);
}

function isBlockedEmailDomain(email) {
    const blockedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com"]; // Add more blocked domains as needed
    const emailDomain = email.split('@')[1];
    const isBlocked = blockedDomains.includes(emailDomain);
    console.log("Checking if email domain is blocked:", emailDomain, isBlocked);
    return isBlocked;
}

const signUp = document.getElementById('submitSignUp');
signUp.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Sign up button clicked");

    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;
    const fullName = document.getElementById('fName').value;
    const companyName = document.getElementById('cName').value;

    console.log("Sign up input values - Email:", email, "Full Name:", fullName, "Company Name:", companyName);

    // Ensure email domain is allowed
    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.');
        return;
    }

    // Create a new user with email and password
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User created successfully:", userCredential);
            const user = userCredential.user; // Extract the user object

            // Save additional user data to Firestore
            const userData = {
                email: email,
                fullName: fullName,
                companyName: companyName
            };

            // Send verification email
            sendEmailVerification(user)
                .then(() => {
                    console.log("Email verification sent to:", email);
                    alert("Email verification sent successfully.");
                })
                .catch((error) => {
                    console.error("Error sending email verification:", error);
                    showMessage("Failed to send verification email.");
                });

            showMessage('Account Created Successfully');

            // Save the user data to Firestore
            const docRef = doc(db, "users", user.uid);
            console.log("Setting user data in Firestore:", docRef, userData);
            setDoc(docRef, userData)
                .then(() => {
                    console.log("User data written successfully to Firestore");
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error("Error writing document", error);
                    showMessage("Failed to save user data.");
                });
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Sign up error:", error);

            if (errorCode === 'auth/email-already-in-use') {
                showMessage('Email Address Already Exists !!!');
            } else {
                showMessage('Unable to create User');
            }
        });
});

const signIn = document.getElementById('submitSignIn');
signIn.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Sign in button clicked");

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Sign in input values - Email:", email);

    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.');
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed in successfully:", userCredential);
            const user = userCredential.user;

            // Check if the user's email is verified
            if (user.emailVerified) {
                console.log("Email is verified for user:", email);
                localStorage.setItem('loggedInUserId', user.uid);
                window.location.href = 'ad-gen.html';
            } else {
                console.warn("Email not verified for user:", email);
                showMessage('Please verify your email before signing in.');
                auth.signOut(); // Sign out the user if not verified
            }
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Sign-in error:", error);

            if (errorCode === 'auth/invalid-credential') {
                showMessage('Incorrect email or password.');
            } else if (errorCode === 'auth/user-not-found') {
                showMessage('No account exists with this email.');
            } else {
                showMessage('An error occurred during sign-in. Please try again.');
            }
            console.error('Sign-in error:', error);
        });
});

// Move this outside of the signIn event listener
const forgetPass = document.querySelector('.forgetPassword');
forgetPass.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Forgot password link clicked");

    const email = document.getElementById('email').value;

    if (!email) {
        console.log("No email provided for password reset");
        showMessage('Please enter your email address first.');
        return;
    }

    console.log("Sending password reset email to:", email);

    sendPasswordResetEmail(auth, email)
        .then(() => {
            console.log("Password reset email sent successfully to:", email);
            showMessage("A password reset link has been sent to your email.");
        })
        .catch((error) => {
            console.error("Password reset error:", error);
            showMessage("An error occurred. Please try again.");
        });
});
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log("Initializing Firebase App");

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
console.log("Firebase App initialized:", app);

const auth = getAuth();
const db = getFirestore();
console.log("Auth and Firestore initialized");

function showMessage(message) {
    console.log("Message displayed:", message);
    alert(message);
}

function isBlockedEmailDomain(email) {
    const blockedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com"]; // Add more blocked domains as needed
    const emailDomain = email.split('@')[1];
    const isBlocked = blockedDomains.includes(emailDomain);
    console.log("Checking if email domain is blocked:", emailDomain, isBlocked);
    return isBlocked;
}

const signUp = document.getElementById('submitSignUp');
signUp.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Sign up button clicked");

    const email = document.getElementById('rEmail').value;
    const password = document.getElementById('rPassword').value;
    const fullName = document.getElementById('fName').value;
    const companyName = document.getElementById('cName').value;

    console.log("Sign up input values - Email:", email, "Full Name:", fullName, "Company Name:", companyName);

    // Ensure email domain is allowed
    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.');
        return;
    }

    // Create a new user with email and password
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User created successfully:", userCredential);
            const user = userCredential.user; // Extract the user object

            // Save additional user data to Firestore
            const userData = {
                email: email,
                fullName: fullName,
                companyName: companyName
            };

            // Send verification email
            sendEmailVerification(user)
                .then(() => {
                    console.log("Email verification sent to:", email);
                    alert("Email verification sent successfully.");
                })
                .catch((error) => {
                    console.error("Error sending email verification:", error);
                    showMessage("Failed to send verification email.");
                });

            showMessage('Account Created Successfully');

            // Save the user data to Firestore
            const docRef = doc(db, "users", user.uid);
            console.log("Setting user data in Firestore:", docRef, userData);
            setDoc(docRef, userData)
                .then(() => {
                    console.log("User data written successfully to Firestore");
                    window.location.href = 'login.html';
                })
                .catch((error) => {
                    console.error("Error writing document", error);
                    showMessage("Failed to save user data.");
                });
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Sign up error:", error);

            if (errorCode === 'auth/email-already-in-use') {
                showMessage('Email Address Already Exists !!!');
            } else {
                showMessage('Unable to create User');
            }
        });
});

const signIn = document.getElementById('submitSignIn');
signIn.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Sign in button clicked");

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Sign in input values - Email:", email);

    if (isBlockedEmailDomain(email)) {
        showMessage('Email address from this domain is not allowed.');
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed in successfully:", userCredential);
            const user = userCredential.user;

            // Check if the user's email is verified
            if (user.emailVerified) {
                console.log("Email is verified for user:", email);
                localStorage.setItem('loggedInUserId', user.uid);
                window.location.href = 'ad-gen.html';
            } else {
                console.warn("Email not verified for user:", email);
                showMessage('Please verify your email before signing in.');
                auth.signOut(); // Sign out the user if not verified
            }
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Sign-in error:", error);

            if (errorCode === 'auth/invalid-credential') {
                showMessage('Incorrect email or password.');
            } else if (errorCode === 'auth/user-not-found') {
                showMessage('No account exists with this email.');
            } else {
                showMessage('An error occurred during sign-in. Please try again.');
            }
            console.error('Sign-in error:', error);
        });
});

// Move this outside of the signIn event listener
const forgetPass = document.querySelector('.forgetPassword');
forgetPass.addEventListener('click', (event) => {
    event.preventDefault();
    console.log("Forgot password link clicked");

    const email = document.getElementById('email').value;

    if (!email) {
        console.log("No email provided for password reset");
        showMessage('Please enter your email address first.');
        return;
    }

    console.log("Sending password reset email to:", email);

    sendPasswordResetEmail(auth, email)
        .then(() => {
            console.log("Password reset email sent successfully to:", email);
            showMessage("A password reset link has been sent to your email.");
        })
        .catch((error) => {
            console.error("Password reset error:", error);
            showMessage("An error occurred. Please try again.");
        });
});