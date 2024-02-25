
document.addEventListener("click", (e) => {


  console.log("click");


  /**
  * Get the active tab,
  * then call "beastify()" or "reset()" as appropriate.
  */
  if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  if (e.target.type === "reset") {


    inputIp();

  }
});

let webClientId = generateWebClientId();
console.log("webClientId = " + webClientId);


let keyPair = window.crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["encrypt", "decrypt"],
).then(async keyPair => {
  const publicKeyAsPEM = await publicKeyToPEM(keyPair.publicKey);
  console.log(publicKeyAsPEM);

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
  
});


function handleResponse(message) {
  console.log(`Message from the background script: ${message.response}`);
  alert(message.response);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function inputIp() {

  console.log("here");


  var ip = prompt("Enter IP address:");

  if (ip == null || ip == "") {
    ip = "192.168.178.27";
  }

  const sending = chrome.runtime.sendMessage({
    ip: ip,
  });
  sending.then(handleResponse, handleError);


  console.log("there");




}