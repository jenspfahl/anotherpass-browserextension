const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));
const relink = requestData.relink
const linked = localStorage.getItem("linked");


if (!linked || relink) {


  document.querySelector("#qr_code_pad").style.display = 'none';

  getTemporaryKey("is_linking").then((result) => {    

    const isLinking = result;
    if (isLinking) {
      console.log("linking concurrently in process");
      bsAlert("Error", "It seems there a different linking phase in progress. Please finish or close this one first.").then(_ => {
        window.close();
      });
    }
    else {
    
      window.onbeforeunload = function () {
        deleteTemporaryKey("is_linking");
      }
  
      setTemporaryKey("is_linking", true);

      const currentVaultId = localStorage.getItem("linked_vault_id")

      let webClientId;
      if (relink) {
        document.getElementById("headline").innerHTML = "Re-link with ANOTHERpass app";
        document.getElementById("instruction").innerHTML = "Open the ANOTHERpass app with vault id <b>" + currentVaultId + "</b>, scan the QR code below with the ANOTHERpass app, input the provided IP / hostname and click Next. The re-linking may take a few minutes.";
        webClientId = localStorage.getItem("web_client_id");
      }
      else {
        document.getElementById("instruction").innerText = "Scan this QR code with the ANOTHERpass app, input the provided IP / hostname and click Next. The linking-process may take a few minutes.";
        webClientId = generateWebClientId();
      }

  
      console.debug("webClientId = " + webClientId);
  
      const ip = localStorage.getItem("server_address");
      const port = localStorage.getItem("server_port");
      document.getElementById("host").value = ip;

      document.addEventListener("input", (e) => {
        if (e.target.id === "host") {
          e.target.title = "";
    
          if (isValidIPAdressOrHostnameOrHandle(e.target.value)) {
            e.target.classList.remove("invalid-state");
            const ipFromHandle = handleToIpAddress(e.target.value);
            if (ipFromHandle) {
              e.target.title = "The handle will be translated to " + ipFromHandle;
            }
          }
          else {
            e.target.classList.add("invalid-state");
            e.target.title = "Server address invalid! Won't be stored.";
          }
        }
      });

      
      document.getElementById("port").value = port || 8787;
  
      document.getElementById("next").disabled = true;
  
      linkApp(relink, webClientId)
    }
  });
}
else {
  bsAlert("Error", "Extension already linked with the app!").then(_ => {
    window.close();
  });
}


function generateQrCode(input) {
  document.querySelector("#loading_pad").style.display = 'none';
  document.querySelector("#qr_code_pad").style.display = '';

  const qrCodeDiv = document.querySelector("#qr_code_pad");
  new QRCode(qrCodeDiv, {
    text: input,
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

async function linkApp(relink, webClientId) {

  document.getElementById("web_client_id").innerText = webClientId;
  
  if (!relink) {
    // ensure clean state before initial link
    await destroyAllKeys();
  }
  const clientKeyPair = await generateClientKeyPair();
  const publicKeyFingerprint = await getPublicKeyFingerprint(clientKeyPair.publicKey);
  //console.debug("Fingerprint: " + publicKeyFingerprint);

  await destroySessionKey();
  const sessionKey = await generateOrGetSessionKey();
  const sessionKeyAsArray = await aesKeyToArray(sessionKey);
  //console.debug("Linking Session Key = " + bytesToBase64(sessionKeyAsArray));

  const qrCodeInput = `${webClientId}:${bytesToBase64(sessionKeyAsArray)}:${publicKeyFingerprint}`;
  generateQrCode(qrCodeInput);

  document.getElementById("next").disabled = false;

  document.addEventListener("click", async (e) => {

    if (e.target.id === "cancel") {
      window.close();
    }

    if (e.target.id === "next") {

      const ip = document.getElementById("host").value;
      const port = parseInt(document.getElementById("port").value);

      if (!ip || ip == "") {
        bsAlert("Error", "A handle, hostname or IP address is required");
      }
      else if (!isValidIPAdressOrHostnameOrHandle(ip)) {
        bsAlert("Error", "Invalid handle, hostname or IP address");
      }
      else if (isNaN(port) || port < 1024 || port > 49151) {
        bsAlert("Error", "A nummeric port number is required, which should be between 1024 and 49151.");
      }
      else {

        // update UI
        document.getElementById("next").disabled = true; 
        document.querySelector("#loading_pad").style.display = '';
        document.querySelector("#qr_code_pad").style.display = 'none';

        // save state temporary
        setTemporaryKey("web_client_id", webClientId);
        setTemporaryKey("server_address", ip);
        setTemporaryKey("server_port", port);
        await setKey("temp_client_keypair", clientKeyPair); // we cannot set this as TemporaryKey due to privileged access to CryptoKeys
        
        // remote call to the app
        chrome.runtime.sendMessage({
          action: "link_to_app",
        }).then(async response => {

          await deleteKey("temp_client_keypair");

          if (response == null || response.response == null) {
            if (response.error) {
              console.error("linking error from server: " + response.error);
              bsAlert("Error", "Cannot link with the app. Check whether the IP or hostname is correct and you have scanned the QR code with ANOTHERpass app.<br><code>Error: " + response.error + "</code>");
              
            }
            else {
              console.error("linking error from server, see previous logs");
              bsAlert("Error", "Cannot link with the app. Check whether the IP or hostname is correct and you have scanned the QR code with ANOTHERpass app.");
              
            }
            document.getElementById("next").disabled = false;
            document.querySelector("#loading_pad").style.display = 'none';
            document.querySelector("#qr_code_pad").style.display = '';
          }
          else {

            // read app public key
            const jwk = {
              kty:"RSA",
              n: response.response.serverPubKey.n,
              e: response.response.serverPubKey.e,
              alg: "RSA-OAEP"
            };
            const appPublicKey = await jwkToPublicKey(jwk);

            // read apps vault id
            const newVaultId = response.response.linkedVaultId;
            const currentVaultId = localStorage.getItem("linked_vault_id")
            if (relink && newVaultId !== currentVaultId) {
              console.error("relink vault id mismatch: current: " + currentVaultId + ", new:" + newVaultId);
              bsAlert("Error", "Cannot re-link to a different vault id (<b>" + newVaultId + "</b>). Current: <b>" + currentVaultId + "</b>").then(_ => {
                window.close();
              });
              return;
            }

            setTemporaryKey("linked_vault_id", newVaultId);

            // read app generated base key
            const baseKeyAsArray = base64ToBytes(response.response.sharedBaseKey);
            const baseKey = await arrayToAesKey(baseKeyAsArray);
            setTemporaryKey("symmetric_key_length", baseKeyAsArray.length * 8);
          
            //console.debug("save shared base key:", baseKeyAsArray);

            const publicKeyFingerprint = await getPublicKeyShortenedFingerprint(appPublicKey);

            bsConfirm(
              "Confirm app link <b>" + webClientId + "</b>", 
              "Ensure that the fingerprint <h1 class=\"fingerprint\">" + publicKeyFingerprint + "</h1> is the same as shown in the app and don't forget to accept there too.",
              "Yes, same",
              "No, different"
            )
            .then(async (decision) => {
              if (decision === true) {

                // persist temporary state
                localStorage.setItem("linked", true);
                localStorage.setItem("web_client_id", webClientId);
                localStorage.setItem("server_address", ip);
                localStorage.setItem("server_port", port);
                localStorage.setItem("linked_vault_id", newVaultId);
                localStorage.setItem("symmetric_key_length", baseKeyAsArray.length * 8);
                await setKey("client_keypair", clientKeyPair);
                await setKey("app_public_key", appPublicKey);
                await setKey("base_key", baseKey);
                
                // delete temporary state
                deleteTemporaryKeys();
                destroySessionKey();

                chrome.runtime.sendMessage({
                  action: "create_context_menu"
                });

                setTemporaryKey("linked", true);

                bsAlert("Success", "Extension successfully linked to vault <b>" + newVaultId + "</b> with the link identifier <b class=\"fingerprint\">" + webClientId + "</b>.").then(_ => {
                  window.close();
                });
              }
              else if (decision === false) {
                // delete temporary state, let current persistent state untouched
                deleteTemporaryKeys();
                destroySessionKey();

                bsAlert("Failure", "Linking the extension has been denied in the app.").then(_ => {
                  window.close();
                });
              }
            });

          }

        },
        error => {
          console.error("unknown linking error from server: ", error);
          bsAlert("Error", "Cannot link with the app due to an unknown problem").then(_ => {
            window.close();
          });
        });

      }
    }
  });

  function deleteTemporaryKeys() {
    deleteTemporaryKey("web_client_id");
    deleteTemporaryKey("client_keypair");
    deleteTemporaryKey("server_address");
    deleteTemporaryKey("server_port");
    deleteTemporaryKey("app_public_key");
    deleteTemporaryKey("linked_vault_id");
    deleteTemporaryKey("symmetric_key_length");
    deleteTemporaryKey("base_key");
  }

}

