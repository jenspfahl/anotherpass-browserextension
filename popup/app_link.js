
var webClientId = localStorage.getItem("web_client_id");

if (webClientId) {
  localStorage.removeItem("web_client_id");
  localStorage.removeItem("server_address");
  localStorage.removeItem("server_port");
  deleteKeyPair("transport_keypair");


  alert("Extension decoupled");
  window.close();

}
else {
  webClientId = generateWebClientId();

  console.log("webClientId = " + webClientId);

  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  document.getElementById("ip").value = ip;
  document.getElementById("port").value = port || 8001;


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
    document.getElementById("public_key_fingerprint").value = publicKeyFingerprint;
    document.getElementById("temp_session_key").value = bytesToBase64(sessionKeyAsArray);
    /*
    
        storeKeyPair("transport_keypair", keyPair);
    
        loadKeyPair("transport_keypair", async function (keyPair) {
          const publicKeyFingerprint = await getPublicKeyFingerprint(keyPair.publicKey);
          console.log("loaded pub", publicKeyFingerprint);
        });*/

    const qrCodeInput = `${webClientId}:${bytesToBase64(sessionKeyAsArray)}:${publicKeyFingerprint}`;
    generateQrCode(qrCodeInput);


    document.addEventListener("click", (e) => {

      if (e.target.id === "next") {

        // TODO check and save data
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value;

        localStorage.setItem("server_address", ip);
        localStorage.setItem("server_port", port);
        localStorage.setItem("web_client_id", webClientId);

        storeKeyPair("transport_keypair", keyPair);

        window.close();
      }
    });
  });



  function generateQrCode(input) {
    const qrCodeDiv = document.querySelector(".qr-code");
    var qrcode = new QRCode(qrCodeDiv, {
      text: input,
      width: 512,
      height: 512,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

}
