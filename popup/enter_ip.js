
//function listenForClicks() {
  document.addEventListener("click", (e) => {


    console.log("click");


    /**
    * Get the active tab,
    * then call "beastify()" or "reset()" as appropriate.
    */
    if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
      // Ignore when click is not on a button within <div id="popup-content">.
      return;
    }
    if (e.target.type === "reset") {

      browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
        console.log("send msg " + JSON.stringify(tabs));
  
        chrome.tabs.sendMessage(tabs[0].id, { action: "paste", p: "123456" }, function (response) {
          alert(response);
        });
      });


      //inputIp();
    
    } 
  });
//}




function handleResponse(message) {
  console.log(`Message from the background script: ${message.response}`);
  alert(message.response);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

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