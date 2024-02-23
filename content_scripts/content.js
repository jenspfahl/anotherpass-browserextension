

/*chrome.extension*/browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  console.log("receive msg from " + JSON.stringify(sender));

  if (msg.action == 'paste') {


    console.log("paste password: " + msg.p);


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
