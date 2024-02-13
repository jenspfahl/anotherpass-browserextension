
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
      inputIp();
    
    } 
  });
//}




function handleResponse(message) {
  console.log(`Message from the background script: ${message.response}`);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function inputIp() {

  console.log("here");

  const sending = browser.runtime.sendMessage({
    greeting: "Greeting from the content script",
  });
  sending.then(handleResponse, handleError);


  console.log("there");


  var name = prompt("Enter IP address:");

  if (name == null || name == "") {
    alert("You did not entert anything. Please enter your name again");
  }
  else {
    alert("You enterted: " + name);
  }
}