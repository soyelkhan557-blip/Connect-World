import { auth, db, storage } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc, 
    query, where, orderBy, serverTimestamp, limit, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- Global Variables ---
let currentUser = null;
let currentChatId = null;
let isSignUpMode = false;
let peerConnection = null;
let localStream = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    setupAuthUI();
    setupNav();
});

// --- AUTHENTICATION LOGIC (Phone + Password) ---
function setupAuthUI() {
    const toggleBtn = document.getElementById('toggle-auth-btn');
    const authTitle = document.getElementById('auth-title');
    const authDesc = document.getElementById('auth-desc');
    const confirmPass = document.getElementById('confirm-password');
    const mainBtn = document.getElementById('auth-main-btn');

    toggleBtn.onclick = () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            authTitle.innerText = "Create Account";
            authDesc.innerText = "Sign up with phone and password";
            confirmPass.classList.remove('hidden');
            mainBtn.innerText = "Sign Up";
            toggleBtn.innerHTML = "Already have an account? <span>Login</span>";
        } else {
            authTitle.innerText = "Welcome Back";
            authDesc.innerText = "Login to your account";
            confirmPass.classList.add('hidden');
            mainBtn.innerText = "Login";
            toggleBtn.innerHTML = "Don't have an account? <span>Sign Up</span>";
        }
    };

    mainBtn.onclick = handleAuth;
}

async function handleAuth() {
    const phone = document.getElementById('phone-number').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!phone || !password) return alert("Fill all fields!");

    // internal email creation (logic to bypass Firebase Email Auth)
    const email = `${phone}@connect-world.com`;

    try {
        if (isSignUpMode) {
            if (password !== confirmPassword) return alert("Passwords match error!");
            if (password.length < 6) return alert("Password min 6 chars!");

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await createUserData(userCredential.user, phone);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') alert("Account already exists!");
        else if (error.code === 'auth/wrong-password') alert("Invalid password!");
        else alert("Error: " + error.message);
    }
}

async function createUserData(user, phone) {
    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        phoneNumber: phone,
        name: "CW User",
        username: "user_" + phone.slice(-4),
        bio: "Available",
        photoURL: "https://via.placeholder.com/150",
        status: "online",
        lastSeen: serverTimestamp()
    });
}

function initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('auth-screen').classList.remove('active');
            document.getElementById('app-screen').classList.add('active');
            updateOnlineStatus(true);
            loadSection('chats');
        } else {
            document.getElementById('app-screen').classList.remove('active');
            document.getElementById('auth-screen').classList.add('active');
        }
        document.getElementById('splash-screen').classList.remove('active');
    });
}

// --- CORE NAVIGATION ---
function setupNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
        };
    });
}

function loadSection(section) {
    const main = document.getElementById('main-content');
    document.getElementById('page-title').innerText = section.toUpperCase();
    main.innerHTML = '<div class="spinner"></div>';

    if (section === 'chats') renderChats(main);
    else if (section === 'friends') renderFriends(main);
    else if (section === 'stories') renderStories(main);
    else if (section === 'calls') renderCalls(main);
    else if (section === 'profile') renderProfile(main);
}

// --- CHAT FEATURE ---
async function renderChats(container) {
    const q = query(collection(db, `users/${currentUser.uid}/conversations`), orderBy("lastTime", "desc"));
    onSnapshot(q, (snap) => {
        container.innerHTML = snap.empty ? '<p style="padding:20px;">No chats yet</p>' : '';
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'glass-card chat-item';
            div.innerHTML = `<img src="${data.photoURL}" class="avatar"><div><h4>${data.name}</h4><p>${data.lastMsg}</p></div>`;
            div.onclick = () => openChat(data);
            container.appendChild(div);
        });
    });
}

function openChat(user) {
    currentChatId = user.uid;
    document.getElementById('chat-user-name').innerText = user.name;
    document.getElementById('chat-user-img').src = user.photoURL;
    document.getElementById('chat-view').classList.add('active');
    loadMessages(user.uid);
}

document.getElementById('send-msg-btn').onclick = async () => {
    const input = document.getElementById('message-input');
    const msg = input.value.trim();
    if (!msg || !currentChatId) return;

    const chatId = [currentUser.uid, currentChatId].sort().join('_');
    await addDoc(collection(db, `chats/${chatId}/messages`), {
        sender: currentUser.uid,
        text: msg,
        time: serverTimestamp(),
        type: 'text'
    });
    input.value = '';
};

function loadMessages(otherUid) {
    const chatId = [currentUser.uid, otherUid].sort().join('_');
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy("time", "asc"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('message-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            const div = document.createElement('div');
            div.className = `message ${m.sender === currentUser.uid ? 'sent' : 'received'}`;
            div.innerText = m.text;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    });
}

// --- WEBRTC CALL SYSTEM ---
document.getElementById('start-video-call').onclick = async () => {
    document.getElementById('call-screen').classList.add('active');
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('local-video').srcObject = localStream;
    // WebRTC Signaling Logic (Firebase call collection integration)
};

// --- STORY SYSTEM ---
function renderStories(container) {
    container.innerHTML = `
        <div class="glass-card" style="padding:20px; text-align:center;">
            <p>Share your moments</p>
            <button class="auth-btn" style="padding:10px 20px; margin-top:10px;">Post Story</button>
        </div>
    `;
}

// --- PROFILE & SETTINGS ---
function renderProfile(container) {
    container.innerHTML = `
        <div class="glass-card profile-card" style="text-align:center; padding:30px;">
            <img src="${currentUser.photoURL || 'https://via.placeholder.com/150'}" style="width:100px; border-radius:50%;">
            <h2 style="margin-top:15px;">CW User</h2>
            <p>${currentUser.email.split('@')[0]}</p>
            <button id="logout-btn" style="margin-top:20px; color:red; border:none; background:none; cursor:pointer;">Logout</button>
        </div>
    `;
    document.getElementById('logout-btn').onclick = () => {
        updateOnlineStatus(false).then(() => signOut(auth));
    };
}

// --- STATUS TRACKING ---
async function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
        status: isOnline ? "online" : "offline",
        lastSeen: serverTimestamp()
    });
}

// UI Helpers
document.getElementById('close-chat').onclick = () => document.getElementById('chat-view').classList.remove('active');
document.getElementById('hangup-btn').onclick = () => {
    if(localStream) localStream.getTracks().forEach(t => t.stop());
    document.getElementById('call-screen').classList.remove('active');
};
