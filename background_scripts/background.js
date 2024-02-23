// background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("in bg");

  fetch('http://' + message.ip + ':8001/', {
    method: 'GET'
  }).then(res => {
    console.log("get " + res);

    return res.text();
  }).then(res => {

    console.log("send " + res);

    sendResponse({ response: JSON.parse(res) });
  }).catch(e => {
    console.warn(e);
    sendResponse({ response: null });
  });
  return true
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

    let createData = {
      type: "detached_panel",
      url: "popup/request_password.html",
      width: 450,
      height: 300,
    };

    console.log("open request password dialog");

    let creating = browser.windows.create(createData);

  }
});

