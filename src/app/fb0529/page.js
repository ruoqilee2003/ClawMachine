"use client"
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push } from "firebase/database";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { useEffect } from "react";


export default function FB0529() {

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCfPQNToGcXMI20vee6uXdOJBwLQy5W7LU",
    authDomain: "nccu-113-2-gugu.firebaseapp.com",
    projectId: "nccu-113-2-gugu",
    storageBucket: "nccu-113-2-gugu.firebasestorage.app",
    messagingSenderId: "25466300292",
    appId: "1:25466300292:web:8f2b962c8250608c2adfd1",
    databaseURL: "https://nccu-113-2-gugu-default-rtdb.firebaseio.com/"
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
