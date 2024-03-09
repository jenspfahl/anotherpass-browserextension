var currentSessionKey;
var clientKeyPair;

function generateWebClientId() {
  const rnd = window.crypto.getRandomValues(new Uint8Array(32));
  const s = bytesToBase64(rnd).replace(/[^a-z]/gi, '').substring(0, 8).toUpperCase();
  return [s.slice(0, 4), '-', s.slice(4)].join('');
}

async function generateOrGetSessionKey() {
  if (currentSessionKey == null) {
    currentSessionKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  return currentSessionKey;
}

function destroyCurrentSessionKey() {
  currentSessionKey = null;
}

async function generateOrGetClientKeyPair() {
  if (clientKeyPair == null) {
    clientKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      false,
      ["encrypt", "decrypt"],
    )
  }

  return clientKeyPair;
}

function destroyClientKeyPair() {
  clientKeyPair = null;
}

async function publicKeyToPEM(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsBase64 = bytesToBase64(new Uint8Array(exported));
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

async function getPublicKeyFingerprint(key) {
  const pem = await publicKeyToPEM(key);
  const encoder = new TextEncoder();
  const data = encoder.encode(pem);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}


async function getPublicKeyShortenedFingerprint(key) {
  const pem = await publicKeyToPEM(key);
  const encoder = new TextEncoder();
  const data = encoder.encode(pem);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64(new Uint8Array(digest)).replace(/[^a-z]/gi, '').substring(0, 6).toLocaleLowerCase();
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

function storeKeyPair(key, keyPair) {

  keyStoreOp(function (keyStore) {
    keyStore.put({key: key, keyPair: keyPair});
	})
}

function deleteKeyPair(key) {

  keyStoreOp(function (keyStore) {
    keyStore.delete(key);
	})
}

async function loadKeyPair(key, fn_) {
	keyStoreOp(function (keyStore) {
    var getData = keyStore.get(key);
    getData.onsuccess = async function() {
      console.log("result=" + JSON.stringify(getData.result));

    	var keyPair = getData.result.keyPair;
			console.log("loaded keyPair", keyPair);
      fn_(keyPair);
	   };
	})
}


function keyStoreOp(fn_) {

	// This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
	var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

	// Open (or create) the database
	var open = indexedDB.open("anotherpass-webext", 1);

	// Create the schema
	open.onupgradeneeded = function() {
	    var db = open.result;
	    db.createObjectStore("keyStore", {keyPath: "key"});
	};

  open.onerror = function(e) {
    console.error("cannot load key", e)
  }

	open.onsuccess = function() {
	    // Start a new transaction
	    var db = open.result;
	    var tx = db.transaction("keyStore", "readwrite");
	    var keyStore = tx.objectStore("keyStore");

      fn_(keyStore);


	    // Close the db when the transaction is done
	    tx.oncomplete = function() {
	        db.close();
	    };
	}
}