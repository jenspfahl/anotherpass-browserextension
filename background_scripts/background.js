let currentRequesterUrl;
// global background listener, controlled with an "action"-property
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("background action: " + message.action);
  console.log("sender: " + JSON.stringify(sender));


  if (message.action === "start_password_request_flow") {
    currentRequesterUrl = message.url;

    openPasswordRequestDialog();
    return true; 

  }
  else if (message.action === "request_password") {
    fetchCredentials(sendResponse);
    return true;
  }
  else if (message.action === "start_link_flow") {
    openLinkTheAppDialog();
    return true; 

  }
  else if (message.action === "link_to_app") {
    linkToApp(sendResponse);
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
    console.log("context click");
    openPasswordRequestDialog();
  }
});

function fetchCredentials(sendResponse) {

  generateOrGetClientKeyPair().then(clientKeyPair => {
    const nextClientPublicKey = publicKeyToPEM(clientKeyPair.publicKey);
    const request = {
      action: "request_password",
      website: currentRequesterUrl,
      nextClientPublicKey: nextClientPublicKey
    };
    
    remoteCall(request, sendResponse);
  });

}


function linkToApp(sendResponse) {


  console.log("linkToApp");

  loadKeyPair("client_keypair", async function (keyPair) { 
    const clientPublicKey = keyPair.publicKey;
    const clientPublicKeyAsPEM = await publicKeyToPEM(clientPublicKey);

    const request = {
      action: "link_app",
      clientPublicKey: clientPublicKeyAsPEM
    };

    console.log("linkToApp send: " + JSON.stringify(request));
    
    remoteCall(request, sendResponse);
  });
}


function openPasswordRequestDialog(url) {
  let createData = {
    type: "detached_panel",
    url: "popup/request_password.html",
    width: 820,
    height: 380,
  };

  console.log("open request password dialog");

  browser.windows.create(createData);
}


function openLinkTheAppDialog() {
  const webClientId = localStorage.getItem("web_client_id");

  if (webClientId) {
    let createData = {
      type: "detached_panel",
      url: "popup/app_unlink.html",
      width: 700,
      height: 300,
    };
  
    console.log("open link the app dialog");
  
    browser.windows.create(createData);
  }
  else {
    let createData = {
      type: "detached_panel",
      url: "popup/app_link.html",
      width: 800,
      height: 800,
    };
  
    console.log("open link the app dialog");
  
    browser.windows.create(createData);
  }

  
}
