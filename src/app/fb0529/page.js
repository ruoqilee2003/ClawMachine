"use client"
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push } from "firebase/database";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useEffect } from "react";


export default function FB0529() {

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig, "fb0529");
  const database = getDatabase(app);
  const dbRef = ref(database, "/");

  const auth = getAuth();
  const provider = new GoogleAuthProvider(); 


  useEffect(()=>{

    onValue(dbRef, (snapshot)=>{
      console.log( snapshot.val() );
    });

    const userRef = ref(database, "/accounts/0000001/");
    
    set(userRef, {
      name: "GUGU",
      points: 200
    });

  }, []);


  const addNewAccount = () => {
    console.log("clicked");
    const accountRef = ref(database, "/accounts");

    push(accountRef, {
      name: "Wang",
      type: "User",
      point: "10"
    });

  }

  const login = ()=> {

    signInWithPopup(auth, provider).then((result)=>{
      console.log(result);
      console.log(result.user.uid);
      console.log(result.user.displayName);

      const uid = result.user.uid;
      const name = result.user.displayName;


      const accountRef = ref(database, "/accounts/" + uid);
      console.log(accountRef); 
      
      if(!accountRef){
        //沒有此帳號，建立一個
        console.log("enter");

        push(accountRef, {
          name: name,
          type: "User",
          point: "10",
          uid: uid
        });

      }

    });

  }

  return (
    <>
      fb0529
      <div onClick={ addNewAccount } className="text-white border-white border-2 px-4 py-1 inline-block ">Add new Acoount</div>
      <div onClick={ login } className="text-white border-white border-2 px-4 py-1 inline-block ">Login with GOOGLE</div>
    </>
  );
}
