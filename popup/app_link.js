const linked = localStorage.getItem("linked");

if (!linked) {

  const webClientId = generateWebClientId();

  console.log("webClientId = " + webClientId);

  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  document.getElementById("instruction").innerText = "Scan this QR code with the ANOTHERpass app and enter the IP / hostname provided by the app.";
  document.getElementById("ip").value = ip;
  document.getElementById("port").value = port || 8001;

  document.getElementById("next").disabled = true;

  // ensure regeneration
  destroyAllKeys().then(async _ => {

    const keyPair = await generateOrGetClientKeyPair();
    const publicKeyFingerprint = await getPublicKeyFingerprint(keyPair.publicKey);
    console.log("Fingerprint: " + publicKeyFingerprint);

    const sessionKey = await generateOrGetSessionKey();
    const sessionKeyAsArray = await aesKeyToArray(sessionKey);
    console.log("Linking Session Key = " + bytesToBase64(sessionKeyAsArray));

    document.getElementById("web_client_id").innerText = webClientId;

    localStorage.setItem("web_client_id", webClientId);

    await setKey("client_keypair", keyPair);


    const qrCodeInput = `${webClientId}:${bytesToBase64(sessionKeyAsArray)}:${publicKeyFingerprint}`;
    generateQrCode(qrCodeInput);

    document.getElementById("next").disabled = false;


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

          document.getElementById("next").disabled = true;
          
          document.querySelector(".loading-indicator").style.display = '';
          document.querySelector(".qr-code").style.display = 'none';


          localStorage.setItem("server_address", ip);
          localStorage.setItem("server_port", port);
          
          const sending = chrome.runtime.sendMessage({
            action: "link_to_app"
          }).then(async response => {
            if (response == null || response.response == null) {
              console.log("linking error from server, see previous logs");
              alert("Cannot link with the app. Check whether the IP is correct and you have scanned the QR code with ANOTHERpass app.");
              document.getElementById("next").disabled = false;
              document.querySelector(".loading-indicator").style.display = 'none';
              document.querySelector(".qr-code").style.display = '';
            }
            else {

              console.log("linking response: " + response.response.serverPubKey.n)

              // read app public key
              const jwk = {
                kty:"RSA",
                n: response.response.serverPubKey.n,
                e: response.response.serverPubKey.e,
                alg: "RSA-OAEP"
              };

        
              console.log("jwk.n64 in:", base64ToBytes(jwk.n))
              const appPublicKey = await jwkToPublicKey(jwk);
              
              await setKey("app_public_key", appPublicKey);


              // read app generated base key

              const baseKeyAsArray = base64ToBytes(response.response.sharedBaseKey);
              const baseKey = await arrayToAesKey(baseKeyAsArray);
              await setKey("base_key", baseKey);

              console.log("save shared base key:", baseKeyAsArray);

              window.close();

              chrome.runtime.sendMessage({
                action: "continue_link_flow",
              });
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
    document.querySelector(".loading-indicator").style.display = 'none';

    const qrCodeDiv = document.querySelector(".qr-code");
    const qrcode = new QRCode(qrCodeDiv, {
      text: input,
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

}
else {
  alert("Something went wrong :(")
}
