let currentRequesterUrl;
// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action);
  console.log("sender: " + JSON.stringify(sender));


  if (message.action === "start_password_request_flow") {
    currentRequesterUrl = message.url;
    openPasswordRequestDialog(true);
    return true; 
  }
  if (message.action === "start_single_password_request_flow") {
    currentRequesterUrl = message.url;
    openPasswordRequestDialog(false);
    return true; 
  }
  else if (message.action === "request_credential") {
    fetchCredentials(message.requestIdentifier, sendResponse);
    return true;
  }
  else if (message.action === "start_link_flow") {
    openLinkWithQrCodeDialog();
    return true; 
  }
  else if (message.action === "continue_link_flow") {
    openLinkWithPollDialog();
    return true; 
  }
  else if (message.action === "start_unlink_flow") {
    openUnlinkDialog();
    return true; 
  }
  else if (message.action === "link_to_app") {
    linkToApp(sendResponse);
    return true; 
  }
  else if (message.action === "open_settings") {
    openSettings();
    return true; 
  }
  else if (message.action === "open_message_dialog") {
    openMessageDialog(message.title, message.text);
    return true; 
  }
  else if (message.action === "open_confirmation_dialog") {
    openConfirmationDialog(message.title, message.text, message.confirmAction);
    return true; 
  }
  else if (message.action === "open_credential_dialog") {
    openCredentialDialog(message.credential);
    return true; 
  }
  return false; 
});




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
    openPasswordRequestDialog();
  }
});

function fetchCredentials(requestIdentifier, sendResponse) {

  const request = {
    action: "request_credential",
    website: currentRequesterUrl,
    requestIdentifier: requestIdentifier
  };
  
  remoteCall(request, sendResponse);

}


function linkToApp(sendResponse) {


  console.log("linkToApp");

  getKey("client_keypair").then(async value => {
    const clientPublicKey = value.publicKey;
    const clientPublicKeyAsJWK = await publicKeyToJWK(clientPublicKey);
    const request = {
      action: "link_app",
      clientPublicKey: clientPublicKeyAsJWK
    };
    
    remoteCall(request, sendResponse);
  });
}


function openPasswordRequestDialog(autofill) {
  let createData = {
    type: "detached_panel",
    url: "popup/request_password.html?data=" + encodeURIComponent(JSON.stringify({autofill: autofill})),
    width: 820,
    height: 380,
  };

  console.log("open request password dialog");

  browser.windows.create(createData);
}


function openLinkWithQrCodeDialog() {
  
  let createData = {
    type: "detached_panel",
    url: "popup/app_link.html",
    width: 800,
    height: 600,
  };
  
  browser.windows.create(createData);
}

function openUnlinkDialog() {
  
  let createData = {
    type: "detached_panel",
    url: "popup/app_unlink.html",
    width: 700,
    height: 200,
  };
  
  browser.windows.create(createData);
}

function openLinkWithPollDialog() {

  let createData = {
    type: "detached_panel",
    url: "popup/app_link_approve.html",
    width: 800,
    height: 600,
  };

  console.log("open link the app dialog");

  browser.windows.create(createData);
}

function openSettings() {
  let createData = {
    type: "detached_panel",
    url: "popup/settings.html",
    width: 520,
    height: 400,
  };

  browser.windows.create(createData);
}


function openMessageDialog(title, text) {
  let createData = {
    type: "detached_panel",
    url: "popup/message_dialog.html?data=" + encodeURIComponent(JSON.stringify({title: title, text: text})),
    width: 600,
    height: 300,
  };

  browser.windows.create(createData);
}



function openConfirmationDialog(title, text, confirmAction) {
  let createData = {
    type: "detached_panel",
    url: "popup/confirmation_dialog.html?data=" + encodeURIComponent(JSON.stringify({title: title, text: text, confirmAction: confirmAction})),
    width: 600,
    height: 300,
  };

  browser.windows.create(createData);
}

function openCredentialDialog(credential) {
  console.log("openCredentialDialog with " + JSON.stringify(credential));
  let createData = {
    type: "detached_panel",
    url: "popup/credential_dialog.html?data=" + encodeURIComponent(JSON.stringify(credential)),
    width: 600,
    height: 400,
  };

  browser.windows.create(createData);
}