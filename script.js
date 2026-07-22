import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let isSignUpMode = false;

// --- AUTH UI TOGGLE ---
const toggleBtn = document.getElementById('toggle-auth-btn');
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const confirmPass = document.getElementById('confirm-password');
const mainBtn = document.getElementById('auth-main-btn');

toggleBtn.onclick = () => {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.innerText = "Create Account";
        authDesc.innerText = "Register with phone and password";
        confirmPass.classList.remove('hidden');
        mainBtn.innerText = "Sign Up";
        toggleBtn.innerHTML = "Already have an account? <b>Login</b>";
    } else {
        authTitle.innerText = "Welcome Back";
        authDesc.innerText = "Login to your account";
        confirmPass.classList.add('hidden');
        mainBtn.innerText = "Login";
        toggleBtn.innerHTML = "Don't have an account? <b>Sign Up</b>";
    }
};

// --- AUTH LOGIC ---
mainBtn.onclick = async () => {
    const phone = document.getElementById('phone-number').value.trim();
    const pass = document.getElementById('password').value;
    const cPass = document.getElementById('confirm-password').value;

    if (!phone || !pass) return alert("All fields are required!");
    const email = `${phone}@cw.com`; // Internal email mapping

    try {
        if (isSignUpMode) {
            if (pass !== cPass) return alert("Passwords do not match!");
            const userCred = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", userCred.user.uid), {
                uid: userCred.user.uid,
                phone: phone,
                name: "New User",
                photoURL: "https://via.placeholder.com/150",
                status: "online"
            });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) {
        alert(e.message);
    }
};

// --- AUTH LISTENER ---
onAuthStateChanged(auth, (user) => {
    document.getElementById('splash-screen').classList.remove('active');
    if (user) {
        currentUser = user;
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        loadSection('chats');
    } else {
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
    }
});

// --- NAVIGATION ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadSection(item.dataset.section);
    };
});

function loadSection(section) {
    const container = document.getElementById('main-content');
    document.getElementById('page-title').innerText = section.toUpperCase();
    
    if (section === 'chats') {
        container.innerHTML = '<div style="padding:20px;">No Recent Chats. Search friends to start.</div>';
    } else if (section === 'profile') {
        container.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <img src="https://via.placeholder.com/100" class="avatar" style="width:100px; height:100px; margin:0 auto 15px;">
                <h2>My Profile</h2>
                <button id="logout-btn" style="background:red; margin-top:20px; width:100%;">Logout</button>
            </div>
        `;
        document.getElementById('logout-btn').onclick = () => signOut(auth);
    } else {
        container.innerHTML = '<div style="padding:20px;">Feature coming soon...</div>';
    }
}
