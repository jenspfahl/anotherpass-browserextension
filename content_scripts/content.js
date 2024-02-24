
 var forms = document.getElementsByTagName('form');
 for (var i = 0; i < forms.length; i++) {
   var form = forms[i];
   var inputs = form.querySelectorAll("input[type=password]");
   for (var j = 0; j < inputs.length; j++) {
     var input = inputs[j];
     console.log("found password field " + input.style.width);
     var button = document.createElement('button');
     button.type="button";
     button.className = "inputFieldButton";
     input.parentNode.insertBefore(button, input);    
     
     button.addEventListener("click", function() {
      input.focus();
      
      console.log("button click");

      const sending = chrome.runtime.sendMessage({
        action: "start_password_request_flow",
      });

  }, false);
   }
 }

/*chrome.extension*/browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  console.log("receive msg from " + JSON.stringify(sender));

  if (msg.action == 'paste') {


    console.log("received password to paste: '" + msg.p + "'");


    let text = msg.p;
    let elem = document.activeElement;

    console.log("elem=" + JSON.stringify(elem));


    var start = elem.selectionStart;
    var end = elem.selectionEnd;
    elem.value = text;// elem.value.slice(0, start) + text + elem.value.substr(end);
    //elem.selectionStart = start + text.length;
    //elem.selectionEnd = elem.selectionStart;

    sendResponse(text);

  }
}
);
