

console.debug("app content inject");

let _dialog, _activeInput;

getTemporaryKey("linked").then((linked) => {
  console.debug("app linked: " + linked);

  if (linked) {


    var obs = new MutationObserver(function (mutations, observer) {
      //console.debug("got mutations", mutations.length);
      for (var j = 0; j < mutations.length; j++) {
        const mutation = mutations[j];
        //console.debug("got mutation", mutation);

        for (var i = 0; i < mutation.addedNodes.length; i++) {
          const addedNode = mutation.addedNodes[i];
          //console.debug("got added node", addedNode);

          const inputs = addedNode.querySelectorAll("input[type=password]");
          //console.debug("got password type", inputs);

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
        if (_dialog) {
          _dialog.close(); 
        } 
      }
    });

    function pasteCredential(p, sendResponse) {
      console.debug("received password to paste: '" + p + "'");
      

      if (_activeInput) {
        _activeInput.value = p;
      }
      else {
        let elem = document.activeElement;
        elem.value = p;
      }

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

  button.addEventListener("click", async function (event) {
    input.focus();
    _activeInput = input;//document.activeElement;

    const parsedUrl = new URL(window.location.href);

    const isUnlocked = await isLocalVaultUnlocked();
    if (isUnlocked) { 
      // unlocked
      console.log("event", event);
      showCredentialModal(event.clientX, event.clientY, window.location.href);  
    }
    else {
      //TODO could be in a modal as well
      chrome.runtime.sendMessage({
        action: "start_password_request_flow",
        url: parsedUrl.toString()
      });
    }


    
    
  }, false);
}



const showCredentialModal = (x, y, url) => { 
  console.log("modal");
  const modal = document.createElement("dialog"); 

  modal.setAttribute("style", `height:400px;width:300px,border: none;top:${y}px;left:${x}px;border-radius:10px;background-color:white;position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);`); 
  modal.innerHTML = `<iframe id="popup-content"; style="height:100%"></iframe><div style="position:absolute; top:0px; left:5px;"><button style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">x</button></div>`; 
  document.body.appendChild(modal); 
  const dialog = document.querySelector("dialog"); 
  _dialog = dialog;

  dialog.showModal(); 
  const iframe = document.getElementById("popup-content"); 
  console.log("iframe", iframe);

  iframe.frameBorder = 0; 
  dialog.querySelector("button").addEventListener("click", () => { 
    dialog.close(); 
  }); 


  chrome.runtime.sendMessage({ action: "get_tab_id" }, response => {
    console.debug("tabId", response.tabId);
    iframe.src = browser.runtime.getURL("../popup/choose_credential.html?data=" + encodeURIComponent(JSON.stringify({tabId: response.tabId, url: url}))); 
  });

  
}