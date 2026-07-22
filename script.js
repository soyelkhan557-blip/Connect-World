import { auth, db, storage, messaging } from './firebase.js';
import { 
    RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, setDoc, getDoc, updateDoc, onSnapshot, collection, addDoc, 
    query, where, orderBy, serverTimestamp, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let currentUser = null;
let currentChatId = null;
let confirmationResult = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener();
    setupNav();
    setupMessaging();
});

// --- AUTHENTICATION ---
function initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await checkUserProfile(user);
            showScreen('app-screen');
            loadSection('chats');
            updateOnlineStatus(true);
        } else {
            showScreen('auth-screen');
            setupRecaptcha();
        }
        document.getElementById('splash-screen').classList.remove('active');
    });
}

function setupRecaptcha() {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
    });
}

document.getElementById('send-otp-btn').addEventListener('click', async () => {
    const phone = document.getElementById('phone-number').value;
    try {
        confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
        document.getElementById('phone-input-group').classList.add('hidden');
        document.getElementById('otp-input-group').classList.remove('hidden');
    } catch (error) {
        alert("Error: " + error.message);
    }
});

document.getElementById('verify-otp-btn').addEventListener('click', async () => {
    const code = document.getElementById('otp-code').value;
    try {
        await confirmationResult.confirm(code);
    } catch (error) {
        alert("Invalid OTP");
    }
});

async function checkUserProfile(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            name: "New User",
            username: "user_" + Math.floor(Math.random() * 10000),
            bio: "Hey there! I am using Connect World.",
            photoURL: "https://via.placeholder.com/150",
            status: "online",
            lastSeen: serverTimestamp()
        });
    }
}

// --- NAVIGATION & ROUTING ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function setupNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
        });
    });
}

function loadSection(section) {
    const main = document.getElementById('main-content');
    const title = document.getElementById('page-title');
    title.innerText = section.charAt(0).toUpperCase() + section.slice(1);

    switch(section) {
        case 'chats': renderChatList(main); break;
        case 'friends': renderFriends(main); break;
        case 'stories': renderStories(main); break;
        case 'calls': renderCallLogs(main); break;
        case 'profile': renderProfile(main); break;
    }
}

// --- CHAT LOGIC ---
async function renderChatList(container) {
    container.innerHTML = '<div class="loader"></div>';
    const q = query(collection(db, `users/${currentUser.uid}/conversations`), orderBy("lastMessageTime", "desc"));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = 'glass-card chat-item';
            div.innerHTML = `
                <img src="${data.photoURL}" class="avatar">
                <div class="chat-info">
                    <h4>${data.name}</h4>
                    <p>${data.lastMessage}</p>
                </div>
                <small>${new Date(data.lastMessageTime?.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
            `;
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

document.getElementById('close-chat').onclick = () => {
    document.getElementById('chat-view').classList.remove('active');
};

function loadMessages(otherUid) {
    const chatId = [currentUser.uid, otherUid].sort().join('_');
    const q = query(collection(db, `messages/${chatId}/chat`), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('message-list');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.innerHTML = msg.type === 'text' ? msg.text : `<img src="${msg.fileUrl}" style="max-width:100%">`;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    });
}

document.getElementById('send-msg-btn').onclick = async () => {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    const chatId = [currentUser.uid, currentChatId].sort().join('_');
    await addDoc(collection(db, `messages/${chatId}/chat`), {
        senderId: currentUser.uid,
        text: text,
        type: 'text',
        timestamp: serverTimestamp(),
        seen: false
    });
    input.value = '';
};

// --- WEBRTC (VIDEO CALL) ---
const pcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let localStream, remoteStream, peerConnection;

document.getElementById('start-video-call').onclick = async () => {
    document.getElementById('call-screen').classList.add('active');
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('local-video').srcObject = localStream;

    peerConnection = new RTCPeerConnection(pcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        document.getElementById('remote-video').srcObject = event.streams[0];
    };

    // Signaling Logic (simplified for brevity)
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    // Push offer to Firestore...
};

// --- PROFILE & STATUS ---
async function updateOnlineStatus(isOnline) {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
        status: isOnline ? "online" : "offline",
        lastSeen: serverTimestamp()
    });
}

window.onbeforeunload = () => updateOnlineStatus(false);

function renderProfile(container) {
    container.innerHTML = `
        <div class="glass-card profile-section">
            <img src="${currentUser.photoURL || 'https://via.placeholder.com/150'}" id="profile-pic-big">
            <h2 id="display-name">${currentUser.displayName || 'Connect World User'}</h2>
            <p>ID: ${currentUser.uid.substring(0,8)}</p>
            <button class="glass-card" onclick="handleLogout()">Logout</button>
        </div>
    `;
}

window.handleLogout = () => {
    updateOnlineStatus(false).then(() => signOut(auth));
};

// --- STORIES ---
async function renderStories(container) {
    container.innerHTML = '<div class="glass-card">Coming Soon: 24h Visual Stories</div>';
}

// --- PUSH NOTIFICATIONS ---
async function setupMessaging() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Get Token and save to Firestore user doc
        }
    } catch (e) { console.log(e); }
}
