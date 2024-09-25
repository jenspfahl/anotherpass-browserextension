
chrome.runtime.sendMessage({
  action: "close_all_credential_dialogs",
});


getLocalValue("linked").then(async (linked) => {

  const webClientId = await getLocalValue("web_client_id");
  const linkedVaultId = await getLocalValue("linked_vault_id");

  const lockTimeout = await getLocalValue("lock_timeout") || 60;
  const renderContentIcon = await getLocalValue("render_content_icon");


  // load current configurated server
  const server = await getLocalValue("server_address");
  const hostField = document.getElementById("server-settings-host");
  hostField.value = server;
  const ipFromHandle = handleToIpAddress(hostField);
  if (ipFromHandle) {
    hostField.title = "The handle will be translated to " + ipFromHandle;
  }

  document.addEventListener("input", (e) => {
    if (e.target.id === "server-settings-host") {
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


  // load all known servers
  await loadAlternativeServersToUi();
  const hostSelector = document.getElementById("host_selector");
  hostSelector.addEventListener("change", function() {
    if (hostField.value) {
      hostField.value = hostSelector.value;
      const ipFromHandle = handleToIpAddress(hostField.value);
      if (ipFromHandle) {
        hostField.title = "The handle will be translated to " + ipFromHandle;
      }
      else {
        hostField.title = "";
      }
      const options = hostSelector.querySelectorAll("option");
      if (options.length > 0) {
          options[0].selected = true;
      }
    }
  });

  const port = await getLocalValue("server_port");

  const pollingTimeout = await getLocalValue("polling_timeout") || 60;
  const pollingInterval = await getLocalValue("polling_interval") || 2;

  document.getElementById("linked_vault_id").innerText = linkedVaultId;

  document.getElementById("server-settings-lock-timeout").value = lockTimeout;
  document.getElementById("render_content_icon").checked = renderContentIcon == undefined || renderContentIcon === "true" || renderContentIcon === true;


  document.getElementById("server-settings-port").value = port;

  document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
  document.getElementById("server-settings-polling-interval").value = pollingInterval;

  const searchInput = document.getElementById("search_input");

  searchInput.addEventListener("input", (e) => updateCredentialList(e.target.value));

  document.addEventListener("click", async (e) => {

    if (e.target.id === "btn-save-settings") {

      const lockTimeout = parseInt(document.getElementById("server-settings-lock-timeout").value);
      const renderContentIcon = document.getElementById("render_content_icon").checked;


      const server = hostField.value;
      const port = parseInt(document.getElementById("server-settings-port").value);

      const pollingTimeout = parseInt(document.getElementById("server-settings-polling-timeout").value);
      const pollingInterval = parseInt(document.getElementById("server-settings-polling-interval").value);


      if (!server || server == "") {
        bsAlert("Error", "A handle, hostname or IP address is required");
      }
      else if (!isValidIPAdressOrHostnameOrHandle(server)) {
        bsAlert("Error", "Invalid handle, hostname or IP address");
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
        await addNewAlternativeServer(server);
        await loadAlternativeServersToUi();
              
        await setLocalValue("server_port", port);
        await setLocalValue("polling_timeout", pollingTimeout);
        await setLocalValue("polling_interval", pollingInterval);
        await setLocalValue("lock_timeout", lockTimeout);
        await setLocalValue("render_content_icon", renderContentIcon);
        setTemporaryKey("render_content_icon", renderContentIcon);

        bsAlert("Success", "Settings sucessfully updated.");
      }

    }

    if (e.target.id === "btn-reset-settings") {
      document.getElementById("server-settings-host").value = server;
      document.getElementById("server-settings-port").value = port;

      document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
      document.getElementById("server-settings-polling-interval").value = pollingInterval;

      document.getElementById("server-settings-lock-timeout").value = lockTimeout;
      document.getElementById("render_content_icon").checked = true;


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
        "Are you sure to unlink <b class=\"fingerprint_small\">" + webClientId + "</b> from the app? This will also wipe the local vault with all local credentials.",
        "Unlink"
      )
      .then((decision) => {
        if (decision === true) {
          chrome.runtime.sendMessage({
            action: "start_unlink_flow",
          }).then(async (response) => {
            updateMenuUi(null, null);

            await loadAlternativeServersToUi()


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
        
          const all = await getAllLocalValues();
          for (const [key, _] of all) {
      
            if (key.startsWith(PREFIX_CREDENTIAL)) {
              await removeLocalValue(key);
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
    else if (e.target.id === "manage_servers") {

      const currentServer = await getLocalValue("server_address");

      const allServers = await loadAllServers();
    

      const html = [];
      const serversToBeDeleted = [];
      const changedHosts = new Map();
      const changedDescriptions = new Map();
      let addedHost, addedDescription;

      html.push("<h6>All server addresses in this list can be used to connect to the ANOTHERpass app. For example if you use a laptop in different networks, server addresses of the phone to connect can differ. Changing anything here doesn'r effect the current configured server address.</h6>");
    

      allServers.map((server) => {

        const ipFromHandle = handleToIpAddress(server.host);
        let hostTooltip = "";
        if (ipFromHandle) {
          hostTooltip = "The handle will be translated to " + ipFromHandle;
        }
              
        let htmlLine;
        if (server.host === currentServer) {
          htmlLine = `
          <h8> - Current server -</h8>
          <div id="server_row_${server.host}" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="server_host_${server.host}" value="${server.host}" title="${hostTooltip}" class="form-control input-sm" type="text" placeholder="IP or hostname" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="server_description_${server.host}" value="${server.description}" class="form-control input-sm" type="text" placeholder="Notes" aria-label="server notes">
            </div>
          </div>

      `;
        }
        else {
          htmlLine = `
          <div id="server_row_${server.host}" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="server_host_${server.host}" value="${server.host}" title="${hostTooltip}" class="form-control input-sm" type="text" placeholder="IP or hostname" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="server_description_${server.host}" value="${server.description}" class="form-control input-sm" type="text" placeholder="Notes" aria-label="server notes">
            </div>
            <div class="col-1">
              <button id="delete_server_${server.host}" class="btn">
                <span id="delete_server_${server.host}" class="material-symbols-outlined size-24">
                  delete
                </span>
              </button>
            </div>
          </div>

      `;
        }
        
        html.push(htmlLine);
    

        document.addEventListener("input", (e) => {
          if (e.target.id === "server_host_" + server.host) {
            e.target.title = "";

            if (isValidIPAdressOrHostnameOrHandle(e.target.value)) {
              changedHosts.set(server.host, e.target.value);
              e.target.classList.remove("invalid-state");
              const ipFromHandle = handleToIpAddress(e.target.value);
              if (ipFromHandle) {
                e.target.title = "The handle will be translated to " + ipFromHandle;
              }
            }
            else {
              console.log("host invald", e.target.value);
              e.target.classList.add("invalid-state");
              e.target.title = "Server address invalid! Won't be stored.";
            }
      
            
          }
          else if (e.target.id === "server_description_" + server.host) {
            changedDescriptions.set(server.host, e.target.value);
          }
        });


        document.addEventListener("click", (e) => {
          if (e.target.id === "delete_server_" + server.host) {
            e.target.innerText = "";
            const row = document.getElementById("server_row_" + server.host);
            if (row) {
              row.innerHTML = "<i> - " + server.host + " marked for deletion - </i>";
              serversToBeDeleted.push(server.host);
            }
          }

        }); 

      });

      html.push(`
        <h8> - New server -</h8>
          <div id="new_server_row" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="new_server_host" class="form-control input-sm" type="text" placeholder="IP or hostname" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="new_server_description" class="form-control input-sm" type="text" placeholder="Notes" aria-label="server notes">
            </div>
          </div>
        `);

      document.addEventListener("input", (e) => {
        if (e.target.id === "new_server_host") {
          if (isValidIPAdressOrHostnameOrHandle(e.target.value)) {
            addedHost = e.target.value;
            e.target.classList.remove("invalid-state");
          }
          else {
            console.log("host invald", e.target.value);
            e.target.classList.add("invalid-state");
          }
        }
        else if (e.target.id === "new_server_description") {
          addedDescription = e.target.value;
        }
      });

      bsConfirm("Manage alternative servers", `
      <div class="container">
        ${html.join("")}
      </div>
      `, "Save", "Cancel")
      .then(async (decision) => {
        if (decision === true) {
          // delete all altServers and insert all from UI
          console.debug("serversToBeDeleted", serversToBeDeleted);
          console.debug("changedHosts", changedHosts);
          console.debug("changedDescriptions", changedDescriptions);

          // first delete all marked
          allServers.forEach(async (server) => {

            if (serversToBeDeleted.includes(server.host)) {
              console.debug("delete server " + PREFIX_ALT_SERVER + server.host);
              await removeLocalValue(PREFIX_ALT_SERVER + server.host);
            }
            
          });

          // then update current
          allServers.forEach(async (server) => {

            if (!serversToBeDeleted.includes(server.host)) {
              const currentDescription = await getLocalValue(PREFIX_ALT_SERVER + server.host);

              const changedHost = changedHosts.get(server.host);
              const changedDescription = changedDescriptions.get(server.host);
              console.debug("change server " + PREFIX_ALT_SERVER + server.host + " with " + changedHost + " and " + changedDescription);
              await removeLocalValue(PREFIX_ALT_SERVER + server.host);
              await setLocalValue(PREFIX_ALT_SERVER + (changedHost || server.host), changedDescription === undefined ? currentDescription : changedDescription);
              
            }
          });

          // handle creation
          if (addedHost && addedHost.trim().length > 0) {
            const currentDescription = await getLocalValue(PREFIX_ALT_SERVER + addedHost);
            console.debug("add server " + PREFIX_ALT_SERVER + addedHost + " with " + addedDescription);
            await setLocalValue(PREFIX_ALT_SERVER + addedHost, addedDescription || "");
          }


          await loadAlternativeServersToUi()
        }
      });
    }
  });


  updateMenuUi(webClientId, linked);


});


function updateVaultUi(unlocked) {
  if (unlocked) {
    document.getElementById("lock_icon").innerText = "lock_open";
    document.getElementById("lock").title = "Lock local vault";
    document.getElementById("sync_credentials").classList.remove("d-none");
    document.getElementById("credential_list").classList.remove("d-none");
    document.getElementById("delete_all_credentials_divider").classList.remove("d-none");
    document.getElementById("delete_all_credentials").classList.remove("d-none");
    document.getElementById("search_group").classList.remove("d-none");

    document.getElementById("search_input").focus();

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

    const hint = document.createElement('small');
    hint.innerText = "To get it working, you have to link the extension with your ANOTHERpass app by clicking on the link icon displayed above :-)";
    document.getElementById("nav-help").appendChild(hint);

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

    const all = await getAllLocalValues();
    for (const [key, value] of all) {

      if (key.startsWith(PREFIX_CREDENTIAL)) {
        try {
          const credential = JSON.parse(await decryptMessage(clientKey, value));
          //console.debug("credential", credential);
          credentials.push(credential);
        } catch(e) {
          console.error("cannot decrypt credential with key " + key + ". Ignored.", e);
        }
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
              <button id="apply_${uuid}" class="btn dropdown-item" title="Apply this credential on current website">Apply to website</button>
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
                  <div>
                    <small>UID:</small>
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <small>${credential.readableUid}</small>
                  </div>
                </div> 
              </div>
              
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    <small>Imported at:</small>
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <small>${credential.createdAt != undefined ? new Date(credential.createdAt).toLocaleString() : ""}</small>
                  </div>
                </div> 
              </div>


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
        if (e.target.id === "apply_" + uuid) {
          chrome.runtime.sendMessage({
            action: "apply_credential",
            uid: uuid
          });
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
              await removeLocalValue(PREFIX_CREDENTIAL + uuid);
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


async function loadAlternativeServersToUi() {
  const alternativeServers = await loadAllServers();
  const hostSelector = document.getElementById("host_selector");
  hostSelector.innerHTML = "<option selected> - choose an alternative server - </option>";

  alternativeServers
    .map((altServer) => {
    const opt = document.createElement("option");
    
    opt.value = altServer.host;

    let text;
    if (altServer.description.length > 0) {
      text = altServer.host + " ( " + altServer.description + " )";
    }
    else {
      text = altServer.host;
    }
    const ipFromHandle = handleToIpAddress(altServer.host);
    if (ipFromHandle) {
      text = text + " - " + ipFromHandle;
    }
    
    
  
    opt.innerText = text;
    hostSelector.append(opt);
  });
}

async function loadAllServers() {
  const alternativeServers = [];
  const all = await getAllLocalValues();
  for (const [key, value] of all) {

    if (key.startsWith(PREFIX_ALT_SERVER)) {
      const host = key.substring(PREFIX_ALT_SERVER.length);
      const description = value === undefined || value === null  || value === "null" ? "" : value.trim();
      alternativeServers.push({ host: host, description: description });
    }
  }
  alternativeServers.sort((a, b) => (a.host.localeCompare(b.host)));
  return alternativeServers;
}

async function addNewAlternativeServer(newServer) {
  const currentServer = await getLocalValue("server_address");
  const currentServerDesc = await getLocalValue(PREFIX_ALT_SERVER + currentServer);
  const newServerDesc = await getLocalValue(PREFIX_ALT_SERVER + newServer);

  await setLocalValue("server_address", newServer);
  await setLocalValue(PREFIX_ALT_SERVER + currentServer, currentServerDesc);
  await setLocalValue(PREFIX_ALT_SERVER + newServer, newServerDesc);
}
