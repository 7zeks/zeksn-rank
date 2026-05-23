// js/config.js

const firebaseConfig = {
    apiKey: "AIzaSyAm1X3V10ImJ_RVaIqRpcFqRjlyg9vA5yI",
    authDomain: "filmy-zk.firebaseapp.com",
    databaseURL: "https://filmy-zk-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "filmy-zk",
    storageBucket: "filmy-zk.firebasestorage.app",
    messagingSenderId: "168407000386",
    appId: "1:168407000386:web:9220f943400263461394db",
    measurementId: "G-TLSHRQH647"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase połączony!");
}

const db = firebase.database();

window.refs = {
    ranking: db.ref("ranking"),
    restream: db.ref("restream_structure"),
    users: db.ref("users")
};
