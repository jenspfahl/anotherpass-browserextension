
const PREFIX_UID = "remembered_uid_for_"
const PREFIX_REMEMBER_DENIED = "remembered_denied_for_"
const PREFIX_CREDENTIAL = "credential_"
const PREFIX_ALT_SERVER = "alternative_server_"


function generateWebClientId() {
  const rnd = crypto.getRandomValues(new Uint8Array(32));
  const s = bytesToBase64(rnd).replace(/[^a-z]/gi, '').substring(0, 6).toUpperCase();
  return [s.slice(0, 3), '-', s.slice(3)].join('');
}

async function generateOrGetSessionKey() {
  const sessionKey = await getKey("session_key");
  if (sessionKey != null) {
    console.debug("Current session key found");
    return sessionKey;
  }
  else {
    console.debug("No session key, generate new");
    const sessionKey = await generateAesKey(128);
    await setKey("session_key", sessionKey);
    return sessionKey;
  }
}

async function generateAesKey(length) {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: length,
    },
    true,
    ["encrypt", "decrypt"]
  );
}


async function hashKeys(key1, key2, key3) {
  if (key3) {
    var key = new Uint8Array(key1.byteLength + key2.byteLength + key3.byteLength);
    key.set(new Uint8Array(key1), 0);
    key.set(new Uint8Array(key2), key1.byteLength);
    key.set(new Uint8Array(key3), key1.byteLength + key2.byteLength);
  }
  else {
    var key = new Uint8Array(key1.byteLength + key2.byteLength);
    key.set(new Uint8Array(key1), 0);
    key.set(new Uint8Array(key2), key1.byteLength);
  }

  const digest = await crypto.subtle.digest("SHA-256", key);

  return new Uint8Array(digest);
}



async function sha256(byteArray) {

  const key = new Uint8Array(byteArray.byteLength);
  key.set(new Uint8Array(byteArray), 0);

  const digest = await crypto.subtle.digest("SHA-256", key);

  return new Uint8Array(digest);
}

async function generateClientKeyPair() {
  return await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
}

async function destroyAllKeys() {
  clientKeyPair = null;
  await deleteKey("temp_client_keypair");
  await deleteKey("client_keypair");
  await deleteKey("app_public_key");
  await deleteKey("base_key");
  await destroySessionKey();
}

async function getSupportedKeyLength(variables) {
  return await getTempOrLocalKey("symmetric_key_length", variables) || 128;
}

async function destroySessionKey() {
  await deleteKey("session_key");
}

async function jwkToPublicKey(jwk) {

  return crypto.subtle.importKey(
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
  return await crypto.subtle.exportKey("jwk", key);
}

async function getPublicKeyFingerprint(key, separator) {
  const jwk = await publicKeyToJWK(key);
  const buffer = new TextEncoder().encode(jwk.n);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest), separator);
}

async function getPublicKeyStandarizedFingerprint(key, separator) {
  const jwk = await publicKeyToJWK(key);
  const buffer = base64ToBytes(jwk.n);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest), separator);
}

async function getPublicKeyShortenedFingerprint(key) {
  const jwk = await publicKeyToJWK(key);
  const buffer = new TextEncoder().encode(jwk.n);

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toShortenedFingerprint(new Uint8Array(digest));
}

function toShortenedFingerprint(keyAsArray) {
  const fingerprint = bytesToBase64(keyAsArray).replace(/[^a-z]/gi, '').substring(0, 7).toUpperCase();
  return fingerprint.substring(0, 2) + "-" + fingerprint.substring(2, 5) + "-" + fingerprint.substring(5, 7);
}

async function aesKeyToArray(aesKey) {
  const exported = await crypto.subtle.exportKey("raw", aesKey);
  return new Uint8Array(exported); 
}

async function arrayToAesKey(array) {
  return crypto.subtle.importKey("raw", array, 
  "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptMessage(key, message) {
  const enc = new TextEncoder();
  const encoded = enc.encode(message); 
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded,
  );

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
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, 
    key, 
    ciphertext
  );
  return new TextDecoder().decode(new Uint8Array(decrypted));
}


async function encryptWithPublicKey(publicKey, payload) {
  const rsaEncrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    payload,
  );

  return new Uint8Array(rsaEncrypted);
}

async function decryptWithPrivateKey(privateKey, encrypted) {
  const rsaDecrypted = await crypto.subtle.decrypt(
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

function bytesToHex(bytes, separator) {
  return Array.from(bytes, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(separator || '');
}


function openDb() {
  return new Promise((resolve, reject) => {

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

/**
 * Sets a key/value pair that only lives in memory and is therefore erased when the process ends.
 * @param {*} key 
 * @param {*} value any value, but no CryptoObjects! (they cannot be accessed through the getTemporaryKey function)
 * @param {*} variables the in-memory storage if accessible (called from the background script) or undefined if called from a popup or content script.
* @returns 
 */
function setTemporaryKey(key, value, variables) {
  return new Promise(async (resolve, reject) => {

    if (variables) {  
      resolve(variables.set(key, value));
    }
    else {
      chrome.runtime.sendMessage({
        action: "set",
        key: key,
        value: value,
      })
      .then(response => resolve(response.result))
      .catch(e => {
        console.error(e);
        reject();
      });
    }
  
  });
}

/**
 * Gets the value of a key that only lives in memory and is bound to the background script / extension.  
 * @param {*} key 
 * @param {*} variables the in-memory storage if accessible (called from the background script) or undefined if called from a popup or content script.
 * @returns 
 */
function getTemporaryKey(key, variables) {
  return new Promise(async (resolve, reject) => {

    if (variables) {  
      resolve(variables.get(key));
    }
    else {
      const response = await chrome.runtime.sendMessage({
        action: "get",
        key: key,
      });
      resolve(response.result);
    }
  });
 
}

/**
 * Deletes the value of a key that only lived in memory and is bound to the background script / extension.  
 * @param {*} key 
 * @param {*} variables the in-memory storage if accessible (called from the background script) or undefined if called from a popup or content script.
 * @returns 
 */
function deleteTemporaryKey(key, variables) {
  return new Promise(async (resolve, reject) => {

    if (variables) {  
      resolve(variables.delete(key));
    }
    else {
      const response = await chrome.runtime.sendMessage({
        action: "delete",
        key: key,
      });
      resolve(response.result);
    }
  });
}

/**
 * Gets the value of a key that first lives in memory and is bound to the background script / extension, or, if nothing found, lives in the local storage.
 * @param {*} key 
 * @param {*} variables the in-memory storage if accessible (called from the background script) or undefined if called from a popup or content script.
 * @returns 
 */
function getTempOrLocalKey(key, variables) {
  return new Promise(async (resolve, reject) => {
    const value = await getTemporaryKey(key, variables);
    
    if (value) {
      console.debug("found temp key value for local " + key);
      resolve(value);
      return;
    }
    resolve(await getLocalValue(key));
  });
}

async function getLocalValue(key) {
  const result = await chrome.storage.local.get([key]);
  if (result === undefined) {
    return null;
  }
  const value = result[key];
  if (value === undefined) {
    return null;
  }
  else {
    return value;
  }
}

async function setLocalValue(key, value) {
  return chrome.storage.local.set({ [key]: value });
}

async function removeLocalValue(key) {
  const result = await chrome.storage.local.remove([key]);
  if (result === undefined) {
    return null;
  }
  const value = result[key];
  if (value === undefined) {
    return null;
  }
  else {
    return value;
  }
}

async function getAllLocalValues() {
  const all = await chrome.storage.local.get();
  if (all === undefined) {
    return [];
  }
  return Object.entries(all);
}

async function clearLocalValues() {
  return chrome.storage.local.clear();
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
      //console.debug("Got back: " + JSON.stringify(data.result));
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



async function getClientKey(variables) {
  const clientKeyData = await getTemporaryKey("clientKey", variables);

  if (!clientKeyData) {
    console.log("No client key found");
    return;
  }
  const timestamp = clientKeyData.timestamp;
  const now = Date.now();
  const age = now - timestamp;

  const lockTimeout = await getLocalValue("lock_timeout") || 60;
  const threshold = 1000 * 60 * lockTimeout;
  console.debug("Client key age " + age + "ms (now " + now + " old timestamp " + timestamp + "), lock timeout (ms): " + threshold);
  if (age > threshold) { 
    console.log("Client key too old, logging out");
    deleteTemporaryKey("clientKey", variables); 
    return;
  }

  const clientKeyBase64 = clientKeyData.clientKey;
  const clientKeyArray = base64ToBytes(clientKeyBase64);
  const clientKey = await arrayToAesKey(clientKeyArray);

  // update access timestamp
  await setTemporaryKey("clientKey", 
  {
    clientKey: clientKeyBase64,
    timestamp: Date.now()
  },
  variables);

  return clientKey;
}


async function isLocalVaultUnlocked(variables) {
  const clientKey = await getClientKey(variables);
  if (clientKey) {
    return true;
  }
  return false;
}


async function createIndex(targetUrl) {
  let hostname = new URL(targetUrl).hostname.toLowerCase();
  const splitted = hostname.split(".");

  if (splitted.length >= 2) {
    hostname = splitted[splitted.length - 2] + "." + splitted[splitted.length - 1];
  }
  const utf8Encoded = new TextEncoder();
  const hash = await sha256(utf8Encoded.encode(hostname));
  const index = bytesToBase64(hash);
  console.debug("index for " + hostname, index);
  return index;
}
