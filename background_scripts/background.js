console.log("Start extension");
const variables = new Map();

// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action + ", sender: " + sender.url);

  if (message.action == "get_tab_id") {
    sendResponse({tabId: sender.tab.id});
  }
  else if (message.action == "get") {
    sendResponse({result: variables.get(message.key)});
    return true; 
  } 
  else if (message.action == "set") {
    variables.set(message.key, message.value);
    sendResponse({result: message.value});
    return true; 
  }
  else if (message.action == "delete") {
    sendResponse({result: variables.delete(message.key)});
    return true; 
  }
  else if (message.action === "start_password_request_flow") {
    openPasswordRequestDialog(undefined, true, message.url);
    return true; 
  }
  if (message.action === "start_single_password_request_flow") {
    openPasswordRequestDialog(undefined, false, null);
    return true; 
  }
  if (message.action === "start_client_key_request_flow") {
    openPasswordRequestDialog(message.tabId); 
    return true; 
  }
  else if (message.action === "request_credential") {
    fetchCredential(message.requestIdentifier, sendResponse, message.website, message.uid, message.requestClientKey);
    return true;
  }
  else if (message.action === "list_local_credentials") {
    listLocalCredentials(message.url, sendResponse);
    return true;
  }
  else if (message.action === "forward_credential") {
    forwardCredential(message.tabId, message.uid);
    return true;
  }
  else if (message.action === "close_credential_dialog") {
    chrome.tabs.sendMessage(message.tabId, { action: "close_credential_dialog" });
    return true;
  }
  else if (message.action === "refresh_credential_dialog") {
    chrome.tabs.sendMessage(message.tabId, { action: "refresh_credential_dialog" });
    return true;
  }
  else if (message.action === "start_link_flow") {
    openLinkWithQrCodeDialog(message.relink);
    return true; 
  }
  else if (message.action === "start_unlink_flow") {
    unlinkApp().then(async _ => {
      sendResponse();
    });
    return true; 
  }
  else if (message.action === "link_to_app") {
    linkToApp(sendResponse);
    return true; 
  }

  return false; 
});



const linked = localStorage.getItem("linked");
if (linked) {

  // init internal cache to avoid accessing localStorage from content script
  variables.set("linked", linked);


  // Callback reads runtime.lastError to prevent an unchecked error from being 
  // logged when the extension attempt to register the already-registered menu 
  // again. Menu registrations in event pages persist across extension restarts.
  browser.contextMenus.create({
    id: "anotherpass-request",
    title: "Request credential from ANOTHERpass",
    contexts: ["password"], // or "editable"?
  },
    // See https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/#event-pages-and-backward-compatibility
    // for information on the purpose of this error capture.
    () => void browser.runtime.lastError,
  );


  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "anotherpass-request") {
      openPasswordRequestDialog(tab.id, true, tab.url);
    }
  });
}



async function forwardCredential(tabId, uid) {

  const clientKey = await getClientKey(variables);

  if (clientKey) {

    const encCredential = findLocalByUid(PREFIX_CREDENTIAL, uid);

    if (encCredential) {
      const credential = JSON.parse(await decryptMessage(clientKey, encCredential));
      chrome.tabs.sendMessage(tabId, { action: "paste_credential", password: credential.password });
    }
    
  }
}

function findLocalByUid(prefix, uid) {
  for (var i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);

    if (key.startsWith(prefix)) {
      const keyUid = key.substring(prefix.length);
      if (keyUid === uid) {
        return value;
      }
    }
  }
}

function fetchCredential(requestIdentifier, sendResponse, website, uid, requestClientKey) {

  const request = {
    action: "request_credential",
    website: website === null ? undefined : website,
    uid: uid === null ? undefined : uid,
    requestIdentifier: requestIdentifier,
    requestClientKey: requestClientKey,
  };
  
  remoteCall(request, sendResponse, variables);

}

async function listLocalCredentials(url, sendResponse) {
  const clientKey = await getClientKey(variables);

  if (clientKey) {
    
    const allCredentialNames = [];
    const suggestedCredentialNames = [];

    const index = await createIndex(url);
    const preferedUid = localStorage.getItem(PREFIX_UID + index);
    const preferedHostname = new URL(url).hostname.toLowerCase();
    console.debug("found prefered for " + url + " (hostname=" + preferedHostname + "): " + preferedUid);


    for (var i = 0; i < localStorage.length; i++){
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);

      if (key.startsWith(PREFIX_CREDENTIAL)) {
        const credential = JSON.parse(await decryptMessage(clientKey, value));
        //console.debug("credential", credential);
        allCredentialNames.push({name: credential.name, uid: credential.uid});

        if (credential.website && url && 
          (credential.website.toLowerCase().includes(url) || url.includes(credential.website.toLowerCase()))) {
            suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
        }
        else if (credential.uid === preferedUid) {
          suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
        }
        else if (credential.name.toLowerCase().includes(preferedHostname) || preferedHostname.includes(credential.name.toLowerCase())) {
          suggestedCredentialNames.push({name: credential.name, uid: credential.uid});

        }
      }
    }

    allCredentialNames.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    suggestedCredentialNames.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));

    console.debug("credentials", allCredentialNames);
    console.debug("matches", suggestedCredentialNames);
  

    sendResponse({matches: suggestedCredentialNames, credentials: allCredentialNames});
  }
}


async function linkToApp(sendResponse) {

  let clientKeyPair;
  const isLinking = await getTemporaryKey("is_linking", variables);
  const linked = await getLocalKey("linked");
  const currentVaultId = await getLocalKey("linked_vault_id");

  console.debug("(1) use temporary client keys:" + isLinking + ", currentVaultId=" + currentVaultId);

  if (isLinking) {
    clientKeyPair = await getKey("temp_client_keypair");
  }
  else {
    clientKeyPair = await getKey("client_keypair");
  }

  const clientPublicKey = clientKeyPair.publicKey;
  const clientPublicKeyAsJWK = await publicKeyToJWK(clientPublicKey);
  let request;
  if (linked && currentVaultId) {
    request = {
      action: "link_app",
      clientPublicKey: clientPublicKeyAsJWK,
      vaultId: currentVaultId,
    };  
  }
  else {
    request = {
      action: "link_app",
      clientPublicKey: clientPublicKeyAsJWK,
    };  
  }
  
  remoteCall(request, sendResponse, variables);
}


function openPasswordRequestDialog(tabId, autofill, messageUrl) {
  var width = 660;
  var height = 540;
  if (messageUrl) {
    width = 680;
    height = 630;
  }

  let createData;
  if (autofill === undefined && messageUrl === undefined) {
    createData = {
      type: "detached_panel",
      url: "popup/request_password.html?data=" + encodeURIComponent(JSON.stringify({requestClientKey: true, tabId: tabId})),
      width: width,
      height: height,
    };
  }
  else {
    createData = {
      type: "detached_panel",
      url: "popup/request_password.html?data=" + encodeURIComponent(JSON.stringify({autofill: autofill, messageUrl: messageUrl, tabId: tabId})),
      width: width,
      height: height,
    };
  }

  console.log("open request password dialog");

  browser.windows.create(createData);
}


function openLinkWithQrCodeDialog(relink) {
  
  let createData = {
    type: "detached_panel",
    url: "popup/app_link.html?data=" + encodeURIComponent(JSON.stringify({relink: relink})),
    width: 800,
    height: 765,
  };
  
  browser.windows.create(createData);
}


async function unlinkApp() {

  console.log("do unlink");

  variables.delete("linked");

  localStorage.clear();


  await destroyAllKeys(); 
  console.log("do unlink done");

}
