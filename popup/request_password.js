
document.addEventListener("click", (e) => {


  console.log("click");


function handleResponse(message) {
  console.log(`Message from the password fetch: ${message.response}`);
  browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
    console.log("send msg " + JSON.stringify(message.response));

    chrome.tabs.sendMessage(tabs[0].id, { action: "paste", p: message.response.passwd }, function (response) {
      //alert(response);
      window.close();
    });
  });
}

function handleError(error) {
  console.log(`Error: ${error}`);
}



  /**
  * Get the active tab,
  * then call "beastify()" or "reset()" as appropriate.
  */
  if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  if (e.target.type === "reset") {

    const sending = chrome.runtime.sendMessage({
      ip: "192.168.178.27",
    });
    sending.then(handleResponse, handleError);
  
  }
});



function inputIp() {

  console.log("here");


  var ip = prompt("Enter IP address:");

  if (ip == null || ip == "") {
    ip = "192.168.178.27";
  }

  const sending = chrome.runtime.sendMessage({
    ip: ip,
  });
  sending.then(handleResponse, handleError);


  console.log("there");




}