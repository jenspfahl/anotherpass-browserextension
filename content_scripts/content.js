

console.debug("app content inject");

let _dialog, _x, _y, _url, popupOpen;

const usernameFields = [];
const passwordFields = [];


getTemporaryKey("linked").then(async (linked) => {
  console.debug("app linked: " + linked);

  if (linked) {

    const renderContentIcon = await getTemporaryKey("render_content_icon");
    console.debug("renderContentIcon", renderContentIcon);

    if (renderContentIcon == undefined || renderContentIcon === true || renderContentIcon === "true") {
      var obs = new MutationObserver(function (mutations, observer) {
        //console.debug("got mutations", mutations.length);
        for (var j = 0; j < mutations.length; j++) {
          const mutation = mutations[j];
          //console.debug("got mutation", mutation);

          for (var i = 0; i < mutation.addedNodes.length; i++) {
              const addedNode = mutation.addedNodes[i];
              //console.debug("got added node", addedNode);

              if (addedNode instanceof Document) {
              const inputs = addedNode.querySelectorAll("input");
              //console.debug("got password type", inputs);

              for (var l = 0; l < inputs.length; l++) {
                const input = inputs[l];

                console.debug("found password field");
                addButton(input);
              }
            }

          }
        }


      });

      obs.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });




      const inputs = document.querySelectorAll("input");
      for (var j = 0; j < inputs.length; j++) {
        const input = inputs[j];

        console.debug("found password field");
        addButton(input);

      }
    }



    /*chrome.extension*/browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

      if (msg.action === "paste_credential") {
        pasteCredential(msg.password, msg.user);
        if (_dialog) {
          popupOpen = false;
          _dialog.close();
        }
      }
      if (msg.action === "close_credential_dialog") {
        if (_dialog) {
          popupOpen = false;
          _dialog.close();
        }
      }
      if (msg.action === "refresh_credential_dialog") {
        if (_dialog) {
          popupOpen = false;
          _dialog.close();
          console.debug("Reopen dialog at x:" + _x + ", y:" + _y + " with url:" + _url);
          showCredentialModal(_x, _y, _url);
        }
      }
      if (msg.action === "open_credential_dialog") {
        const input = document.activeElement;
        openPopup(input.offsetLeft, input.offsetHeight, input);
      }
    });


    function pasteCredential(password, user) {
      console.debug("received password to paste: '" + password + "'");


      passwordFields.forEach(field => {
        field.value = password;
      });

      if (user && user.trim().length > 0) {
        usernameFields.forEach(field => {
          field.value = user;
        });
      }

    }

  }


});

function addButton(input) {

  console.debug("input.type", input.type);
  console.debug("input.nodeName", input.nodeName);

  if (input.type == "password") {
    passwordFields.push(input);
    console.log("Add to password fields", input);
  }
  else if (input.nodeName.toLowerCase() === "input"
    && (input.type.toLowerCase() === "text" || input.type.toLowerCase() === "email")
    && (checkUsernameField(input.type)
      || checkUsernameField(input.id)
      || checkUsernameField(input.class)
      || checkUsernameField(input.name)
      || checkUsernameField(input.placeholder)
    )) {
    console.log("Add to username fields", input);
    usernameFields.push(input);
  }
  else {
    return;
  }

  const button = document.createElement('button');
  button.type = "button";
  button.classList.add("requestCredentialButton");

  const inputHeight = input.clientHeight + 2;
  const inputWidth = input.clientWidth - inputHeight;

  console.debug("inputHeight", inputHeight);
  console.debug("inputWidth", inputWidth);
  //button.style.left = inputWidth + "px";

  if (inputHeight <= 24) {
    button.classList.add("dimension-24");
  }
  else if (inputHeight <= 32) {
    button.classList.add("dimension-32");
  }
  else {
    button.classList.add("dimension-48");
  }
  button.style.width = inputHeight + "px";
  button.style.height = inputHeight + "px";
  button.style.border = input.border;

  const target = input.parentNode;
  const oldButton = target.querySelector(".requestCredentialButton");

  if (oldButton) {
    target.removeChild(oldButton);
  }
  target.insertBefore(button, input);


  button.addEventListener("click", (e) => openPopup(e.pageX, e.pageY, input), false);
}



function checkUsernameField(field) {
  if (!field) {
    return false;
  }
  const string = field.toString().toLowerCase();
  console.debug("check field", string);
  return (string.includes("login")
    || string.includes("email")
    || string.includes("user")
    || string.includes("acount")
  )
}



const showCredentialModal = (x, y, url) => {
  console.log("modal");

  _x = x;
  _y = y;
  _url = url;
  const modal = document.createElement("dialog");

  modal.setAttribute("style", `overflow: hidden; padding: 0px; height: 450px; width: 300px; border: none; top: ${y}px; left: ${x}px; border-radius: 10px; background-color: white; position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);`);
  modal.innerHTML = `
  <iframe id="popup-content"; style="height:100%; width: 100%"></iframe>
  <div style="position:absolute; top:5px; right:5px;">
    <button style="padding: 8px 12px; font-size: 14px; border: none; border-radius: 10px; background-color: #444; color: white">
     X
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
    popupOpen = false;
    dialog.close();
  });


  chrome.runtime.sendMessage({ action: "get_tab_id" }, response => {
    console.debug("tabId", response.tabId);
    iframe.src = browser.runtime.getURL("../popup/choose_credential.html?data=" + encodeURIComponent(JSON.stringify({ tabId: response.tabId, url: url })));
  });


}

async function openPopup(posX, posY, input) {
  popupOpen = true;
  input.focus();

  const w = window.innerWidth;
  const h = window.innerHeight;
  let x = posX;
  let y = posY;


  if (y > h - 450) {
    console.log("adjust y:", y);

    y = h - 450;
    if (y < 0)
      y = 0;
  }
  console.log("x:", x);
  console.log("y:", y);


  console.log("window w:" + w + ", h:" + h);
  showCredentialModal(x, y, window.location.href);

}

