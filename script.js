import { auth } from "./firebase.js";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const phoneInput = document.getElementById("phone");
const loginBtn = document.getElementById("loginBtn");

window.recaptchaVerifier = new RecaptchaVerifier(auth, loginBtn, {
  size: "invisible"
});

loginBtn.onclick = async () => {

  let phone = phoneInput.value.trim();

  if (!phone.startsWith("+")) {
    phone = "+91" + phone;
  }

  try {

    const confirmation = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );

    const otp = prompt("Enter OTP");

    if (!otp) return;

    await confirmation.confirm(otp);

    alert("Login Successful");

  } catch (err) {

    console.error(err);
    alert(err.message);

  }

};

document.getElementById("myIdBtn").onclick = () => {
  alert("My ID Feature Coming Soon");
};

document.getElementById("addFriendBtn").onclick = () => {
  alert("Add Friend Feature Coming Soon");
};

document.getElementById("chatBtn").onclick = () => {
  alert("Chat Feature Coming Soon");
};

document.getElementById("storyBtn").onclick = () => {
  alert("Story Feature Coming Soon");
};

document.getElementById("profileBtn").onclick = () => {
  alert("Profile Feature Coming Soon");
};
