# Connect World PWA

A high-performance, real-time communication platform.

## Features
- **Phone Auth**: OTP Login via Firebase.
- **Real-time Messaging**: Firestore-powered chats.
- **WebRTC Calls**: P2P Video and Voice calls.
- **Media Support**: Image/Video/Audio sharing.
- **PWA**: Installable on iOS & Android with offline support.

## Setup
1. Create a Firebase Project.
2. Enable **Phone Authentication** in Auth settings.
3. Enable **Firestore** (Production Mode) and **Storage**.
4. Configure **Firebase Cloud Messaging** for push notifications.
5. Apply the Security Rules below in your Firebase Console.

## Firebase Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /messages/{chatId}/chat/{msgId} {
      allow read, write: if request.auth != null;
    }
  }
}
