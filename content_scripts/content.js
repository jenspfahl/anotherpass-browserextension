

console.debug("app content inject");
getTemporaryKey("linked").then((linked) => { 
  console.debug("app linked: " + linked);

  if (linked) {


    var obs = new MutationObserver(function (mutations, observer) {
      console.debug("got mutations", mutations.length);
      for (var j = 0; j < mutations.length; j++) {
        const mutation = mutations[j];
        console.debug("got mutation", mutation);

        for (var i = 0; i < mutation.addedNodes.length; i++) {
          const addedNode = mutation.addedNodes[i];
          console.debug("got added node", addedNode);

          const inputs = addedNode.querySelectorAll("input[type=password]");
          console.debug("got password type", inputs);

          for (var l = 0; l < inputs.length; l++) {
            const input = inputs[l];
            
            console.debug("found password field");
            addButton(input);
          }
            
        }
      }

      
    });

    obs.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
    
    
    

    const inputs = document.querySelectorAll("input[type=password]");
    for (var j = 0; j < inputs.length; j++) {
      const input = inputs[j];
      
      //console.debug("found password field");
      addButton(input);
      
    }



    /*chrome.extension*/browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

      if (msg.action === "paste_credential") {
        pasteCredential(msg.password, sendResponse);
      }
    });

    function pasteCredential(p, sendResponse) {
      //console.debug("received password to paste: '" + p + "'");
      let elem = document.activeElement;

      elem.value = p;

      sendResponse(p);
    }

  }


});

function addButton(input) {
  const button = document.createElement('button');
  button.type = "button";
  button.className = "requestCredentialButton";

  const target = input.parentNode;
  const oldButton = target.querySelector(".requestCredentialButton");

  if (oldButton) {
    target.removeChild(oldButton);
  }
  target.insertBefore(button, input);

  button.addEventListener("click", function () {
    input.focus();

    const parsedUrl = new URL(window.location.href);
    chrome.runtime.sendMessage({
      action: "start_password_request_flow",
      url: parsedUrl.toString()
    });

  }, false);
}

