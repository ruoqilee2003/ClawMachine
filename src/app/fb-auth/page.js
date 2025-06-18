// google 登入範例程式碼
// 別忘記到 auth 頁面新增服務提供商

"use client"
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useState, useEffect } from "react";


export default function FBAuth() {

  const firebaseConfig = {
    apiKey: "改成你自己的",
    authDomain: "fir-demo-cc753.firebaseapp.com",
    databaseURL: "改成你自己的",
    projectId: "fir-demo-cc753",
    storageBucket: "fir-demo-cc753.firebasestorage.app",
    messagingSenderId: "547407373138",
    appId: "1:547407373138:web:14b40e20e4b7fc773e108b",
    measurementId: "G-9S4KKT964F"
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
