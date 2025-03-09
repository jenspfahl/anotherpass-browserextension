
document.getElementById("navCredentialsTab").title = chrome.i18n.getMessage("lblLocalVault");
document.getElementById("nav-settings-tab").title = chrome.i18n.getMessage("lblSettings");
document.getElementById("nav-help-tab").title = chrome.i18n.getMessage("lblHelp");
document.getElementById("nav-about-tab").title = chrome.i18n.getMessage("lblAbout");

document.getElementById("fetch_credential").title = chrome.i18n.getMessage("tooltipFetchSingleCredential");
document.getElementById("fetch_multiple_credentials").innerHTML = chrome.i18n.getMessage("lblFetchMultipleCredentials");
document.getElementById("fetch_multiple_credentials").title = chrome.i18n.getMessage("tooltipFetchMultipleCredentials");
document.getElementById("fetch_all_credentials").innerHTML = chrome.i18n.getMessage("lblFetchAllCredentials");
document.getElementById("fetch_all_credentials").title = chrome.i18n.getMessage("tooltipFetchAllCredentials");
document.getElementById("download_vault_backup").innerHTML = chrome.i18n.getMessage("lblDownloadBackupFile");
document.getElementById("download_vault_backup").title = chrome.i18n.getMessage("tooltipDownloadBackupFile");
document.getElementById("sync_credentials").title = chrome.i18n.getMessage("tooltipSynchronizeAll");


document.getElementById("extensionInfo").innerHTML = chrome.i18n.getMessage("extensionInfo");
document.getElementById("extensionHelp1").innerHTML = chrome.i18n.getMessage("extensionHelp1");
document.getElementById("extensionHelp2").innerHTML = chrome.i18n.getMessage("extensionHelp2");

document.getElementById("search_input").placeholder = chrome.i18n.getMessage("lblSearchCredentials");
document.getElementById("search_input").title = chrome.i18n.getMessage("tooltipSearchCredentials");

document.getElementById("reverse_sort").title = chrome.i18n.getMessage("tooltipSortOrder");
updateSortOrderLabel();

document.getElementById("delete_all_credentials").title = chrome.i18n.getMessage("tooltipDeleteAllLocalCredentials");
document.getElementById("delete_all_credentials").innerHTML = chrome.i18n.getMessage("titleDeleteAllLocalCredentials");

document.getElementById("link").title = chrome.i18n.getMessage("titleLinkTheApp");
document.getElementById("unlink").title = chrome.i18n.getMessage("titleUnlinkFromApp");

document.getElementById("manage_servers").innerHTML = chrome.i18n.getMessage("titleManageServers");
document.getElementById("relink").innerHTML = chrome.i18n.getMessage("lblRelink");


chrome.runtime.sendMessage({
  action: "close_all_credential_dialogs",
});


getLocalValue("linked").then(async (linked) => {

  const webClientId = await getLocalValue("web_client_id");
  const linkedVaultId = await getLocalValue("linked_vault_id");

  const lockTimeout = await getLocalValue("lock_timeout") || 60;
  const renderContentIcon = await getLocalValue("render_content_icon");
  const opacityOfContentIcon = await getLocalValue("opacity_content_icon") || 90;
  const positionOfContentIcon = await getLocalValue("position_content_icon") || 'left';


  updateLocalVaultPasswordMenuItem();


  const pollingTimeout = await getLocalValue("polling_timeout") || 60;
  const pollingInterval = await getLocalValue("polling_interval") || 2;

  document.getElementById("linked_vault_id").innerText = linkedVaultId;

  document.getElementById("server-settings-lock-timeout").value = lockTimeout;

  let showIconEnabled = renderContentIcon == undefined || renderContentIcon === "true" || renderContentIcon === true;
  document.getElementById("render_content_icon").checked = showIconEnabled;
  if (showIconEnabled) {
    document.getElementById("icon-settings").classList.remove("d-none");
  }
  else {
    document.getElementById("icon-settings").classList.add("d-none");
  }

  document.getElementById("opacity_content_icon").value = opacityOfContentIcon;

  updateIconPositionDropDown(positionOfContentIcon);

  document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
  document.getElementById("server-settings-polling-interval").value = pollingInterval;

  const searchInput = document.getElementById("search_input");

  searchInput.addEventListener("input", (e) => updateCredentialList(e.target.value));

  document.getElementById("render_content_icon").addEventListener("change", async function() {
    showIconEnabled = this.checked;

    if (showIconEnabled) {
      document.getElementById("icon-settings").classList.remove("d-none");
    }
    else {
      document.getElementById("icon-settings").classList.add("d-none");
    }

    await setLocalValue("render_content_icon", showIconEnabled);
    await setTemporaryKey("render_content_icon", showIconEnabled);
  });

  document.addEventListener("input", async (e) => {
    if (e.target.id === "server-settings-lock-timeout") {      
      const newLockTimeout = parseInt(e.target.value);
      if (isNaN(newLockTimeout) || newLockTimeout < 1 || newLockTimeout > 10080) {
        e.target.title = chrome.i18n.getMessage("errorMessageInvalidLockTimeout");
        e.target.classList.add("invalid-state");
      }
      else {
        e.target.classList.remove("invalid-state");
        e.target.title = "";
        await setLocalValue("lock_timeout", newLockTimeout);
      }
    }
    else if (e.target.id === "opacity_content_icon") {      
      const opacityOfContentIcon = parseInt(e.target.value);
      if (isNaN(opacityOfContentIcon) || opacityOfContentIcon < 0 || opacityOfContentIcon > 100) {
        e.target.title = chrome.i18n.getMessage("errorMessageInvalidOpacityValue");
        e.target.classList.add("invalid-state");
      }
      else {
        e.target.classList.remove("invalid-state");
        e.target.title = "";
        await setLocalValue("opacity_content_icon", opacityOfContentIcon);
        await setTemporaryKey("opacity_content_icon", opacityOfContentIcon);    
    }
    }
    else if (e.target.id === "server-settings-polling-timeout") {      
      const pollingTimeout = parseInt(e.target.value);
      if (isNaN(pollingTimeout) || pollingTimeout < 1 || pollingTimeout > 300) {
        e.target.title = chrome.i18n.getMessage("errorMessageInvalidPollingTimeout");
        e.target.classList.add("invalid-state");
      }
      else {
        e.target.classList.remove("invalid-state");
        e.target.title = "";
        await setLocalValue("polling_timeout", pollingTimeout);
      }
    }
    else if (e.target.id === "server-settings-polling-interval") {      
      const pollingInterval = parseInt(e.target.value);
      if (isNaN(pollingInterval) || pollingInterval < 1 || pollingInterval > 60) {
        e.target.title = chrome.i18n.getMessage("errorMessageInvalidPollingInterval");
        e.target.classList.add("invalid-state");
      }
      else {
        e.target.classList.remove("invalid-state");
        e.target.title = "";
        await setLocalValue("polling_interval", pollingInterval);
      }
    }

  });


  document.addEventListener("click", async (e) => {

  

    if (e.target.id === "icon_position_left") {
      await setLocalValue("position_content_icon", 'left');
      await setTemporaryKey("position_content_icon", 'left');
      updateIconPositionDropDown('left');
    }
    else if (e.target.id === "icon_position_right") {
      await setLocalValue("position_content_icon", 'right');
      await setTemporaryKey("position_content_icon", 'right');
      updateIconPositionDropDown('right');
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
        chrome.i18n.getMessage("titleUnlinkFromApp"), 
        chrome.i18n.getMessage("messageUnlinkFromApp", "<b class=\"fingerprint_medium\">" + webClientId + "</b>"),
        chrome.i18n.getMessage("lblUnlink")
      )
      .then((decision) => {
        if (decision === true) {
          chrome.runtime.sendMessage({
            action: "start_unlink_flow",
          }).then(async (response) => {
            updateMenuUi(null, null);


            bsAlert(
              chrome.i18n.getMessage("titleSuccess"), 
              chrome.i18n.getMessage("successMessageUnlockLocalVault", "<b class=\"fingerprint_medium\">" + webClientId + "</b>")).then(_ => {
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
        deleteTemporaryKey("last_used_credential");
        updateVaultUi();
        document.getElementById("credential_list").innerHTML = "";
        updateExtensionIcon();
      }
      else {
        const encryptedClientKey = await getLocalValue("local_v_key");
        if (encryptedClientKey) {
          bsAskForPassword(
            chrome.i18n.getMessage("titleUnlockLocalVault"), 
            chrome.i18n.getMessage("messageUnlockLocalVault"))
            .then(async (data) => {
              if (data.doUnlock === true) {
                if (data.password) {
                  chrome.runtime.sendMessage({
                    password: data.password,
                    action: "unlock_with_password"
                  }).then(async (result) => {
                    console.debug("login result", result);

                    if (result.result === true) {
                      // refresh ui
                      const clientKey = await getClientKey();
                      updateVaultUi(clientKey);
                      updateExtensionIcon(clientKey);
                      if (!clientKey) {
                        console.debug("Local vault locked, nothing to display");
                      }
                      else {
                        loadCredentials(clientKey);
                      }
                    }
                    else {
                      bsAlert(
                        chrome.i18n.getMessage("titleError"), 
                        chrome.i18n.getMessage("errorMessageUnlockLocalVault"));

                    }
                  });
                }
                else {
                  //request clientKey from app
                  chrome.runtime.sendMessage({
                    action: "start_client_key_request_flow"
                  });
                }
                  
              }
            });
        }
        else {
          //request clientKey from app
          chrome.runtime.sendMessage({
            action: "start_client_key_request_flow"
          });

        }
        
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
    else if (e.target.id === "download_vault_backup") {

      bsConfirm(chrome.i18n.getMessage("titleWarning"), 
      chrome.i18n.getMessage("messageAppVaultFileDownload"))
      .then(async (decision) => {
        if (decision === true) {
          chrome.runtime.sendMessage({
            action: "start_download_vault_backup_flow"
          });
        }
      });

    }
    else if (e.target.id === "reverse_sort") {
      let order = await getLocalValue("vault_credential_order");
      if (order === null || order === "asc") {
        order = "desc";
      }
      else if (order ===  "desc") {
        order = "asc";
      }
      await setLocalValue("vault_credential_order", order);
      updateSortOrderLabel();
      reverseCredentialList();
    }
    else if (e.target.id === "setup_vault_password") {
      const encryptedClientKey = await getLocalValue("local_v_key");
      if (encryptedClientKey) {
        bsConfirm(
          chrome.i18n.getMessage("titleRemoveLocalVaultPassword"), 
          chrome.i18n.getMessage("messageRemoveLocalVaultPassword"))
        .then(async (decision) => {
          if (decision === true) {
            console.log("erasing local vault password");
          
            await removeLocalValue("local_v_salt");
            await removeLocalValue("local_v_key");
  
            
            updateLocalVaultPasswordMenuItem();
            bsAlert(
              chrome.i18n.getMessage("titleSuccess"), 
              chrome.i18n.getMessage("successMessageRemoveLocalVaultPassword"));
          }
        });
      }
      else {
        bsSetPassword(
          chrome.i18n.getMessage("titleConfigureLocalVaultPassword"), 
          chrome.i18n.getMessage("messageConfigureLocalVaultPassword"))
        .then(async (data) => {
          if (data.doSave === true) {
            
            chrome.runtime.sendMessage({
              action: "setup_vault_password",
              password: data.password
            }).then(() => {
              updateLocalVaultPasswordMenuItem();
              bsAlert(
                chrome.i18n.getMessage("titleSuccess"), 
                chrome.i18n.getMessage("successMessageConfigureLocalVaultPassword")).then(_ => {
              });
  
            });
            
          }
        });
      }
  
      
    }
    else if (e.target.id === "delete_all_credentials") {
      bsConfirm(
        chrome.i18n.getMessage("titleDeleteAllLocalCredentials"), 
        chrome.i18n.getMessage("messageDeleteAllLocalCredentials"))
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
          bsAlert(
            chrome.i18n.getMessage("titleSuccess"), 
            chrome.i18n.getMessage("successMessageDeleteAllLocalCredentials"));
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

      bsAlert(chrome.i18n.getMessage("titleLinkDetails", "<b class=\"fingerprint_medium\">" + webClientId + "</b>"), `
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

      const allServers = [];
      const alternativeServers = await loadAllAlternativeServers();

      // find current add add him on top
      const currentServer = await getLocalValue("server_address");
      let port = await getLocalValue("server_port");

      let currentServerInAlternativeList = false;
      alternativeServers.forEach((altServer) => {
        if (altServer.host == currentServer) {
          currentServerInAlternativeList = true;
          allServers.splice(0, 0, altServer);
        }
        else {
          // Push to end
          allServers.push(altServer);
        }
      });
      if (!currentServerInAlternativeList) {
        allServers.splice(0, 0, { host: currentServer, description: "" });
      }

      const html = [];
      const serversToBeDeleted = [];
      const changedHosts = new Map();
      const changedDescriptions = new Map();
      let addedHost, addedDescription;
      let newServer = currentServer;

      html.push("<h6>" + chrome.i18n.getMessage("messageManageServers") + "</h6>");
    
      

      allServers.forEach((server, index) => {

        const ipFromHandle = handleToIpAddress(server.host);
        let hostTooltip = "";
        if (ipFromHandle) {
          hostTooltip = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
        }
            
        const isNewServerRow = index == 0;
        if (isNewServerRow) {
          const htmlLine = `
          <h8> - ${chrome.i18n.getMessage("lblCurrentHostAddress")} -</h8>
          <div id="server_row_${currentServer}" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="server_host_${currentServer}" value="${server.host}" title="${hostTooltip}" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblAppHost")}" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="server_description_${currentServer}" value="${server.description}" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblNotes")}" aria-label="server notes">
            </div>
          </div>

          `;
          html.push(htmlLine);

        }
        else {

          if (index == 1) {
            html.push(`<h8> - ${chrome.i18n.getMessage("lblAlternativeHostAddress")} -</h8>`);

          }

          const htmlLine = `
          <div id="server_row_${server.host}" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="server_host_${server.host}" value="${server.host}" title="${hostTooltip}" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblAppHost")}" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="server_description_${server.host}" value="${server.description}" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblNotes")}" aria-label="server notes">
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
          html.push(htmlLine);
        }
        

        document.addEventListener("input", (e) => {
          if (e.target.id === "server_host_" + server.host) {
            e.target.title = "";


            if (isValidIPAdressOrHostnameOrHandle(e.target.value)) {
              changedHosts.set(server.host, e.target.value);
              if (isNewServerRow) {
                newServer = e.target.value;
              }
              e.target.classList.remove("invalid-state");
              const okButton = document.getElementById("modal-btn-ok");
              if (okButton) { 
                okButton.disabled = false;
              }
              const ipFromHandle = handleToIpAddress(e.target.value);
              if (ipFromHandle) {
                e.target.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
              }
            }
            else {
              console.log("host invald", e.target.value);
              e.target.classList.add("invalid-state");
              e.target.title = chrome.i18n.getMessage("errorMessageInvalidAppHost");
              const okButton = document.getElementById("modal-btn-ok");
              if (okButton) { 
                okButton.disabled = true;
              }
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
              row.innerHTML = "<i> - " + chrome.i18n.getMessage("lblAddressMarkedForDeletion", server.host) + " - </i>";
              serversToBeDeleted.push(server.host);
            }
          }

        }); 

      });



      html.push(`
        <br/>
        <h8> - ${chrome.i18n.getMessage("lblNewHostAddress")} -</h8>
          <div id="new_server_row" class="row mh-0 ph-0 mb-2">
            <div class="col-6">
              <input id="new_server_host" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblAppHost")}" aria-label="IP address or hostame">
            </div>
            <div class="col-4">
              <input id="new_server_description" class="form-control input-sm" type="text" placeholder="${chrome.i18n.getMessage("lblNotes")}" aria-label="server notes">
            </div>
          </div>
        `);
  

      html.push(`
        <hr/>
        <h8>${chrome.i18n.getMessage("lblSettingsPort")}</h8>
        <div class="mb-3">
          <input id="server-settings-port" class="form-control" type="number" min="1024" max="49151" placeholder="Port" aria-label="The TCP port" value="${port}">
        </div>
      `);  

      document.addEventListener("input", (e) => {
        if (e.target.id === "new_server_host") {

          e.target.title = "";

          if (e.target.value === "" || isValidIPAdressOrHostnameOrHandle(e.target.value)) {
            addedHost = e.target.value;
            e.target.classList.remove("invalid-state");
            const okButton = document.getElementById("modal-btn-ok");
            if (okButton) {
              okButton.disabled = false;
            }
            const ipFromHandle = handleToIpAddress(e.target.value);
            if (ipFromHandle) {
              e.target.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
            }
          }
          else {
            console.log("host invald", e.target.value);
            e.target.classList.add("invalid-state");
            e.target.title = chrome.i18n.getMessage("errorMessageInvalidAppHost");
            const okButton = document.getElementById("modal-btn-ok");
            if (okButton) { 
              okButton.disabled = true;
            }
          }
        }
        else if (e.target.id === "new_server_description") {
          addedDescription = e.target.value;
        }
        else if (e.target.id === "server-settings-port") {
          
          const newPort = parseInt(e.target.value);
          if (isNaN(newPort) || newPort < 1024 || newPort > 49151) {
            e.target.title = chrome.i18n.getMessage("errorMessageInvalidAppPort");
      
            console.log("port invald", e.target.value);
            e.target.classList.add("invalid-state");
            const okButton = document.getElementById("modal-btn-ok");
            if (okButton) { 
              okButton.disabled = true;
            }
          }
          else {
            e.target.classList.remove("invalid-state");
            e.target.title = "";
            const okButton = document.getElementById("modal-btn-ok");
            if (okButton) {
              okButton.disabled = false;
            }
            port = newPort;
          }
        }
      });

      bsConfirm(chrome.i18n.getMessage("titleManageServers"), `
      <div class="container">
        ${html.join("")}
      </div>
      `, chrome.i18n.getMessage("lblSave"), chrome.i18n.getMessage("lblCancel"))
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

              if (changedHost || changedDescription !== undefined) {
                console.debug("change server " + PREFIX_ALT_SERVER + server.host + " with " + changedHost + " and " + changedDescription);
                await removeLocalValue(PREFIX_ALT_SERVER + server.host);
                await setLocalValue(PREFIX_ALT_SERVER + (changedHost || server.host), changedDescription === undefined ? currentDescription : changedDescription);
              }
            }
          });

          // handle creation
          if (addedHost && addedHost.trim().length > 0) {
            console.debug("add server " + PREFIX_ALT_SERVER + addedHost + " with " + addedDescription);
            await setLocalValue(PREFIX_ALT_SERVER + addedHost, addedDescription || "");
          }


          // save curent
          console.debug("new server", newServer);
          await setLocalValue("server_address", newServer);
          

          // save port
          console.debug("new port", port);
          await setLocalValue("server_port", port);

        }
      });
    }
  });


  updateMenuUi(webClientId, linked);



  function updateIconPositionDropDown(positionOfContentIcon) {
    if (positionOfContentIcon === 'right') {
      document.getElementById("position_content_icon_text").innerText = chrome.i18n.getMessage("lblIconPositionRight");
      document.getElementById("icon_position_right").classList.add('active');
      document.getElementById("icon_position_left").classList.remove('active');
    }
    else {
      document.getElementById("position_content_icon_text").innerText = chrome.i18n.getMessage("lblIconPositionLeft");
      document.getElementById("icon_position_left").classList.add('active');
      document.getElementById("icon_position_right").classList.remove('active');
    }
  }
});

function updateLocalVaultPasswordMenuItem() {
  getLocalValue("local_v_key").then((value) => {

    if (value) {
      document.getElementById("setup_vault_password").innerText = chrome.i18n.getMessage("titleRemoveLocalVaultPassword");
    }
    else {
      document.getElementById("setup_vault_password").innerText = chrome.i18n.getMessage("titleConfigureLocalVaultPassword");
    }
  });
  
}


function updateVaultUi(unlocked) {
  if (unlocked) {
    document.getElementById("lock_icon").innerText = "lock_open";
    document.getElementById("lock").title = chrome.i18n.getMessage("titleLockLocalVault");
    document.getElementById("sync_credentials").classList.remove("d-none");
    document.getElementById("credential_list").classList.remove("d-none");
    document.getElementById("credential_vault_options").classList.remove("d-none");
    document.getElementById("delete_all_credentials").classList.remove("d-none");
    document.getElementById("search_group").classList.remove("d-none");

    document.getElementById("search_input").focus();

  }
  else {
    document.getElementById("lock_icon").innerText = "lock";
    document.getElementById("lock").title = chrome.i18n.getMessage("titleUnlockLocalVault");
    document.getElementById("vaultStatus").innerText = "- " + chrome.i18n.getMessage("localVaultLocked") + " -";
    document.getElementById("sync_credentials").classList.add("d-none");
    document.getElementById("credential_list").classList.add("d-none");
    document.getElementById("credential_vault_options").classList.add("d-none");
    document.getElementById("delete_all_credentials").classList.add("d-none");
    document.getElementById("search_group").classList.add("d-none");

  }
  updateExtensionIcon(unlocked)
}

function updateMenuUi(webClientId, linked) {
  if (webClientId && linked) {
    console.debug("menu linked mode");
    document.getElementById("state").innerText = chrome.i18n.getMessage("lblLinkedState", webClientId);
    document.getElementById("link").classList.add("d-none");

    document.getElementById("navCredentialsTab").classList.add("active");
    document.getElementById("navCredentials").classList.add("show");
    document.getElementById("navCredentials").classList.add("active");

    document.getElementById("extensionHelp3").innerHTML = "";


  }
  else {
    console.debug("menu unlinked mode");

    document.getElementById("state").innerText = chrome.i18n.getMessage("lblNotLinkedState");
    document.getElementById("unlink").classList.add("d-none");
    document.getElementById("navCredentialsTab").classList.add("d-none");
    document.getElementById("nav-settings-tab").classList.add("d-none");
    document.getElementById("vaultStatus").classList.add("d-none");

    document.getElementById("nav-help-tab").classList.add("active");
    document.getElementById("nav-help").classList.add("show");
    document.getElementById("nav-help").classList.add("active");

   
    document.getElementById("extensionHelp3").innerHTML = chrome.i18n.getMessage("extensionHelp3");



  }

  document.getElementById("version").innerText = "Version: " + chrome.runtime.getManifest().version;

}


(async () => {

  const linked = await getLocalValue("linked");
  if (linked) {
    const clientKey = await getClientKey();
    updateVaultUi(clientKey);
  
    if (!clientKey) {
      console.debug("Local vault locked, nothing to display");
      return;
    }
    else {
  
      await loadCredentials(clientKey);
     
    }
  }

 
})()

async function loadCredentials(clientKey) {
  const list = document.getElementById("credential_list");

  const credentials = [];

  const all = await getAllLocalValues();
  for (const [key, value] of all) {

    if (key.startsWith(PREFIX_CREDENTIAL)) {
      try {
        const credential = JSON.parse(await decryptMessage(clientKey, value));
        //console.debug("credential", credential);
        credentials.push(credential);
      } catch (e) {
        console.error("cannot decrypt credential with key " + key + ". Ignored.", e);
      }
    }
  }

  let credentialCount = credentials.length;
  updateCredentialCountUi(credentialCount);

  let order = await getLocalValue("vault_credential_order");
  if (order === null || order === "asc") {
    // sort ascending
    credentials.sort((a, b) => (a.name.trim().toLowerCase() > b.name.trim().toLowerCase()) 
        ? 1 : ((b.name.trim().toLowerCase() > a.name.trim().toLowerCase()) 
        ? -1 : 0));
  }
  else if (order === "desc") {
    // sort descending
    credentials.sort((a, b) => (a.name.trim().toLowerCase() > b.name.trim().toLowerCase()) 
        ? -1 : ((b.name.trim().toLowerCase() > a.name.trim().toLowerCase()) 
        ? 1 : 0));

  }


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
              <button id="apply_${uuid}" class="btn dropdown-item" title="${chrome.i18n.getMessage("tooltipApplyCredentialToWebsite")}">${chrome.i18n.getMessage("lblApplyCredentialToWebsite")}</button>
              <button id="syncWithApp_${uuid}" class="btn dropdown-item" title="${chrome.i18n.getMessage("tooltipSyncCredentialWithApp")}">${chrome.i18n.getMessage("lblSyncCredentialWithApp")}</button>
              <li><hr class="dropdown-divider"></li>
              <button id="delete_${uuid}" class="btn dropdown-item" title="${chrome.i18n.getMessage("tooltipDeleteCredential")}">${chrome.i18n.getMessage("lblDeleteCredential")}</button>
            </ul>
          </div>
        </div>
      `;
    list.appendChild(li);

    document.addEventListener("click", async (e) => {
      if (e.target.id === "copy_" + uuid) {
        navigator.clipboard.writeText(credential.password);
        document.getElementById("copy_" + uuid).title = chrome.i18n.getMessage("successMessagePasswordCopied");
        document.getElementById("copy_" + uuid).innerHTML = `
        <span id="copy_${uuid}" class="material-symbols-outlined size-24">
        check
        </span>
        `;
       
      }
      if (e.target.id === "password_field_" + uuid) {
        document.getElementById("password_field_" + uuid).innerText = credential.password;
      }
      if (e.target.id === "credential_dropdown_" + uuid) {
        bsAlert(
          chrome.i18n.getMessage("lblCredential")+ " '" + credential.name + "'",
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
                    <small>${chrome.i18n.getMessage("lblImportedAt")}:</small>
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
                  ${chrome.i18n.getMessage("lblWebsite")}:
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
                  ${chrome.i18n.getMessage("lblUser")}:
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
                  ${chrome.i18n.getMessage("lblPassword")}:
                  </div>
                </div>
                <div class="col-8">
                  <div class="mb-1">
                    <b id="password_field_${uuid}" class="fingerprint_small cursor-pointer">**************  </b>
              
                    <button class="btn pt-0 px-0 mt-0" type="button" id="copy_${uuid}" title="${chrome.i18n.getMessage("tooltipCopyPassword")}">
                      <span id="copy_${uuid}" class="material-symbols-outlined size-24">
                      content_copy
                      </span>
                    </button>
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
          chrome.i18n.getMessage("titleDeleteCredential", credential.name),
          chrome.i18n.getMessage("messageDeleteCredential")
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

function reverseCredentialList() {

  const list = document.getElementById("credential_list");
  let i = list.childNodes.length;
  while (i--) {
    list.appendChild(list.childNodes[i]);
  }
}

function updateCredentialCountUi(credentialCount) {
  if (credentialCount == 0) {
    document.getElementById("vaultStatus").innerText = " - " + chrome.i18n.getMessage("lblNoLocalCredentials") + " - ";
  }
  else {
    document.getElementById("vaultStatus").innerText = credentialCount + " " + chrome.i18n.getMessage("wordCredentials");
  }
}

async function loadAllAlternativeServers() {
  const serverMap = new Map();

  const all = await getAllLocalValues();
  for (const [key, value] of all) {

    if (key.startsWith(PREFIX_ALT_SERVER)) {
      const host = key.substring(PREFIX_ALT_SERVER.length);
      const description = value === undefined || value === null  || value === "null" ? "" : value.trim();
      serverMap.set(host, description);
    }
  }

  const servers = [];
  serverMap.forEach((value, key) => servers.push({ host: key, description: value }));
  servers.sort((a, b) => (a.host.localeCompare(b.host)));
  return servers;
}

async function addNewAlternativeServer(newServer) {
  const currentServer = await getLocalValue("server_address");
  const currentServerDesc = await getLocalValue(PREFIX_ALT_SERVER + currentServer);
  const newServerDesc = await getLocalValue(PREFIX_ALT_SERVER + newServer);

  await setLocalValue("server_address", newServer);
  await setLocalValue(PREFIX_ALT_SERVER + currentServer, currentServerDesc);
  await setLocalValue(PREFIX_ALT_SERVER + newServer, newServerDesc);
}

async function updateSortOrderLabel() {
  let lbl, order = await getLocalValue("vault_credential_order");
  if (order === null || order === "asc") {
    lbl = "lblSortOrderDesc";
  }
  else if (order === "desc") {
    lbl = "lblSortOrderAsc";
  }
  document.getElementById("reverse_sort").innerHTML = chrome.i18n.getMessage(lbl);

}
