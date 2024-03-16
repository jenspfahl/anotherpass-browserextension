
function generateWebClientId() {
  const rnd = window.crypto.getRandomValues(new Uint8Array(32));
  const s = bytesToBase64(rnd).replace(/[^a-z]/gi, '').substring(0, 8).toUpperCase();
  return [s.slice(0, 4), '-', s.slice(4)].join('');
}

async function generateOrGetSessionKey() {
  const currentSessionKey = await getKey("session_key");
  if (currentSessionKey != null) {
    console.log("Current session key found");
    return currentSessionKey;
  }
  else {
    console.log("No session key, generate new");
    const sessionKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"]
    );
    await setKey("session_key", sessionKey);
    return sessionKey;
  }
}

function destroyCurrentSessionKey() {
  deleteKey("session_key");
}

async function generateOrGetClientKeyPair() {
  const currentClientKeyPair = await getKey("client_keypair");
  if (currentClientKeyPair != null) {
    console.log("Current client keypair found");
    return currentClientKeyPair;
  }
  else {
    console.log("No client keypair, generate new");
    clientKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
    await setKey("client_keypair", clientKeyPair);
    
    return clientKeyPair;
  }
}

function destroyClientKeyPair() {
  clientKeyPair = null;
}

async function publicKeyToJWK(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

async function getPublicKeyFingerprint(key) {
  const jwk = await publicKeyToJWK(key);
  console.log("jwk.n=" + jwk.n);
  const buffer = new TextEncoder().encode(jwk.n);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}


async function getPublicKeyShortenedFingerprint(key) {
  const jwk = await publicKeyToJWK(key);
  const buffer = new TextEncoder().encode(jwk.n);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const f = bytesToBase64(new Uint8Array(digest)).replace(/[^a-z0-9]/gi, '').substring(0, 6).toLocaleLowerCase();
  return f.substring(0, 2) + "-" + f.substring(2, 4) + "-" + f.substring(4, 6);
}

async function sessionKeyToArray(sessionKey) {
  const exported = await window.crypto.subtle.exportKey("raw", sessionKey);
  return new Uint8Array(exported); 
}

async function arrayToSessionKey(array) {
  return window.crypto.subtle.importKey("raw", array, 
  "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptMessage(sessionKey, message) {
  const enc = new TextEncoder();
  const encoded = enc.encode(message); 
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    sessionKey,
    encoded,
  );

  console.log(iv);
  console.log(new Uint8Array(ciphertext));

  return "EWM:" + bytesToBase64(iv) + ":" + bytesToBase64(new Uint8Array(ciphertext));
}

async function decryptMessage(sessionKey, encrypted) {
  const splitted = encrypted.split(":");
  const iv = base64ToBytes(splitted[0]);
  const ciphertext = base64ToBytes(splitted[1]);
  console.log(iv);
  console.log(ciphertext);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, 
    sessionKey, 
    ciphertext
  );
  return new TextDecoder().decode(new Uint8Array(decrypted));
}


async function encryptWithPublicKey(publicKey, payload) {
  const rsaEncrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    payload,
  );

  return new Uint8Array(rsaEncrypted);
}

async function decryptWithPrivateKey(privateKey, encrypted) {
  const rsaDecrypted = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encrypted,
  );

  return new Uint8Array(rsaDecrypted);
}

function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToBase64(bytes) {
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString);
}

function bytesToHex(bytes) {
  return Array.from(bytes, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}


function openDb() {
  return new Promise((resolve, reject) => {

    // This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    // Open (or create) the database
    var open = indexedDB.open("anotherpass-webext", 1);

    // Create the schema
    open.onupgradeneeded = function() {
        var db = open.result;
        db.createObjectStore("keyStore", {keyPath: "key"});
    };

    open.onerror = event => reject(event.target.error);
    open.onsuccess = function() {
      var db = open.result;
      resolve(db);
    };
  });
}

function setKey(key, value) {
  return new Promise(async (resolve, reject) => {
    const db = await openDb();
    const tx = db.transaction("keyStore", 'readwrite');
    let result;    

    tx.onerror = event => {
      console.error("Cannot store key " + key, event.target.error);
      return reject(event.target.error);
    };
    
    const store = tx.objectStore("keyStore");
    const request = store.put({key: key, value: value});
    request.onsuccess = _ => result = request.result;
    
    tx.oncomplete = function() {
      db.close();
      resolve(result);
    };
  });
}

function getKey(key) {
  return new Promise(async (resolve, reject) => {
    const db = await openDb();
    const tx = db.transaction("keyStore", 'readwrite');
   
    let result;    
    tx.onerror = event => reject(event.target.error);
    
    const store = tx.objectStore("keyStore");
    const data = store.get(key);
    data.onsuccess = () => {
      console.log("Got back: " + JSON.stringify(data.result));
      if (data.result) {
        result = data.result.value;
      }
      else {
        result = null;
      }
    };
    
    tx.oncomplete = function () {
      db.close();
      resolve(result);
    };
  });
}

function deleteKey(key) {
  return new Promise(async (resolve, reject) => {
    const db = await openDb();
    const tx = db.transaction("keyStore", 'readwrite');
   
    let result;    
    tx.onerror = event => reject(event.target.error);
    
    const store = tx.objectStore("keyStore");
    const request = store.delete(key);
    request.onsuccess = _ => result = request.result;
    
    tx.oncomplete = function() {
      resolve(result);
      db.close();
    };
  });
}
