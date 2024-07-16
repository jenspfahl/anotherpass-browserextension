console.log("Start extension");
const variables = new Map();

// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action + ", sender: " + sender.url);

  switch (message.action) {

    case "get_tab_id": {
      sendResponse({tabId: sender.tab.id});

      return true;
   }
   
    case "get": {
      sendResponse({result: variables.get(message.key)});

      return true;  
    }
    
    case "set": {
      variables.set(message.key, message.value);
      sendResponse({result: message.value});

      return true;  
    }
    
    case "delete": {
      sendResponse({result: variables.delete(message.key)});

      return true;  
    }
    
    case "start_password_request_flow": {
      openPasswordRequestDialog("fetch_credential_for_url", undefined, message.url);

      return true;  
    }
    
    case "start_single_password_request_flow": {
      openPasswordRequestDialog("fetch_single_credential");

      return true;  
    }
    
    case "start_all_passwords_request_flow": {
      openPasswordRequestDialog("fetch_all_credentials");

      return true;  
    }
    
    case "start_sync_password_request_flow": {
      openPasswordRequestDialog("fetch_credential_for_uid", undefined, undefined, message.uid);

      return true;  
    }
        
    case "start_sync_passwords_request_flow": {
      openPasswordRequestDialog("fetch_credentials_for_uids");

      return true;  
    }
    
    case "start_client_key_request_flow": {
      openPasswordRequestDialog("get_client_key", message.tabId); 

      return true;  
    }
    
    case "request_credential": {
      fetchCredential(message, sendResponse);

      return true;  
    }
    
    case "list_local_credentials": {
      listLocalCredentials(message.url, sendResponse);

      return true;  
    }
    
    case "forward_credential": {
      forwardCredential(message.tabId, message.uid);

      return true;  
    }
    
    case "close_credential_dialog": {
      chrome.tabs.sendMessage(message.tabId, { action: "close_credential_dialog" });

      return true;  
    }
    
    case "refresh_credential_dialog": {
      chrome.tabs.sendMessage(message.tabId, { action: "refresh_credential_dialog" });

      return true;  
    }
    
    case "start_link_flow": {
      openLinkWithQrCodeDialog(message.relink);

      return true;  
    }
    
    case "start_unlink_flow": {
      unlinkApp().then(async _ => {
        sendResponse();
      });

      return true;  
    }
    
    case "link_to_app": {
      linkToApp(sendResponse);

      return true;  
    }
    
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
      openPasswordRequestDialog("fetch_credential_for_url", tab.id, tab.url);
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

function fetchCredential(message, sendResponse) {

  const request = {
    action: "request_credential",
    command: message.command,
    requestIdentifier: message.requestIdentifier,
    website: message.website === null ? undefined : message.website,
    uid: message.uid === null ? undefined : message.uid,
    uids: message.uids,
  };
  
  remoteCall(request, sendResponse, variables);

}

async function listLocalCredentials(url, sendResponse) {

  const clientKey = await getClientKey(variables);

  if (clientKey) {
    
    const allCredentialNames = [];
    const suggestedCredentialNames = [];

    let preferedUid, preferedHostname;
    if (url) {
      const index = await createIndex(url);
      preferedUid = localStorage.getItem(PREFIX_UID + index);
      preferedHostname = new URL(url).hostname.toLowerCase();
      console.debug("found prefered for " + url + " (hostname=" + preferedHostname + "): " + preferedUid);
    }

    console.debug("read local credentials", url);
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
        else if (preferedUid && credential.uid === preferedUid) {
          suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
        }
        else if (preferedUid 
          && (credential.name.toLowerCase().includes(preferedHostname) || preferedHostname.includes(credential.name.toLowerCase()))) {
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
  else {
    console.log("Local vault locked for this operation!");
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


function openPasswordRequestDialog(command, tabId, messageUrl, credentialUid) {
  var width = 660;
  var height = 540;
  if (messageUrl) {
    width = 680;
    height = 630;
  }

  const requestData = JSON.stringify({ 
    command: command,
    tabId: tabId,
    messageUrl: messageUrl, 
    credentialUid: credentialUid,
  });
  const createData = {
    type: "detached_panel",
    url: "popup/request_password.html?data=" + encodeURIComponent(requestData),
    width: width,
    height: height,
  };
  
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
