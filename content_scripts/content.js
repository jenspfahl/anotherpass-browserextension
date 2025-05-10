

console.debug("app content inject");

let _dialog, _x, _y, _url, popupOpen;

const usernameFields = [];
const passwordFields = [];
const otpFields = [];


getTemporaryKey("linked").then(async (linked) => {
  console.debug("app linked: " + linked);

  if (linked) {

    const renderContentIcon = await getTemporaryKey("render_content_icon");
    const renderIcons = (renderContentIcon == undefined || renderContentIcon === true || renderContentIcon === "true");
    const opacityOfContentIcon = await getTemporaryKey("opacity_content_icon");
    const positionOfContentIcon = await getTemporaryKey("position_content_icon");

    console.debug("renderContentIcon", renderContentIcon);

    
    var obs = new MutationObserver(function (mutations, observer) {
      //console.debug("got mutations", mutations.length);
      for (var j = 0; j < mutations.length; j++) {
        const mutation = mutations[j];
        //console.debug("got mutation", mutation);

        for (var i = 0; i < mutation.addedNodes.length; i++) {
            const addedNode = mutation.addedNodes[i];
            //console.debug("got added node", addedNode);

            if (typeof addedNode.querySelectorAll !== "undefined") { 
              const inputs = addedNode.querySelectorAll("input");
              //console.debug("got password type", inputs);

              for (var l = 0; l < inputs.length; l++) {
                const input = inputs[l];

                console.debug("found password field");
                addButton(input, renderIcons, opacityOfContentIcon, positionOfContentIcon);
              }
            }

        }
      }


    });

    console.log("add observation listener");
    obs.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });


    console.log("presearch credential fields");
    const inputs = document.querySelectorAll("input");
    console.log("found input count on research", inputs.length);

    for (var j = 0; j < inputs.length; j++) {
      const input = inputs[j];

      console.debug("found password field");
      addButton(input, renderIcons, opacityOfContentIcon, positionOfContentIcon);
    }

    // delayed search in case of missing loaded elements
    setTimeout(() => {
      console.log("search credential fields");
      const inputs = document.querySelectorAll("input");
      console.log("found input count", inputs.length);

      for (var j = 0; j < inputs.length; j++) {
        const input = inputs[j];

        console.debug("found password field");
        addButton(input, renderIcons, opacityOfContentIcon, positionOfContentIcon);

      }

    }, 2500);

    
  

    const response = await chrome.runtime.sendMessage({ action: "get_tab_id" });
    const currentTabId = response.tabId;


    if (chrome.runtime.onMessage.hasListener(eventHandler)) {
      console.debug("Already found a listener");
      chrome.runtime.onMessage.removeListener(eventHandler);
    }
    chrome.runtime.onMessage.addListener(eventHandler);


    function eventHandler(msg, sender, sendResponse) {

      console.debug("content msg received: action=" + msg.action + " currentTabId=" + currentTabId);

      if (msg.action === "paste_credential") {
        pasteCredential(msg.password, msg.user, msg.otp);


        // store credential in session for the next minute and add an action icon to paste it from mem, used if e.g. username and password is requested in two steps.
        setTemporaryKey("last_used_credential", {user: msg.user, password: msg.password, name: msg.name});
        // delayed search in case of missing loaded elements
        setTimeout(() => {
          console.log("clear cached credential");
          deleteTemporaryKey("last_used_credential");
        }, 5 * 60 * 1000); //TODO make this configurable

        if (_dialog) {
          popupOpen = false;
          _dialog.close();
        }
      }
      if (msg.action === "get_username_from_field") {

        let username;
        for (var i = 0; i < usernameFields.length; i++) {
          const usernameValue = usernameFields[i].value;
          console.debug("check user " + usernameValue);

          if (usernameValue !== undefined && usernameValue !== null && usernameValue.trim().length > 0) {
            username = usernameValue;
            break;
          }
        }
        console.debug("found user " + username);

        sendResponse({user: username});
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
    }


    function setNativeValue(element, value) {
      const descriptor = Object.getOwnPropertyDescriptor(element, 'value');
      if (descriptor) {
        const valueSetter = descriptor.set;
        const prototype = Object.getPrototypeOf(element);
        const protoDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        let prototypeValueSetter;
        if (protoDescriptor) {
          prototypeValueSetter = protoDescriptor.set;
        }

        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else {
          valueSetter.call(element, value);
        }
      }
    }

    function pasteCredential(password, user, otp) {

      passwordFields.forEach(field => {
        field.value = password;
        setNativeValue(field, password);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });

      if (user && user.trim().length > 0) {
        usernameFields.forEach(field => {
          field.value = user;
          setNativeValue(field, user);
          field.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }

      if (otp && otp.trim().length > 0) {
        otpFields.forEach(field => {
          field.value = otp;
          setNativeValue(field, otp);
          field.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }

    }

  }
  else {
    console.warn("Cannot inject due to not linked extension");
  }


});

const injectedButtonId = "___synthetic_ANOTHERpass_____";

function addButton(input, renderIcons, opacityOfContentIcon, positionOfContentIcon) {

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
  else if (input.nodeName.toLowerCase() === "input"
    && (input.type.toLowerCase() === "text" || input.type.toLowerCase() === "email")
    && (checkOtpField(input.type)
      || checkOtpField(input.id)
      || checkOtpField(input.class)
      || checkOtpField(input.name)
      || checkOtpField(input.placeholder)
    )) {
    console.log("Add to username fields", input);
    otpFields.push(input);
  }
  else {
    return;
  }

  if (!renderIcons) {
    return;
  }
  
  const target = input.parentNode;
  if (target.id !== injectedButtonId) {
    const div = document.createElement('div');
    div.id = injectedButtonId;
    div.style.position = "relative";

    const button = document.createElement('button');
    button.type = "button";
    button.title = "ANOTHERpass";
    button.classList.add("requestCredentialButton");

    const inputHeight = input.clientHeight + 2;
    let iconUrl;
    if (inputHeight <= 24) {
      iconUrl = chrome.runtime.getURL("../icons/anotherpass-24.png");
    }
    else if (inputHeight <= 32) {
      iconUrl = chrome.runtime.getURL("../icons/anotherpass-32.png");
    }
    else {
      iconUrl = chrome.runtime.getURL("../icons/anotherpass-48.png");
    }
    button.style.width = inputHeight + "px";
    button.style.minWidth = inputHeight + "px";
    button.style.height = inputHeight + "px";
    button.style.minHeight = inputHeight + "px";
    button.style.border = input.border;
    button.style.opacity = opacityOfContentIcon + "%";
    button.style.backgroundImage = "url(" + iconUrl + ")";
 
    if (positionOfContentIcon === 'right') {
      button.style.right = "0px";
    }
   

    target.insertBefore(div, input);

    div.append(button, input);


    button.addEventListener("click", (e) => openPopup(e.pageX, e.pageY, input), false);
  }
  
}



function checkUsernameField(field) {
  if (!field) {
    return false;
  }
  const string = field.toString().toLowerCase();
  console.debug("check user field", string);
  return (string.includes("login")
    || string.includes("email")
    || string.includes("user")
    || string.includes("account")
  )
}

function checkOtpField(field) {
  if (!field) {
    return false;
  }
  const string = field.toString().toLowerCase();
  console.debug("check otp field", string);
  return (string.includes("otp")
    || string.includes("onetime")
    || string.includes("code")
  )
}



const showCredentialModal = (x, y, url) => {

  getTemporaryKey("linked").then((linked) => {
    if (linked) {
      console.log("modal");

      _x = x;
      _y = y;
      _url = url;
      const modal = document.createElement("dialog");
    
      modal.setAttribute("style", `overflow: hidden; padding: 0px; height: 450px; width: 300px; border: 0.5px solid black; top: ${y}px; left: ${x}px; border-radius: 10px; background-color: white; position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);`);
      modal.innerHTML = `
      <iframe id="popup-content" class="credential_popup"></iframe>
      <div class="close_button_position">
        <button class="close_button_style">
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
        iframe.src = chrome.runtime.getURL("../popup/choose_credential.html?data=" + encodeURIComponent(JSON.stringify({ tabId: response.tabId, url: url })));
      });
    
    }
    else {
      alert("Please reload the page!");
    }
  }
  );

  

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

