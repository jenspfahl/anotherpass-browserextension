
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

const linkedVaultId = localStorage.getItem("linked_vault_id");
const ip = localStorage.getItem("server_address");
const port = localStorage.getItem("server_port");

const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
const pollingInterval = localStorage.getItem("polling_interval") || 2;

document.getElementById("linked_vault_id").innerText = linkedVaultId;

document.getElementById("server-settings-host").value = ip;
document.getElementById("server-settings-port").value = port;

document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
document.getElementById("server-settings-polling-interval").value = pollingInterval;

document.addEventListener("click", async (e) => {

  if (e.target.id === "btn-save-settings") {

    const ip = document.getElementById("server-settings-host").value;
    const port = parseInt(document.getElementById("server-settings-port").value);

    const pollingTimeout = parseInt(document.getElementById("server-settings-polling-timeout").value);
    const pollingInterval = parseInt(document.getElementById("server-settings-polling-interval").value);


    if (!ip || ip == "") {
      bsAlert("Error", "A host is required");
    }
    else if (isNaN(port) || port < 1024 || port > 49151) {
      bsAlert("Error", "A nummeric port number is required, which should be between 1024 and 49151.");
    }
    else if (isNaN(pollingTimeout) || pollingTimeout < 1 || pollingTimeout > 300) {
      bsAlert("Error", "Invalid polling timeout, should be a number between 1 and 300.");
    }
    else if (isNaN(pollingInterval) || pollingInterval < 1 || pollingInterval > 60) {
      bsAlert("Error", "Invalid polling interval, should be a number between 1 and 60.");
    }
    else {
      localStorage.setItem("server_address", ip);
      localStorage.setItem("server_port", port);
      localStorage.setItem("polling_timeout", pollingTimeout);
      localStorage.setItem("polling_interval", pollingInterval);

      bsAlert("Success", "Settings sucessfully updated.");
    }

  }

  if (e.target.id === "btn-reset-settings") {
    document.getElementById("server-settings-host").value = ip;
    document.getElementById("server-settings-port").value = port;

    document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
    document.getElementById("server-settings-polling-interval").value = pollingInterval;
  }

  if (e.target.id === "link") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

  } else if (e.target.id === "relink") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
      relink: true
    });

  } else if (e.target.id === "unlink") {

     bsConfirm(
      "Unlink from app", 
      "Are you sure to unlink <b class=\"fingerprint_small\">" + webClientId + "</b> from the app?",
      "Unlink"
    )
    .then((decision) => {
      if (decision === true) {
        chrome.runtime.sendMessage({
          action: "start_unlink_flow",
        }).then((response) => {
          updateMenuUi(null, null);

          bsAlert("Success", "App successfully un-linked! You can remove the linked device <b class=\"fingerprint_small\">" + webClientId + "</b> from your app.").then(_ => {
            window.close();
          });

        });
      }
     });

  }
  else if (e.target.id === "lock") {
    bsAlert("Error", "This operation is not yet supported!");
  }
  else if (e.target.id === "fetch_credential") {
    const sending = chrome.runtime.sendMessage({
      action: "start_single_password_request_flow"
    });
  }
  else if (e.target.id === "details") {

    const clientKeyPair = await getKey("client_keypair");
    const clientPublicKeyFingerprint = await getPublicKeyStandarizedFingerprint(clientKeyPair.publicKey, ":");
    
    const appPublicKey = await getKey("app_public_key");
    const appKeyFingerprint = await getPublicKeyStandarizedFingerprint(appPublicKey, ":");


    const baseKey = await getKey("base_key");
    const baseKeyAsArray = await aesKeyToArray(baseKey);
    const baseKeyFingerprint = await sha256(baseKeyAsArray);

    bsAlert("Info for " + webClientId, `
    <div class="container">
      App Public Key Fingerprint: <b class=\"fingerprint_small font-monospace\">${appKeyFingerprint}</b>&nbsp;&nbsp;<br>
      Device Public Key Fingerprint: <b class=\"fingerprint_small font-monospace\">${clientPublicKeyFingerprint}</b>&nbsp;&nbsp;<br>
      Shared Secret Fingerprint: <b class=\"fingerprint_small font-monospace\">${bytesToHex(baseKeyFingerprint, ":")}</b>&nbsp;&nbsp;<br>
    </div>
    `);
  }
});


updateMenuUi(webClientId, linked);


function updateMenuUi(webClientId, linked) {
  if (webClientId && linked) {
    console.debug("menu linked mode");
    document.getElementById("state").innerText = "Linked (as " + webClientId + ")";
    document.getElementById("link").classList.add("d-none");

    document.getElementById("nav-credentials-tab").classList.add("active");
    document.getElementById("nav-credentials").classList.add("show");
    document.getElementById("nav-credentials").classList.add("active");


  }
  else {
    console.debug("menu unlinked mode");

    document.getElementById("state").innerText = "Not linked";
    document.getElementById("unlink").classList.add("d-none");
    document.getElementById("nav-credentials-tab").classList.add("d-none");
    document.getElementById("nav-settings-tab").classList.add("d-none");

    document.getElementById("nav-help-tab").classList.add("active");
    document.getElementById("nav-help").classList.add("show");
    document.getElementById("nav-help").classList.add("active");

  }
}


