const linked = localStorage.getItem("linked");

if (!linked) {

  const webClientId = generateWebClientId();

  console.log("webClientId = " + webClientId);

  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  document.getElementById("instruction").innerText = "Scan this QR code with the ANOTHERpass app and enter the provided IP / hostname.";
  document.getElementById("host").value = ip;
  document.getElementById("port").value = port || 8787;

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

      if (e.target.id === "cancel") {
        window.close();
      }

      if (e.target.id === "next") {

        // TODO check and save data
        const ip = document.getElementById("host").value;
        const port = parseInt(document.getElementById("port").value);

        if (!ip || ip == "") {
          bsAlert("Error", "A host is required");
        }
        else if (isNaN(port) || port < 1024 || port > 49151) {
          bsAlert("Error", "A nummeric port number is required, which should be between 1024 and 49151.");
        }
        else {

          document.getElementById("next").disabled = true;
          
          document.querySelector("#loading_pad").style.display = '';
          document.querySelector("#qr_code_pad").style.display = 'none';


          localStorage.setItem("server_address", ip);
          localStorage.setItem("server_port", port);
          
          const sending = chrome.runtime.sendMessage({
            action: "link_to_app"
          }).then(async response => {
            if (response == null || response.response == null) {
              console.log("linking error from server, see previous logs");
              bsAlert("Error", "Cannot link with the app. Check whether the IP or hostname is correct and you have scanned the QR code with ANOTHERpass app.");
              document.getElementById("next").disabled = false;
              document.querySelector("#loading_pad").style.display = 'none';
              document.querySelector("#qr_code_pad").style.display = '';
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

              const linkedVaultId = response.response.linkedVaultId;
              localStorage.setItem("linked_vault_id", linkedVaultId);


              const baseKeyAsArray = base64ToBytes(response.response.sharedBaseKey);
              localStorage.setItem("symmetric_key_length", baseKeyAsArray.length * 8);

              const baseKey = await arrayToAesKey(baseKeyAsArray);
              await setKey("base_key", baseKey);

              console.log("save shared base key:", baseKeyAsArray);

              const publicKeyFingerprint = await getPublicKeyShortenedFingerprint(appPublicKey);

              bsConfirm(
                "Confirm app link", 
                "Ensure that the fingerprint <h1 class=\"fingerprint\">" + publicKeyFingerprint + "</h1> is the same as shown in the app and don't forget to accept there too.",
                "Yes, same",
                "No, different"
              )
              .then((decision) => {
                if (decision === true) {
                  localStorage.setItem("linked", true);

                  destroySessionKey();

                  bsAlert("Success", "Extension successfully linked to vault <b>" + linkedVaultId + "</b> with the link identifier <b class=\"fingerprint\">" + webClientId + "</b>.").then(_ => {
                    window.close();
                  });
                }
                else if (decision === false) {
                  localStorage.removeItem("linked");
                  localStorage.removeItem("web_client_id");
                  localStorage.removeItem("server_address");
                  localStorage.removeItem("server_port");
                  localStorage.removeItem("linked_vault_id");
                  localStorage.removeItem("symmetric_key_length");

                  destroyAllKeys();

                  bsAlert("Failure", "Linking the extension has been denied in the app.").then(_ => {
                    window.close();
                  });
                }
               });

            }

          },
          error => {
            console.log("unknown linking error from server: ", error);
            bsAlert("Error", "Cannot link with the app due to an unknown problem").then(_ => {
              window.close();
            });
          });

        }
      }
    });
  });



  function generateQrCode(input) {
    document.querySelector("#loading_pad").style.display = 'none';

    const qrCodeDiv = document.querySelector("#qr_code_pad");
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
  bsAlert("Error", "Extension already linked with the app!").then(_ => {
    window.close();
  });
}
