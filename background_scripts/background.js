console.log("Start extension");

// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action + ", sender: " + sender.url);

  switch (message.action) {
    case "create_context_menu": {
      createContextMenu();

      return true;
    }

    case "remove_context_menu": {
      removeContextMenu();

      return true;
    }

    case "get_tab_id": {
      sendResponse({tabId: sender.tab.id});

      return true;
    }
   
    case "get_session_value": {
      getSessionValue(message.key).then(value => {
        sendResponse({result: value});
      });

      return true;  
    }
    
    case "set_session_value": {

      setSessionValue(message.key, message.value).then(value => {
        sendResponse({result: value});
      });

      return true;  
    }
    
    case "delete_session_value": {
      deleteSessionValue(message.key).then(value => {
        sendResponse({result: value});
      });

      return true;  
    }   

    case "setup_vault_password": {
      setupVaultPassword(message.password).then(() => {
        sendResponse();
      });

      return true;  
    }

    case "unlock_with_password": {
      loadClientKeyFromStorage(message.password).then((result) => {
        sendResponse({result: result});
      });

      return true;  
    }
    
    case "update_extension_icon": {
      isLocalVaultUnlocked(true).then(isUnlocked => {
        console.log("update_extension_icon", isUnlocked);
        updateExtensionIcon(isUnlocked);
      });

      return true;  
    }

    case "start_password_request_flow": {
      openPasswordRequestDialog("fetch_credential_for_url", message.tabId, message.url, undefined, message.user);

      return true;  
    }

    case "start_password_creation_flow": {
      openPasswordRequestDialog("create_credential_for_url", message.tabId, message.url, undefined, message.user);

      return true;  
    }
    
    case "start_single_password_request_flow": {
      openPasswordRequestDialog("fetch_single_credential");

      return true;  
    }
    
    case "start_multiple_passwords_request_flow": {
      openPasswordRequestDialog("fetch_multiple_credentials");

      return true;  
    }    

    case "start_all_passwords_request_flow": {
      openPasswordRequestDialog("fetch_all_credentials");

      return true;  
    }
    
    case "start_download_vault_backup_flow": {
      openPasswordRequestDialog("download_vault_backup");

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

        
    case "apply_credential": {


      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          forwardCredential(tabs[0].id, message.uid);
        }
      });

      return true;  
    }
    
    case "get_username_from_field": {
      chrome.tabs.sendMessage(message.tabId, { action: "get_username_from_field" })
        .then(sendResponse);

      return true;  
    }
        
    case "close_credential_dialog": {
      chrome.tabs.sendMessage(message.tabId, { action: "close_credential_dialog" });

      return true;  
    }

            
    case "close_all_credential_dialogs": {
      closeAllCredentialDialogs(message);

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


getLocalValue("linked").then(async (linked) => {
  console.debug("app linked", linked);

  if (linked) {
  
    // init internal cache to avoid accessing local storage from content script
    await setSessionValue("linked", linked);
  
    const renderContentIcon = await getLocalValue("render_content_icon");
    const opacityOfContentIcon = await getLocalValue("opacity_content_icon");

    await setSessionValue("render_content_icon", renderContentIcon);
    await setSessionValue("opacity_content_icon", opacityOfContentIcon);
  
  
    createContextMenu();
  }
});




function closeAllCredentialDialogs() {
  chrome.tabs.query({ currentWindow: false }, function (tabs) {

    for (var i = 0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, { action: "close_credential_dialog" });
    }
  });
}

function createContextMenu() {
  chrome.contextMenus.create({
    id: "anotherpass-open-dialog",
    title: "Open ANOTHERpass dialog",
    contexts: ["editable"],
  },
    () => void chrome.runtime.lastError
  );

  chrome.contextMenus.create({
    id: "anotherpass-credential-request",
    title: "Request credential from ANOTHERpass",
    contexts: ["editable"],
  },
    // See https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/#event-pages-and-backward-compatibility
    // for information on the purpose of this error capture.
    () => void chrome.runtime.lastError
  );

  chrome.contextMenus.create({
    id: "anotherpass-credential-create-request",
    title: "Create new credential in ANOTHERpass",
    contexts: ["editable"],
  },
    // See https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/#event-pages-and-backward-compatibility
    // for information on the purpose of this error capture.
    () => void chrome.runtime.lastError
  );

  chrome.contextMenus.onClicked.addListener(onContextMenuClicked);
}


function removeContextMenu() {
  chrome.contextMenus.remove("anotherpass-open-dialog");
  chrome.contextMenus.remove("anotherpass-credential-request");
  chrome.contextMenus.remove("anotherpass-credential-create-request");

  chrome.contextMenus.onClicked.removeListener(onContextMenuClicked);
}


function onContextMenuClicked(info, tab) {
  if (info.menuItemId === "anotherpass-credential-request") {
    console.debug("tabUrl", tab.url);
    openPasswordRequestDialog("fetch_credential_for_url", tab.id, tab.url);
  }
  else if (info.menuItemId === "anotherpass-credential-create-request") {
    console.debug("tabUrl", tab.url);
    openPasswordRequestDialog("create_credential_for_url", tab.id, tab.url);
  }
  else if (info.menuItemId === "anotherpass-open-dialog") {
    chrome.tabs.sendMessage(tab.id, { action: "open_credential_dialog" });
  }
}


async function forwardCredential(tabId, uid) {

  const clientKey = await getClientKey(true);

  if (clientKey) {

    const encCredential = await findLocalByUid(PREFIX_CREDENTIAL, uid);

    if (encCredential) {
      try {
        const credential = JSON.parse(await decryptMessage(clientKey, encCredential));
        chrome.tabs.sendMessage(tabId, { action: "paste_credential", password: credential.password, user: credential.user });
      } catch(e) {
        console.error("cannot decrypt credential with uid " + uid + ". Ignored.", e);
      }
    }
    
  }
}

async function findLocalByUid(prefix, uid) {
  const all = await getAllLocalValues();
  for (const [key, value] of all) {
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
    user: message.user,
    uid: message.uid === null ? undefined : message.uid,
    uids: message.uids,
  };

  getLocalValue("polling_interval").then((value) => {
    const pollingInterval = (value || 2) * 1000;

    let timeout = Math.min(pollingInterval, 2000);
    if (message.command === "cancel_request") {
      timeout = 1000; 
    }
    console.debug("timeout", timeout);
    console.debug("pollingInterval", pollingInterval);
    remoteCall(request, sendResponse, true, timeout);  
  });
  
}

async function listLocalCredentials(url, sendResponse) {

  const clientKey = await getClientKey(true);

  if (clientKey) {
    
    const allCredentialNames = [];
    const suggestedCredentialNames = [];

    let preferedUid, preferedHostname;
    if (url) {
      const index = await createIndex(url);
      preferedUid = await getLocalValue(PREFIX_UID + index);
      const splitted = new URL(url).hostname.toLowerCase().split(".");
      if (splitted.length >= 2) {
        preferedHostname = splitted[splitted.length - 2] + "." + splitted[splitted.length - 1];
      }
      console.debug("found prefered for " + url + " (hostname=" + preferedHostname + "): " + preferedUid);
    }

    console.debug("read local credentials", url);
    const all = await getAllLocalValues();
    for (const [key, value] of all) {

      if (key.startsWith(PREFIX_CREDENTIAL)) {
        try {
          const credential = JSON.parse(await decryptMessage(clientKey, value));
          //console.debug("credential", credential);
          allCredentialNames.push({name: credential.name, uid: credential.uid});

          if (credential.website && preferedHostname && credential.website.toLowerCase().includes(preferedHostname)) {
            suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
          }
          else if (preferedHostname
            && (credential.name.toLowerCase().includes(preferedHostname) || preferedHostname.includes(credential.name.toLowerCase()))) {
            suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
          }
          else if (preferedUid && credential.uid === preferedUid) {
            suggestedCredentialNames.push({name: credential.name, uid: credential.uid});
          }
        } catch(e) {
          console.error("cannot decrypt credential with key " + key + ". Ignored.", e);
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
  const isLinking = await getTemporaryKey("is_linking", true);
  const linked = await getLocalValue("linked");
  const currentVaultId = await getLocalValue("linked_vault_id");

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
      clientPubKey: clientPublicKeyAsJWK,
      vaultId: currentVaultId,
    };  
  }
  else {
    request = {
      action: "link_app",
      clientPubKey: clientPublicKeyAsJWK,
    };  
  }
  
  remoteCall(request, sendResponse, true, 1000 * 60 * 3); // 3 Minutes before timeout to give the app time to generate the keys
}


function openPasswordRequestDialog(command, tabId, website, credentialUid, user) {
  var width = 660;
  var height = 570;
  if (website) {
    width = 680;
    height = 680;
  }

  const requestData = JSON.stringify({ 
    command: command,
    tabId: tabId,
    website: website, 
    user: user,
    credentialUid: credentialUid,
  });
  const createData = {
    type: "panel",
    url: "popup/request_password.html?data=" + encodeURIComponent(requestData),
    width: width,
    height: height,
  };
  
  console.log("open request password dialog");

  chrome.windows.create(createData);
}

function openLinkWithQrCodeDialog(relink) {
  
  let createData = {
    type: "panel",
    url: "popup/app_link.html?data=" + encodeURIComponent(JSON.stringify({relink: relink})),
    width: 800,
    height: 810,
  };
  
  chrome.windows.create(createData);
}


async function unlinkApp() {

  console.log("do unlink");

  await clearSessionValues();
  await clearLocalValues();

  removeContextMenu();
  closeAllCredentialDialogs();

  await destroyAllKeys(); 
  console.log("do unlink done");

}

async function setupVaultPassword(password) {
  const clientKey = await getClientKey(true);
  if (clientKey) {

    const exportedClientKey = await aesKeyToArray(clientKey);


    const salt = createRandomValues(16);
    await setLocalValue("local_v_salt", salt);

    const aesKey = await deriveKeyFromPassword(password, salt);
    const aesEncryptedClientKey = await encryptMessage(aesKey, bytesToBase64(exportedClientKey));


    const keyPair = await getKey("client_keypair");
    const appPublicKey = keyPair.publicKey;
    const rsaEncryptedClientKey = await encryptWithPublicKey(appPublicKey, new TextEncoder().encode(aesEncryptedClientKey));

    await setLocalValue("local_v_key", bytesToBase64(rsaEncryptedClientKey));
  }
}

async function loadClientKeyFromStorage(password) {
  const salt = await getLocalValue("local_v_salt");
  const encryptedClientKey = await getLocalValue("local_v_key");
  
  if (salt && encryptedClientKey) {

    try {

      const keyPair = await getKey("client_keypair");
      const aesEncryptedClientKey = await decryptWithPrivateKey(keyPair.privateKey, base64ToBytes(encryptedClientKey));
    
      const aesKey = await deriveKeyFromPassword(password, salt);
      const decryptedClientKey = await decryptMessage(aesKey, new TextDecoder().decode(aesEncryptedClientKey));


      if (decryptedClientKey) {
        await setTemporaryKey("clientKey", {
          clientKey: decryptedClientKey,
          timestamp: Date.now(),
        }, true);
        return true;
      }
      else {
        console.warn("Cannot decrypt local clientKey");
      }
    } catch(e) {
      console.error("cannot decrypt password", e);
    }
  }

  return false;
}


// duplicate of ui.js 
function updateExtensionIcon(unlocked) {
  if (unlocked) {
    chrome.action.setIcon({
      path: {
        24: "/icons/anotherpass-open-24.png",
        32: "/icons/anotherpass-open-32.png",
        48: "/icons/anotherpass-open-48.png",
        96: "/icons/anotherpass-open-96.png"
      },
    });
    chrome.action.setTitle({ title: "ANOTHERpass (Vault unlocked)" });
  }
  else {
    chrome.action.setIcon({
      path: {
        24: "/icons/anotherpass-24.png",
        32: "/icons/anotherpass-32.png",
        48: "/icons/anotherpass-48.png",
        96: "/icons/anotherpass-96.png"
      },
    });
    chrome.action.setTitle({ title: "ANOTHERpass (Vault locked)" });
  }
}
