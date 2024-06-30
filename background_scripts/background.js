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
  else if (message.action === "request_credential") {
    fetchCredential(message.requestIdentifier, sendResponse, message.website);
    return true;
  }
  else if (message.action === "start_link_flow") {
    openLinkWithQrCodeDialog();
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



function fetchCredential(requestIdentifier, sendResponse, website) {

  const request = {
    action: "request_credential",
    website: website,
    requestIdentifier: requestIdentifier
  };
  
  remoteCall(request, sendResponse);

}


function linkToApp(sendResponse) {

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


function openLinkWithQrCodeDialog() {
  
  let createData = {
    type: "detached_panel",
    url: "popup/app_link.html",
    width: 800,
    height: 765,
  };
  
  browser.windows.create(createData);
}


async function unlinkApp() {

  console.log("do unlink");

  variables.delete("linked");

  localStorage.removeItem("linked");
  localStorage.removeItem("web_client_id");
  localStorage.removeItem("server_address");
  localStorage.removeItem("server_port");
  localStorage.removeItem("linked_vault_id");
  localStorage.removeItem("symmetric_key_length");


  await destroyAllKeys(); 
  console.log("do unlink done");

}
