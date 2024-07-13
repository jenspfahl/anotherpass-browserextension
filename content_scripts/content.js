

console.debug("app content inject");

let _dialog, _activeInput, _x, _y, _url;

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
      if (msg.action === "close_credential_dialog") {
        if (_dialog) {
          _dialog.close(); 
        } 
      }
      if (msg.action === "refresh_credential_dialog") {
        if (_dialog) {
          _dialog.close(); 
          console.debug("Reopen dialog at x:" + _x + ", y:" + _y + " with url:" + _url);
          showCredentialModal(_x, _y, _url);
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

    console.log("event", event);
    const w = window.innerWidth;
    const h = window.innerHeight; 
    let x = event.pageX;
    let y = event.pageY;


    if (y > h - 450) {
      console.log("adjust y:", y);

      y = h - 450;
      if (y < 0) y = 0;
    }
    console.log("x:", x);
    console.log("y:", y);


    console.log("window w:" + w + ", h:" + h);
    showCredentialModal(x, y , window.location.href);  

  }, false);
}



const showCredentialModal = (x, y, url) => { 
  console.log("modal");

  _x = x;
  _y = y;
  _url = url;
  const modal = document.createElement("dialog"); 

  modal.setAttribute("style", `overflow: hidden; padding: 0px; height: 400px; width: 300px; border: none; top: ${y}px; left: ${x}px; border-radius: 10px; background-color: white; position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);`); 
  modal.innerHTML = `
  <iframe id="popup-content"; style="height:100%; width: 100%"></iframe>
  <div style="position:absolute; top:5px; right:5px;">
    <button style="padding: 8px 12px; font-size: 14px; border: none; border-radius: 15px;">
     x
    </button>
  </div>`; 
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