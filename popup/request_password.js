document.getElementById("update_server").innerHTML = chrome.i18n.getMessage("lblUpdate");
document.getElementById("close").innerHTML = chrome.i18n.getMessage("lblCancel");
document.getElementById("host").placeholder = chrome.i18n.getMessage("lblAppHost");



const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));
const targetTabId = requestData.tabId;

let _credential, _requestIdentifier, _stopPolling, _lastResponseMsg = "", _otpAuth;

document.addEventListener("click", async (e) => {

  if (e.target.id === "waiting_time") {
    const waitingStatus = document.getElementById("waiting_status");
    if (waitingStatus.classList.contains("d-none")) {
      waitingStatus.classList.remove("d-none");
    }
    else {
      waitingStatus.classList.add("d-none");
    }
  }
  else if (e.target.id === "close") {
    _stopPolling = true;
    // send cancel command to server
    if (_requestIdentifier) {
      await chrome.runtime.sendMessage({
        action: "request_credential",
        command: "cancel_request",
        requestIdentifier: _requestIdentifier,
      });
    }

    destroySessionKey();
    window.close();
  }
  else if (e.target.id === "update_server") {

    const hostField = document.getElementById("host");
    const newServer = hostField.value;

    if (!newServer || newServer == "") {
      bsAlert(
        chrome.i18n.getMessage("titleError"), 
        chrome.i18n.getMessage("errorMessageMissingAppServer"));
    }
    else if (!isValidIPAdressOrHostnameOrHandle(newServer)) {
      bsAlert(
        chrome.i18n.getMessage("titleError"), 
        chrome.i18n.getMessage("errorMessageInvalidAppServer"));
    }
    else {
      await addNewAlternativeServer(newServer);
      await loadAlternativeServersToUi(newServer);
      const ipFromHandle = handleToIpAddress(newServer);
      if (ipFromHandle) {
        hostField.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
      }
      else {
        hostField.title = "";
      } 
    }

  }
  else if (e.target.id === "copy") {
    navigator.clipboard.writeText(_credential.password);
    e.target.title = chrome.i18n.getMessage("successMessagePasswordCopied");
    e.target.innerHTML = `
    <span id="copy" class="material-icons-outlined size-24">
    check
    </span>
    `;
  }
  else if (e.target.id === "copy_otp") {
    if (_otpAuth) {
      navigator.clipboard.writeText(await calcOtp(_otpAuth));
      e.target.title = chrome.i18n.getMessage("successMessageOTPCopied");
      e.target.innerHTML = `
      <span id="copy_otp" class="material-icons-outlined size-24">
      check
      </span>
      `;
    }
  }
  else if (e.target.id === "password_field") {
    e.target.innerText = _credential.password;
  }
  else if (e.target.id === "otp_field") {
    //update TOTP automatically
    if (_otpAuth) {
      if (_otpAuth.type == "totp") {
        const otpIndicator = document.getElementById("otp_indicator");

        otpIndicator.innerText = indicateTotpRemainingTime(_otpAuth);
        e.target.innerText =  await calcOtp(_otpAuth, true);

        setInterval(async () => {
          otpIndicator.innerText = indicateTotpRemainingTime(_otpAuth);
          e.target.innerText =  await calcOtp(_otpAuth, true);
        }, 1000);
      }
      else {
        e.target.title = chrome.i18n.getMessage("tooltipHotpCounter", _otpAuth.counter);
        e.target.innerText = await calcOtp(_otpAuth, true);
      }
      
    }
  }
});


getLocalValue("linked").then(async (linked) => {

  const webClientId = await getLocalValue("web_client_id");

  if (!linked) {
    bsAlert(
      chrome.i18n.getMessage("titleError"), 
      chrome.i18n.getMessage("errorMessageExtensionNotLinked")).then(_ => {
      window.close();
    });
  } 
  else {

    // load current configurated server
    const server = await getLocalValue("server_address");
    const hostField = document.getElementById("host");
    hostField.value = server;
    const ipFromHandle = handleToIpAddress(hostField.value);
    if (ipFromHandle) {
      hostField.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
    }
    else {
      hostField.title = "";
    }

    const updateButton = document.getElementById("update_server");


    document.addEventListener("input", (e) => {
      if (e.target.id === "host") {
        e.target.title = "";

        updateButton.disabled = false;

        if (isValidIPAdressOrHostnameOrHandle(e.target.value)) {
          e.target.classList.remove("invalid-state");
          const ipFromHandle = handleToIpAddress(e.target.value);
          if (ipFromHandle) {
            e.target.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
          }
        }
        else {
          e.target.classList.add("invalid-state");
          e.target.title = chrome.i18n.getMessage("errorMessageInvalidAppHost");
          updateButton.disabled = true;
        }
      }
    });


    // load all known servers
    await loadAlternativeServersToUi(server);
    const hostSelector = document.getElementById("host_selector");
    hostSelector.addEventListener("change", async function() {
      if (hostField.value) {
        const newServer = hostSelector.value;

        hostField.value = newServer;
        const options = hostSelector.querySelectorAll("option");
        if (options.length > 0) {
            options[0].selected = true;
        }
        await addNewAlternativeServer(newServer);
        await loadAlternativeServersToUi(newServer);
        const ipFromHandle = handleToIpAddress(newServer);
        if (ipFromHandle) {
          hostField.title = chrome.i18n.getMessage("tooltipResolvedHandle", ipFromHandle);
        }
        else {
          hostField.title = "";
        }
      }
    });


    let requestText;
    if (requestData.command === "get_client_key") {
      requestText = "lblAppRequestMessageUnlockLocalVault";
    }
    else if (requestData.command === "fetch_multiple_credentials") {
      requestText = "lblAppRequestMessageFetchCredentials";
    }  
    else if (requestData.command === "fetch_all_credentials") {
      requestText = "lblAppRequestMessageFetchAllCredentials";
    }
    else if (requestData.command === "fetch_credentials_for_uids") {
      requestText = "lblAppRequestMessageSyncLocalVault";
    }
    else if (requestData.command === "create_credential_for_url") {
      requestText = "lblAppRequestMessageCreateNewCredential";
    }
    else if (requestData.command === "download_vault_backup") {
      requestText = "lblAppRequestMessageDownloadVaultFile";
    }
    else {
      requestText = "lblAppRequestMessageFetchAnyCredential";
    }

    document.getElementById("instruction").innerHTML = "<strong>" + chrome.i18n.getMessage(requestText) + " .. </strong><p><small>" + chrome.i18n.getMessage("textAppRequestHint") + "</small>";

    console.debug("requestData", requestData);
    const targetUrl = requestData.website;
    const user = requestData.user;
    let targetUid = requestData.credentialUid;

    if (!targetUrl) {
      document.getElementById("websiteDetails").classList.add("d-none");
      document.getElementById("credentialOptions").classList.add("d-none");
    }
    else {
      const parsedTargetUrl = new URL(targetUrl);
      parsedTargetUrl.pathname = '';
      parsedTargetUrl.search = '';
      const website = parsedTargetUrl.toString();
      document.getElementById("websiteTargetUrl").innerText = website;
    }
    

    getKey("app_public_key").then(async _ => {
      try {
        document.getElementById("web_client_id").innerText = webClientId;

        // destroy previous if still exists
        destroySessionKey();
        const sessionKey = await generateOrGetSessionKey();
        const sessionKeyAsArray = await aesKeyToArray(sessionKey);
        const sessionKeyBase64 = bytesToBase64(sessionKeyAsArray);
        //console.debug("Request Session Key = " + sessionKeyBase64);
        _requestIdentifier = sessionKeyBase64;
        
        const baseKey = await getKey("base_key");
        const baseKeyAsArray = await aesKeyToArray(baseKey);
        const fingerprintAsArray = await hashKeys(baseKeyAsArray, sessionKeyAsArray);
        const formattedFingerprint = toShortenedFingerprint(fingerprintAsArray);

        document.getElementById("fingerprint").innerText = formattedFingerprint;


        const pollingTimeout = await getLocalValue("polling_timeout") || 60;
        const pollingInterval = await getLocalValue("polling_interval") || 2;

        if (requestData.command === "fetch_credential_for_url") {
          const index = await createIndex(targetUrl);

          targetUid = await getLocalValue(PREFIX_UID + index);
          console.debug("found for " + targetUrl + ": " + targetUid );

          const rememberDenied = await getLocalValue(PREFIX_REMEMBER_DENIED + index);
          const rememberCredentialSelection = document.getElementById("rememberCredentialSelection");
          if (rememberCredentialSelection) {
            if (rememberDenied) {
              rememberCredentialSelection.checked = false;
            }
            else {
              rememberCredentialSelection.checked = true;
            }
          }
        }
        if (requestData.command === "create_credential_for_url") {
          const saveCredentialInLocalVault = document.getElementById("saveCredentialInLocalVault");
          if (saveCredentialInLocalVault) {
            saveCredentialInLocalVault.checked = true;
          }
        }

        let targetUids;
        if (requestData.command === "fetch_credentials_for_uids") {
          console.debug("Lookup local vault");

          const response = await chrome.runtime.sendMessage({
            action: "list_local_credentials",
          });
        
          console.debug("found local credentials", response);
        
          const credentials = response.credentials;
          targetUids = credentials.map((credential) => credential.uid);
          console.debug("Sync for uids:", targetUids);
        }

        poll(async function (progress) {

          if (_stopPolling) {
            _stopPolling = false;
            return STOP_POLLING;
          }
          document.getElementById("waiting_status").innerText = _lastResponseMsg;
          document.getElementById("waiting_time").value = progress;

          let request;
          if (requestData.command === "fetch_credentials_for_uids") {
            
            request = {
              action: "request_credential",
              command: requestData.command,
              requestIdentifier: sessionKeyBase64,
              uids: targetUids,
            };
          }
          else {
            request = {
              action: "request_credential",
              command: requestData.command,
              requestIdentifier: sessionKeyBase64,
              website: targetUrl,
              user: user,
              uid: targetUid,
              uids: targetUids
            };
          }
          
          const response = await chrome.runtime.sendMessage(request);
          console.debug("response = " + JSON.stringify(response));
          _lastResponseMsg = response.error || "";

          if (response.status == 403) {
            console.info("Request rejected");
            document.getElementById("waiting_time").value = 0;
            document.getElementById("instruction").innerText = "Request was rejected!";
            document.getElementById("close").innerText = "Close";

            destroySessionKey();

            bsAlert(
              chrome.i18n.getMessage("titleWarning"), 
              chrome.i18n.getMessage("errorMessageRequestRejected")).then(_ => {
              window.close();
            });
            return STOP_POLLING;
          }
          if (response.status == 400 || response.status == 404 || response.status == 500) {
            console.warn("Abnormal HHTP response code");
            document.getElementById("waiting_time").value = 0;
            document.getElementById("instruction").innerText = "Request failed!";
            document.getElementById("close").innerText = "Close";

            destroySessionKey();

            bsAlert(
              chrome.i18n.getMessage("titleError"), 
              chrome.i18n.getMessage("errorMessageCommunicationFailure") + "<br><code>Error: " + response.error + "</code>").then(_ => {
              window.close();
            });
            return STOP_POLLING;
          }

          return response.response;
        }, pollingTimeout * 1000, pollingInterval * 1000).then(async function (response) { 
          if (response !== STOP_POLLING) {
            // polling done
            document.getElementById("waiting_time").value = 100;

            destroySessionKey();
            
            const clientKeyBase64 = response.clientKey;

            if (requestData.command === "fetch_credential_for_url" || requestData.command === "create_credential_for_url") {
              const credential = response.credential;
              const rememberCredentialSelection = document.getElementById("rememberCredentialSelection");

              const uid = credential.uid;
              const index = await createIndex(targetUrl);

              if (rememberCredentialSelection.checked) {
                console.debug("remember credential for " + targetUrl + " with uuid " + uid);
                await setLocalValue(PREFIX_UID + index, uid);
                await removeLocalValue(PREFIX_REMEMBER_DENIED + index);
              }
              else {
                console.debug("forget credential for " + targetUrl + " with uuid " + uid);
                await removeLocalValue(PREFIX_UID + index);
                await setLocalValue(PREFIX_REMEMBER_DENIED + index, true);
              }

              const saveCredentialInLocalVault = document.getElementById("saveCredentialInLocalVault");

              if (saveCredentialInLocalVault.checked) {
                console.debug("save credential in local vault with uuid " + uid);
                const clientKey = await unlockVault(clientKeyBase64);
                await saveCredential(credential, clientKey);
              }

              if (targetTabId) {
                sendPasteCredentialMessage(targetTabId, credential.password, credential.user, credential.name.substring(0, 25), await parseAndCalcOtp(credential));
              }
              else {
                console.error("No target tabId but expected");
                bsAlert(
                  chrome.i18n.getMessage("titleError"), 
                  chrome.i18n.getMessage("errorMessageSomethingWentWrong")).then(_ => {
                  window.close();
                });
              }
            }
            else if (requestData.command === "get_client_key") {
              await unlockVault(clientKeyBase64);

              //inform credential popup
              console.debug("refresh popup for tabId " + targetTabId);
              if (targetTabId) {
                chrome.runtime.sendMessage({ action: "refresh_credential_dialog", tabId: targetTabId });
              }

              const autoCloseUnlockDialog = await getLocalValue("dont_show_unlock_message_again");
              if (autoCloseUnlockDialog) {
                window.close();                
              }
              else {
              
                bsAlert(
                  chrome.i18n.getMessage("titleSuccess"), 
                  chrome.i18n.getMessage("messageLocalVaultUnlocked"),
                  chrome.i18n.getMessage("lblClose"),
                  "dont_show_unlock_message_again").then(_ => {
                  window.close();
                });   
              }
              
            }
            else if (requestData.command === "fetch_multiple_credentials" || requestData.command === "fetch_all_credentials") {
              const credentials = response.credentials;

              const clientKey = await unlockVault(clientKeyBase64);
              const count = await saveAllCredentials(credentials, clientKey);

              bsAlert(
                chrome.i18n.getMessage("titleSuccess"), 
                chrome.i18n.getMessage("successMessageCredentialsImported", [count])).then(_ => {
                window.close();
              });
            }
            else if (requestData.command === "fetch_single_credential") {
              const credential = response.credential;

              presentCredential(credential, clientKeyBase64);
            }
            else if (requestData.command === "fetch_credential_for_uid") {
              const credential = response.credential;
              const clientKey = await unlockVault(clientKeyBase64);

              saveCredential(credential, clientKey);
              bsAlert(
                chrome.i18n.getMessage("titleSuccess"), 
                chrome.i18n.getMessage("successMessageCredentialSynchronised", credential.name)).then(_ => {
                window.close();
              });
            } 
            else if (requestData.command === "fetch_credentials_for_uids") {
              const credentials = response.credentials;
              const clientKey = await unlockVault(clientKeyBase64);

              const count = await saveAllCredentials(credentials, clientKey);
              bsAlert(
                chrome.i18n.getMessage("titleSuccess"), 
                chrome.i18n.getMessage("successMessageCredentialsSynchronised", [count])).then(_ => {
                window.close();
              });
            }
            else if (requestData.command === "download_vault_backup") {
              const downloadKey = response.downloadKey;
              const filename = response.filename;

              await unlockVault(clientKeyBase64);
              
              const url = "http://" + await getAddress() + "/" + downloadKey;
              console.debug("file download url", url);
              chrome.downloads.download({ filename: filename, url: url, saveAs: true});
              window.close();
              
            }
          }
        }).catch(function (e) {
          console.error(e);
          document.getElementById("waiting_time").value = 0;
          document.getElementById("instruction").innerText = "Unable to receive credentials!";
          document.getElementById("close").innerText = "Close";

          destroySessionKey();

          bsAlert(
            chrome.i18n.getMessage("titleError"), 
            chrome.i18n.getMessage("errorMessageRequestTimedOut")).then(_ => {
            window.close();
          });
        });


        function sendPasteCredentialMessage(tabId, password, user, name, otp) {

          console.debug("send to tabId", tabId);
          chrome.tabs.sendMessage(tabId, { 
            action: "paste_credential", 
            password: password,
            user: user,
            name: name,
            otp: otp
          }, function () {
            window.close();
          });    
        }

        async function unlockVault(clientKeyBase64) {
          console.log("Unlocking vault ...");
          const clientKeyArray = await base64ToBytes(clientKeyBase64);
          const clientKey = await arrayToAesKey(clientKeyArray);

          await setTemporaryKey("clientKey", {
            clientKey: clientKeyBase64,
            timestamp: Date.now(),
          });

          updateExtensionIcon(true);

          return clientKey;
        }

        function presentCredential(credential, clientKeyBase64) {
          _credential = credential;
        

          let otpContainer = "";
          if (credential.otp) {
            _otpAuth = parseOtpAuth(_credential.otp);
            otpContainer = 
            `
            <div class="row">
              <div class="col">
                <div class="mb-3">
                ${chrome.i18n.getMessage("lblOTP")}:
                </div>
              </div>
              <div class="col-8">
                <div class="mb-1">
                  <span id="otp_indicator"></span>
                  <b id="otp_field" class="fingerprint_small cursor-pointer">******  </b>
            
                  <button class="btn pt-2 px-0 mt-0" type="button" id="copy_otp" title="${chrome.i18n.getMessage("tooltipCopyOTP")}">
                    <span id="copy_otp" class="material-icons-outlined size-24">
                    content_copy
                    </span>
                  </button>
                </div>
              </div>
            </div>

            `;
          }

          bsConfirm(
            chrome.i18n.getMessage("lblCredential") + " '" + credential.name + "'", 
            `
            <div class="container text-left">
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
                    <div class="mb-3 mt-2">
                    ${chrome.i18n.getMessage("lblPassword")}:
                    </div>
                  </div>
                  <div class="col-8">
                    <div class="mb-1">
                      <b id="password_field" class="fingerprint_small cursor-pointer">**************  </b>
                
                      <button class="btn pt-2 px-0 mt-0" type="button" id="copy" title="${chrome.i18n.getMessage("tooltipCopyPassword")}">
                        <span id="copy" class="material-icons-outlined size-24">
                        content_copy
                        </span>
                      </button>
                    </div>
                  </div>
                </div>


                ${otpContainer}


              </div>

            `,
            chrome.i18n.getMessage("lblImportAndClose"),
            chrome.i18n.getMessage("lblClose")
          )
          .then(async (decision) => {
            console.log("decision:" + decision);
            if (decision === true) {
              const clientKey = await unlockVault(clientKeyBase64);
              await saveCredential(credential, clientKey);

            

              window.close();
            }
            else if (decision === false) {
              window.close();
            }
          });
        }
      } catch(e) {
        bsAlert(
          chrome.i18n.getMessage("titleError"), 
          chrome.i18n.getMessage("errorMessageSomethingWentWrong")).then(_ => {
          window.close();
        });
        console.error("cannot fetch credential", e)
      }
    });

  }
});



async function addNewAlternativeServer(newServer) {
  const currentServer = await getLocalValue("server_address");
  const currentServerDesc = await getLocalValue(PREFIX_ALT_SERVER + currentServer);
  const newServerDesc = await getLocalValue(PREFIX_ALT_SERVER + newServer);

  await setLocalValue("server_address", newServer);
  await setLocalValue(PREFIX_ALT_SERVER + currentServer, currentServerDesc);
  await setLocalValue(PREFIX_ALT_SERVER + newServer, newServerDesc);
}

async function loadAlternativeServersToUi(currentServer) {
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
  const hostSelector = document.getElementById("host_selector");
  hostSelector.innerHTML = "<option selected> - " + chrome.i18n.getMessage("lblChooseHostAlternative") + " - </option>";
  
  if (alternativeServers.length > 0) {
    hostSelector.classList.remove("d-none");
  }
  else {
    hostSelector.classList.add("d-none");
  }


  alternativeServers
    .filter((altServer) => (altServer.host !== currentServer))
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

async function saveCredential(credential, clientKey) {
  credential.createdAt = Date.now();
  const encCredential = await encryptMessage(clientKey, JSON.stringify(credential));
  await setLocalValue(PREFIX_CREDENTIAL + credential.uid, encCredential);
}


async function saveAllCredentials(credentials, clientKey) {
  let count = 0;
  for (const credential of credentials) {
    await saveCredential(credential, clientKey);
    count++;
  }
  return count;
}

