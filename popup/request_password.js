const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));

let _credential;

document.addEventListener("click", (e) => {

  if (e.target.id === "close") {
    destroySessionKey();
    window.close();
  }
  else if (e.target.id === "update") {

    const ip = document.getElementById("host").value;

    if (!ip || ip == "") {
      bsAlert("Error", "A host is required");
    }
    else {
      localStorage.setItem("server_address", ip);
    }

  }
  else if (e.target.id === "copy") {
    navigator.clipboard.writeText(_credential.password);
    document.getElementById("copy").innerText = "Copied!";
  }
  else if (e.target.id === "password_field") {
    document.getElementById("password_field").innerText = _credential.password;
  }
});


const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (!linked) {
  bsAlert("Error", "Extension not linked with an app! Please link it first.").then(_ => {
    window.close();
  });
} 
else {

  const ip = localStorage.getItem("server_address");
  document.getElementById("host").value = ip;


  if (requestData.command === "get_client_key") {
    document.getElementById("instruction").innerText = "Requesting to unlock local vault .. move to your phone, open ANOTHERpass, start the server and follow the instructions.";
  }
  else if (requestData.command === "fetch_multiple_credentials") {
    document.getElementById("instruction").innerText = "Requesting to fetch multiple credentials .. move to your phone, open ANOTHERpass, start the server and follow the instructions.";
  }  
  else if (requestData.command === "fetch_all_credentials") {
    document.getElementById("instruction").innerText = "Requesting to fetch ALL credentials .. move to your phone, open ANOTHERpass, start the server and follow the instructions.";
  }
  else if (requestData.command === "fetch_credentials_for_uids") {
    document.getElementById("instruction").innerText = "Requesting to synchronize local vault.. move to your phone, open ANOTHERpass, start the server and follow the instructions.";
  }

  console.debug("requestData", requestData);
  const targetUrl = requestData.messageUrl;
  let targetUid = requestData.credentialUid;

  if (!targetUrl) {
    document.getElementById("websiteDetails").classList.add("d-none");
    document.getElementById("credentialOptions").classList.add("d-none");
  }
  else {
    document.getElementById("websiteTargetUrl").innerText = targetUrl;
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
      
      const baseKey = await getKey("base_key");
      const baseKeyAsArray = await aesKeyToArray(baseKey);
      const fingerprintAsArray = await hashKeys(baseKeyAsArray, sessionKeyAsArray);
      const formattedFingerprint = toShortenedFingerprint(fingerprintAsArray);

      document.getElementById("fingerprint").innerText = formattedFingerprint;


      const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
      const pollingInterval = localStorage.getItem("polling_interval") || 2;

      if (requestData.command === "fetch_credential_for_url") {
        const index = await createIndex(targetUrl);

        targetUid = localStorage.getItem(PREFIX_UID + index);
        console.debug("found for " + targetUrl + ": " + targetUid );

        const rememberDenied = localStorage.getItem(PREFIX_REMEMBER_DENIED + index);
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
            uid: targetUid,
            uids: targetUids
          };
        }
        
        const response = await chrome.runtime.sendMessage(request);
        console.debug("response = " + JSON.stringify(response));
        if (response.status == 403) {
          console.warn("Request rejected");
          document.getElementById("waiting_time").value = 0;
          document.getElementById("instruction").innerText = "Request was rejected!";
          document.getElementById("close").innerText = "Close";

          destroySessionKey();

          bsAlert("Error", "The request has been rejected in the app or the vault was locked.").then(_ => {
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

          if (requestData.command === "fetch_credential_for_url") {
            const credential = response.credential;
            const rememberCredentialSelection = document.getElementById("rememberCredentialSelection");

            const uid = credential.uid;
            const index = await createIndex(targetUrl);

            if (rememberCredentialSelection.checked) {
              console.debug("remember credential for " + targetUrl + " with uuid " + uid);
              localStorage.setItem(PREFIX_UID + index, uid);
              localStorage.removeItem(PREFIX_REMEMBER_DENIED + index);
            }
            else {
              console.debug("forget credential for " + targetUrl + " with uuid " + uid);
              localStorage.removeItem(PREFIX_UID + index);
              localStorage.setItem(PREFIX_REMEMBER_DENIED + index, true);
            }

            const saveCredentialInLocalVault = document.getElementById("saveCredentialInLocalVault");

            if (saveCredentialInLocalVault.checked) {
              console.debug("save credential in local vault with uuid " + uid);
              const clientKey = await unlockVault(clientKeyBase64);
              await saveCredential(credential, clientKey);
            }

            sendPasteCredentialMessage(credential.password, credential.user);
          }
          else if (requestData.command === "get_client_key") {
            await unlockVault(clientKeyBase64);

            //inform credential popup
            console.debug("refresh popup for tabId " + requestData.tabId);
            if (requestData.tabId) {
              chrome.runtime.sendMessage({ action: "refresh_credential_dialog", tabId: requestData.tabId });
            }

            //TODO close automatically if autoclose is enabled
            bsAlert("Success!", "Local vault unlocked.").then(_ => {
              window.close();
            });
          }
          else if (requestData.command === "fetch_multiple_credentials" || requestData.command === "fetch_all_credentials") {
            const credentials = response.credentials;

            const clientKey = await unlockVault(clientKeyBase64);
            const count = await saveAllCredentials(credentials, clientKey);

            //TODO close automatically if autoclose is enabled
            bsAlert("Success!", count + " credentials imported.").then(_ => {
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
            //TODO close automatically if autoclose is enabled
            bsAlert("Success!", "Credential synchronised.").then(_ => {
              window.close();
            });
          } 
          else if (requestData.command === "fetch_credentials_for_uids") {
            const credentials = response.credentials;
            const clientKey = await unlockVault(clientKeyBase64);

            const count = await saveAllCredentials(credentials, clientKey);
            //TODO close automatically if autoclose is enabled
            bsAlert("Success!", count + " credentials synchronised.").then(_ => {
              window.close();
            });
          }
        }
      }).catch(function (e) {
        console.error(e);
        document.getElementById("waiting_time").value = 0;
        document.getElementById("instruction").innerText = "Unable to receive credentials!";
        document.getElementById("close").innerText = "Close";

        destroySessionKey();

        bsAlert("Error", "You haven't opened the app in reasonable time or the host or port is wrong.").then(_ => {
          window.close();
        });
      });


      function sendPasteCredentialMessage(password, user) {

        browser.tabs.query({ active: true, currentWindow: false /* true for active popup, false for request password popup */ }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "paste_credential", password: password, user: user }, function () {
            window.close();
          });
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


        bsConfirm(
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
                    <b id="password_field" class="fingerprint_small cursor-pointer">**************  </b>
                    <button type="button" id="copy" title="Copy password to clipboard" class="btn btn-outline-primary rounded-0">Copy</button>
                  </div>
                </div>
              
              </div>


            </div>

          `,
          "Import and Close",
          "Close"
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
      bsAlert("Error", "Something went wrong! Re-link the app to solve this problem.").then(_ => {
        window.close();
      });
      console.error("cannot fetch credential", e)
    }
  });

}

async function saveCredential(credential, clientKey) {
  credential.createdAt = Date.now();
  const encCredential = await encryptMessage(clientKey, JSON.stringify(credential));
  localStorage.setItem(PREFIX_CREDENTIAL + credential.uid, encCredential);
}


async function saveAllCredentials(credentials, clientKey) {
  let count = 0;
  for (const credential of credentials) {
    await saveCredential(credential, clientKey);
    count++;
  }
  return count;
}

