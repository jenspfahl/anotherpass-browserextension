
var webClientId = localStorage.getItem("web_client_id");

if (!webClientId) {
  webClientId = generateWebClientId();
  localStorage.setItem("web_client_id", webClientId);
}
console.log("webClientId = " + webClientId);


const keyPair = window.crypto.subtle.generateKey(
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
});




document.addEventListener("click", (e) => {

  if (e.target.id === "host") {

    inputIp();

  }
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

  // TODO save host


}