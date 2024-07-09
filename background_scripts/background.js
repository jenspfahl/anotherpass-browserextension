const variables = new Map();

// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action + ", sender: " + sender.url);

  if (message.action == "get") {
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
    openPasswordRequestDialog(true, message.url);
    return true; 
  }
  if (message.action === "start_single_password_request_flow") {
    openPasswordRequestDialog(false, null);
    return true; 
  }
  if (message.action === "start_client_key_request_flow") {
    openPasswordRequestDialog(false, null); //TODO
    return true; 
  }
  else if (message.action === "request_credential") {
    fetchCredential(message.requestIdentifier, sendResponse, message.website, message.uid);
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
      openPasswordRequestDialog(true, tab.url);
    }
  });
}



function fetchCredential(requestIdentifier, sendResponse, website, uid) {

  const request = {
    action: "request_credential",
    website: website === null ? undefined : website,
    uid: uid === null ? undefined : uid,
    requestIdentifier: requestIdentifier,
  };
  
  remoteCall(request, sendResponse, variables);

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


function openPasswordRequestDialog(autofill, messageUrl) {
  var width = 660;
  var height = 540;
  if (messageUrl) {
    width = 680;
    height = 630;
  }
  let createData = {
    type: "detached_panel",
    url: "popup/request_password.html?data=" + encodeURIComponent(JSON.stringify({autofill: autofill, messageUrl: messageUrl})),
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
