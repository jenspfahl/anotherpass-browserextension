
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

const linkedVaultId = localStorage.getItem("linked_vault_id");

const lockTimeout = localStorage.getItem("lock_timeout") || 60;

const ip = localStorage.getItem("server_address");
const port = localStorage.getItem("server_port");

const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
const pollingInterval = localStorage.getItem("polling_interval") || 2;

document.getElementById("linked_vault_id").innerText = linkedVaultId;

document.getElementById("server-settings-lock-timeout").value = lockTimeout;


document.getElementById("server-settings-host").value = ip;
document.getElementById("server-settings-port").value = port;

document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
document.getElementById("server-settings-polling-interval").value = pollingInterval;

const searchInput = document.getElementById("search_input");

searchInput.addEventListener("input", (e) => updateCredentialList(e.target.value));

document.addEventListener("click", async (e) => {

  if (e.target.id === "btn-save-settings") {

    const lockTimeout = parseInt(document.getElementById("server-settings-lock-timeout").value);

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
    else if (isNaN(lockTimeout) || lockTimeout < 1 || lockTimeout > 10080) {
      bsAlert("Error", "Invalid lock timeout, should be a number between 1 and 10080.");
    }
    else {
      localStorage.setItem("server_address", ip);
      localStorage.setItem("server_port", port);
      localStorage.setItem("polling_timeout", pollingTimeout);
      localStorage.setItem("polling_interval", pollingInterval);
      localStorage.setItem("lock_timeout", lockTimeout);


      bsAlert("Success", "Settings sucessfully updated.");
    }

  }

  if (e.target.id === "btn-reset-settings") {
    document.getElementById("server-settings-host").value = ip;
    document.getElementById("server-settings-port").value = port;

    document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
    document.getElementById("server-settings-polling-interval").value = pollingInterval;

    document.getElementById("server-settings-lock-timeout").value = lockTimeout;

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
  else if (e.target.id === "lock" || e.target.id === "lock_icon") {
    const isUnlocked = await isLocalVaultUnlocked();
    if (isUnlocked) {
      // lock local vault
      deleteTemporaryKey("clientKey");
      updateVaultUi();
      document.getElementById("credential_list").remove();
      updateExtensionIcon();
    }
    else {
      //request clientKey from app
      chrome.runtime.sendMessage({
        action: "start_client_key_request_flow"
      });
    }
  }
  else if (e.target.id === "sync_credentials") {
    chrome.runtime.sendMessage({
      action: "start_sync_passwords_request_flow"
    });
  }
  else if (e.target.id === "fetch_credential") {
    chrome.runtime.sendMessage({
      action: "start_single_password_request_flow"
    });
  }
  else if (e.target.id === "fetch_multiple_credentials") {
    chrome.runtime.sendMessage({
      action: "start_multiple_passwords_request_flow"
    });
  }
  else if (e.target.id === "fetch_all_credentials") {
    chrome.runtime.sendMessage({
      action: "start_all_passwords_request_flow"
    });
  }
  else if (e.target.id === "delete_all_credentials") {
    bsConfirm("Delete all local credentials", 
    "Are you sure to delete all credentials from the local vault? This wont delete any credenial from the linked device.")
    .then(async (decision) => {
      if (decision === true) {
        console.log("clearing local vault");
      
        for (var i = 0; i < localStorage.length; i++){
          const key = localStorage.key(i);
    
          if (key.startsWith(PREFIX_CREDENTIAL)) {
            localStorage.removeItem(key);
          }
        }
        
        document.getElementById("credential_list").innerHTML = "";
        updateCredentialCountUi(0);
        bsAlert("Success", "Local vault cleared.");
      }
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
  else if (e.target.id === "clear_search" || e.target.id === "clear_search_icon") {
    searchInput.value = "";
    updateCredentialList("");
    searchInput.focus();
  }
});


updateMenuUi(webClientId, linked);


function updateVaultUi(unlocked) {
  if (unlocked) {
    document.getElementById("lock_icon").innerText = "lock_open";
    document.getElementById("lock").title = "Lock local vault";
    document.getElementById("sync_credentials").classList.remove("d-none");
    document.getElementById("credential_list").classList.remove("d-none");
    document.getElementById("delete_all_credentials_divider").classList.remove("d-none");
    document.getElementById("delete_all_credentials").classList.remove("d-none");
    document.getElementById("search_group").classList.remove("d-none");

    searchInput.focus();

  }
  else {
    document.getElementById("lock_icon").innerText = "lock";
    document.getElementById("lock").title = "Unlock local vault";
    document.getElementById("vaultStatus").innerText = "- local vault locked -";
    document.getElementById("sync_credentials").classList.add("d-none");
    document.getElementById("credential_list").classList.add("d-none");
    document.getElementById("delete_all_credentials_divider").classList.add("d-none");
    document.getElementById("delete_all_credentials").classList.add("d-none");
    document.getElementById("search_group").classList.add("d-none");

  }
  updateExtensionIcon(unlocked)
}

function updateMenuUi(webClientId, linked) {
  if (webClientId && linked) {
    console.debug("menu linked mode");
    document.getElementById("state").innerText = "Linked (as " + webClientId + ")";
    document.getElementById("link").classList.add("d-none");

    document.getElementById("navCredentialsTab").classList.add("active");
    document.getElementById("navCredentials").classList.add("show");
    document.getElementById("navCredentials").classList.add("active");


  }
  else {
    console.debug("menu unlinked mode");

    document.getElementById("state").innerText = "Not linked";
    document.getElementById("unlink").classList.add("d-none");
    document.getElementById("navCredentialsTab").classList.add("d-none");
    document.getElementById("nav-settings-tab").classList.add("d-none");
    document.getElementById("vaultStatus").classList.add("d-none");

    document.getElementById("nav-help-tab").classList.add("active");
    document.getElementById("nav-help").classList.add("show");
    document.getElementById("nav-help").classList.add("active");

  }
}


(async () => {

  const clientKey = await getClientKey();
  updateVaultUi(clientKey);

  if (!clientKey) {
    console.debug("Local vault locked, nothing to display");
    return;
  }
  else {

    const list = document.getElementById("credential_list");
    
    const credentials = [];

    for (var i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);

      if (key.startsWith(PREFIX_CREDENTIAL)) {
        const credential = JSON.parse(await decryptMessage(clientKey, value));
        //console.debug("credential", credential);
        credentials.push(credential);
      }
    }

    let credentialCount = credentials.length;
    updateCredentialCountUi(credentialCount);

    credentials.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    
    credentials.forEach(credential => {
      let uuid = credential.uid;

      const li = document.createElement("li");

      let searchable = credential.name.trim().toLowerCase();
      if (credential.website) {
        searchable = searchable + " " + credential.website.trim().toLowerCase();
      }
      li.setAttribute("searchable", searchable);
      li.classList.add("no-bullets");
      li.innerHTML = `
        <div class="nav-link my-1 mr-3">
          <button id="credential_dropdown_${uuid}" class="btn">
          ${credential.name.substring(0, 35)}
          </button>
          <div class="btn-group float-end">
            <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            </button>
            <ul class="dropdown-menu">
              <button id="showDetails_${uuid}" class="btn dropdown-item" title="Show details of the credential">Show details</button>
              <button id="syncWithApp_${uuid}" class="btn dropdown-item" title="Synchronise this credential with the app">Sync with app</button>
   
              <li><hr class="dropdown-divider"></li>
              <button id="delete_${uuid}" class="btn dropdown-item" title="Delete this credential from the local vault">Delete</button>

            </ul>
          </div>
        </div>
      `;
      list.appendChild(li);

      document.addEventListener("click", async (e) => {
        if (e.target.id === "copy_" + uuid) {
          navigator.clipboard.writeText(credential.password);
          document.getElementById("copy_" + uuid).innerText = "Copied!";
        }
        if (e.target.id === "password_field_" + uuid) {
          document.getElementById("password_field_" + uuid).innerText = credential.password;
        }
        if (e.target.id === "credential_dropdown_" + uuid) {
          bsAlert(
            "Credential '" + credential.name + "'", 
            `
            <div class="container text-left">
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    Website:
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <a target="_blank" href="${credential.website}">${credential.website}</a>
                  </div>
                </div>
              
                
              </div>
            
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    User:
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <b>${credential.user}</b>
                  </div>
                </div>
               
              </div>
           
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    Password:
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <b id="password_field_${uuid}" class="fingerprint_small cursor-pointer">**************  </b>
                    <button type="button" id="copy_${uuid}" title="Copy password to clipboard" class="btn btn-outline-primary rounded-0">Copy</button>
                  </div>
                </div>
              
              </div>


            </div>
  
            `
          );
        }
        if (e.target.id === "showDetails_" + uuid) {
          bsAlert(
            "Details for '" + credential.name + "'",
            ` 
            <b> Imported at:</b> ${credential.createdAt != undefined ? new Date(credential.createdAt).toLocaleString() : ""}
            <br>
            <b> UID:</b> ${credential.readableUid}
            `
          );
        }
        if (e.target.id === "syncWithApp_" + uuid) {
          chrome.runtime.sendMessage({
            action: "start_sync_password_request_flow",
            uid: uuid
          });
        }
        if (e.target.id === "delete_" + uuid) {
          bsConfirm(
            "Delete '" + credential.name + "'",
            "Are you sure to delete this credential from the local vault?"
          )
          .then(async (decision) => {
            console.log("decision:" + decision);
            if (decision === true) {
              localStorage.removeItem(PREFIX_CREDENTIAL + uuid);
              list.removeChild(li);
              credentialCount--;
              updateCredentialCountUi(credentialCount);
            }
          });
        }

      }); 
    
    });
   

  }


 
})()

function updateCredentialList(searchFor) {

  const searchString = searchFor.toLowerCase().trim();

  const list = document.getElementById("credential_list");
  const children = list.children;
  let count = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const searchable =  child.getAttribute("searchable");
    if (searchable.includes(searchString)) {
      child.classList.remove("d-none");
      count++;
    }
    else {
      child.classList.add("d-none");
    }
  }
  updateCredentialCountUi(count);
}


function updateCredentialCountUi(credentialCount) {
  document.getElementById("vaultStatus").innerText = credentialCount + " credentials";
}

