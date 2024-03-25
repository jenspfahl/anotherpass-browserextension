
function generateWebClientId() {
  const rnd = window.crypto.getRandomValues(new Uint8Array(32));
  const s = bytesToBase64(rnd).replace(/[^a-z]/gi, '').substring(0, 6).toUpperCase();
  return [s.slice(0, 3), '-', s.slice(3)].join('');
}

async function generateOrGetSessionKey() {
  const sessionKey = await getKey("session_key");
  if (sessionKey != null) {
    console.log("Current session key found");
    return sessionKey;
  }
  else {
    console.log("No session key, generate new");
    const sessionKey = await generateAesKey();
    await setKey("session_key", sessionKey);
    return sessionKey;
  }
}

async function getBaseKey() {
  const baseKey = await getKey("base_key");
  if (baseKey) {
    console.log("Current base key found");
    return baseKey;
  }
  else {
    console.log("No base key, generate new");
    const baseKey = await generateAesKey();
    await setKey("request_base_key", baseKey);
    return baseKey;
  }
}

async function generateAesKey() {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 128,
    },
    true,
    ["encrypt", "decrypt"]
  );
}


async function hashKeys(key1, key2) {
  var key = new Uint8Array(key1.byteLength + key2.byteLength);
  key.set(new Uint8Array(key1), 0);
  key.set(new Uint8Array(key2), key1.byteLength);

  const digest = await crypto.subtle.digest("SHA-256", key);
  console.log("hashed key=" + bytesToBase64(key));

  console.log("hashed key1=" + bytesToBase64(new Uint8Array(key1)));
  console.log("hashed key2=" + bytesToBase64(new Uint8Array(key2)));

  console.log("hashed keys=" + bytesToBase64(new Uint8Array(digest)));

  return new Uint8Array(digest);
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

async function destroyAllKeys() {
  clientKeyPair = null;
  await deleteKey("client_keypair");
  await deleteKey("app_public_key");
  await deleteKey("base_key");
  await destroySessionKey();
}


async function destroySessionKey() {
  await deleteKey("session_key");
}

async function jwkToPublicKey(jwk) {
  console.debug("JWK to import:", JSON.stringify(jwk));
  console.log("in: jwk.n=" + jwk.n);
  console.log("in: jwk.e=" + jwk.e);


  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-1",
    },
    true,
    ["encrypt"],
  );
}

async function publicKeyToJWK(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

async function getPublicKeyFingerprint(key) {
  const jwk = await publicKeyToJWK(key);
  const buffer = new TextEncoder().encode(jwk.n);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}


async function getPublicKeyShortenedFingerprint(key) {
  const jwk = await publicKeyToJWK(key);
  const buffer = new TextEncoder().encode(jwk.n);
  console.log("out: jwk.n=" + jwk.n);

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return fingerprintAsArray(new Uint8Array(digest));
}

function toShortenedFingerprint(keyAsArray) {
  const fingerprint = bytesToBase64(keyAsArray).replace(/[^a-z]/gi, '').substring(0, 6).toLowerCase();
  return fingerprint.substring(0, 3) + "-" + fingerprint.substring(3, 6);
}

async function aesKeyToArray(aesKey) {
  const exported = await window.crypto.subtle.exportKey("raw", aesKey);
  return new Uint8Array(exported); 
}

async function arrayToAesKey(array) {
  return window.crypto.subtle.importKey("raw", array, 
  "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptMessage(key, message) {
  const enc = new TextEncoder();
  const encoded = enc.encode(message); 
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded,
  );

  console.log(iv);
  console.log(new Uint8Array(ciphertext));

  return "EWM:" + bytesToBase64(iv) + ":" + bytesToBase64(new Uint8Array(ciphertext));
}

async function decryptMessage(key, encrypted) {
  const splitted = encrypted.split(":");
  const type = splitted[0];
  if (type !== "EWM" ) {
    throw new Error("Unknown type");
  }
  const iv = base64ToBytes(splitted[1]);
  const ciphertext = base64ToBytes(splitted[2]);
  console.log(iv);
  console.log(ciphertext);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, 
    key, 
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
  base64 = base64
            .replace(/=\\n/g, '')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
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
