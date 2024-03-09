const linked = localStorage.getItem("linked");

if (!linked) {

  const webClientId = generateWebClientId();

  console.log("webClientId = " + webClientId);

  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  document.getElementById("instruction").innerText = "Scan this QR code with the ANOTHERpass app and enter the IP / hostname provided by the app.";
  document.getElementById("ip").value = ip;
  document.getElementById("port").value = port || 8001;


  destroyClientKeyPair(); // ensure regeneration
  generateOrGetClientKeyPair().then(async keyPair => {
    const publicKeyAsPEM = await publicKeyToPEM(keyPair.publicKey);
    console.log(publicKeyAsPEM);

    const publicKeyFingerprint = await getPublicKeyFingerprint(keyPair.publicKey);
    console.log("Fingerprint: " + publicKeyFingerprint);

    destroyCurrentSessionKey();
    const sessionKey = await generateOrGetSessionKey();
    const sessionKeyAsArray = await sessionKeyToArray(sessionKey);
    console.log("AES Session Key = " + bytesToBase64(sessionKeyAsArray));
/*
    const encryptedMessage = await encryptMessage(sessionKey, "secret");
    console.log("Encrypted message = " + encryptedMessage);

    const encSessionKey = await encryptWithPublicKey(keyPair.publicKey, sessionKeyAsArray);
    console.log("Encrypted AES Session Key = " + bytesToBase64(encSessionKey));


    const decSessionKeyAsArray = await decryptWithPrivateKey(keyPair.privateKey, encSessionKey);
    console.log("Decrypted AES Session Key = " + bytesToBase64(decSessionKeyAsArray));

    const decSessionKey = await arrayToSessionKey(decSessionKeyAsArray);
    const decryptedMessage = await decryptMessage(decSessionKey, encryptedMessage);
    console.log("Decrypted message = " + decryptedMessage);
*/
    document.getElementById("web_client_id").innerText = webClientId;

    localStorage.setItem("web_client_id", webClientId);

    storeKeyPair("client_keypair", keyPair);


    const qrCodeInput = `${webClientId}:${bytesToBase64(sessionKeyAsArray)}:${publicKeyFingerprint}`;
    generateQrCode(qrCodeInput);


    document.addEventListener("click", (e) => {

      if (e.target.id === "next") {

        // TODO check and save data
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value;

        if (!ip) {
          alert("A host is required");
        }
        else if (!port) {
          alert("A port is required");
        }
        else {

          localStorage.setItem("server_address", ip);
          localStorage.setItem("server_port", port);
          
          const sending = chrome.runtime.sendMessage({
            action: "link_to_app"
          }).then(response => {
            console.log("linking response: " + JSON.stringify(response))
            if (response.response == null) {
              console.log("linking error from server, see previous logs");
              alert("Cannot link with the app. Check whether the IP is correct.");
            }
            else {
            localStorage.setItem("linked", true);
            destroyCurrentSessionKey();
            window.close();
            }

          },
          error => {
            console.log("unknown linking error from server: ", error);
            alert("Cannot link with the app due to an unknown problem");
          });

        }
      }
    });
  });



  function generateQrCode(input) {
    document.getElementById("loading_icon").remove();
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
else {
  alert("Something went wrong :(")
}
