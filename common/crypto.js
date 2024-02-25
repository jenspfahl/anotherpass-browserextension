

function generateWebClientId() {
  const rnd = window.crypto.getRandomValues(new Uint8Array(8));
  return bytesToBase64(rnd).replace(/[^a-z0-9]/gi, '');
}

function generateSessionKey() {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 128,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function publicKeyToPEM(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
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

  return bytesToBase64(iv) + ":" + bytesToBase64(new Uint8Array(ciphertext));
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
