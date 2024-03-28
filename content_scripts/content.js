// inspects all password fields and adds an Autofill icon
 var forms = document.getElementsByTagName('form');
 for (var i = 0; i < forms.length; i++) {
   var form = forms[i];
   var inputs = form.querySelectorAll("input[type=password]");
   for (var j = 0; j < inputs.length; j++) {
     var input = inputs[j];
     // TODO only add if not present
     console.log("found password field " + input.style.width);
     var button = document.createElement('button');
     button.type="button";
     button.className = "inputFieldButton";
     input.parentNode.insertBefore(button, input);    
     
     button.addEventListener("click", function() {
      input.focus();
      
      const parsedUrl = new URL(window.location.href);
      console.log("current url=" + parsedUrl);

      const sending = chrome.runtime.sendMessage({
        action: "start_password_request_flow",
        url: parsedUrl.toString()
      });

  }, false);
   }
 }



/*chrome.extension*/browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  if (msg.action === "paste_credential") {
    pasteCredential(msg.password, sendResponse);
  }
});

function pasteCredential(p, sendResponse) {
  console.debug("received password to paste: '" + p + "'");
  let elem = document.activeElement;

  console.log("elem=" + JSON.stringify(elem));

  elem.value = p;

  sendResponse(p);
}

