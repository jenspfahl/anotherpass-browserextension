
let webClientId;
chrome.storage.local.get(["web_client_id"]).then((result) => {
  if (!result.key) {
    webClientId = generateWebClientId();
    chrome.storage.local.set({ "web_client_id": webClientId });
  }
  console.log("webClientId = " + webClientId);
});



const keyPair = window.crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  false,
  ["encrypt", "decrypt"],
).then(async keyPair => {
  const publicKeyAsPEM = await publicKeyToPEM(keyPair.publicKey);
  console.log(publicKeyAsPEM);

  const publicKeyFingerprint = await getPublicKeyFingerprint(keyPair.publicKey);
  console.log("Fingerprint: " + publicKeyFingerprint);


  const sessionKey = await generateSessionKey();
  const sessionKeyAsArray = await sessionKeyToArray(sessionKey);
  console.log("AES Session Key = " + bytesToBase64(sessionKeyAsArray));

  const encryptedMessage = await encryptMessage(sessionKey, "secret");
  console.log("Encrypted message = " + encryptedMessage);

  const encSessionKey = await encryptWithPublicKey(keyPair.publicKey, sessionKeyAsArray);
  console.log("Encrypted AES Session Key = " + bytesToBase64(encSessionKey));


  const decSessionKeyAsArray = await decryptWithPrivateKey(keyPair.privateKey, encSessionKey);
  console.log("Decrypted AES Session Key = " + bytesToBase64(decSessionKeyAsArray));

  const decSessionKey = await arrayToSessionKey(decSessionKeyAsArray);
  const decryptedMessage = await decryptMessage(decSessionKey, encryptedMessage);
  console.log("Decrypted message = " + decryptedMessage);
  
  document.getElementById("web_client_id").value = webClientId;
  document.getElementById("public_key").value = publicKeyAsPEM;
  document.getElementById("temp_session_key").value = bytesToBase64(sessionKeyAsArray);


  storeKeyPair("transport_keypair", keyPair);

  loadKeyPair("transport_keypair", async function(keyPair) {
    const publicKeyFingerprint = await getPublicKeyFingerprint(keyPair.publicKey);
    console.log("loaded pub",publicKeyFingerprint);
  });

  const qrCodeInput = `${webClientId}:${bytesToBase64(sessionKeyAsArray)}:${publicKeyFingerprint}`;
  generateQrCode(qrCodeInput);
});



function generateQrCode(input) {
  const qrCodeDiv = document.querySelector(".qr-code");
  var qrcode = new QRCode(qrCodeDiv, {
      text: input,
      width: 400, //default 128
      height: 400,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
  });
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

function storeKeyPair(key, keyPair) {

  keyStoreOp(function (keyStore) {
    keyStore.put({key: key, keyPair: keyPair});
	})
}

async function loadKeyPair(key, fn_) {
	keyStoreOp(function (keyStore) {
    var getData = keyStore.get(key);
    getData.onsuccess = async function() {
    	var keyPair = getData.result.keyPair;
			console.log("loaded keyPair", keyPair);
      fn_(keyPair);
	   };
	})
}


document.addEventListener("click", (e) => {

  if (e.target.id === "next") {

    // TODO check and save data
    const ip = document.getElementById("ip").value;
    const port = document.getElementById("port").value;

    chrome.storage.local.set({ "server_address": ip });
    chrome.storage.local.set({ "server_port": port });

  }
});


