// google 登入範例程式碼
// 別忘記到 auth 頁面新增服務提供商

"use client"
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useState, useEffect } from "react";


export default function FBAuth() {

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  //判斷 app 是否已經初始化過，有初始化過就使用該 app
  const app = initializeApp(firebaseConfig, "fb-auth");
  

  const provider = new GoogleAuthProvider();
  // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

  const [user, setUser] = useState(null);

  const auth = getAuth();
  auth.useDeviceLanguage();


  const signIn = () => {
    signInWithPopup(auth, provider).then((result) => {
      console.log(result);
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      // The signed-in user info.
      const user = result.user;
      console.log(user, token, credential);
      setUser(user);
    }).catch((error) => {
      console.log(error);
    });
  }
  
  
  return (
    <div className="w-full h-screen">
      <h1>FB Auth</h1>
      <h3>User: {user?.displayName}</h3>
      <button onClick={() => {
        signIn();
      }}>Sign In</button>
    </div>
  );
}
