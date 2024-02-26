
document.addEventListener("click", (e) => {


  function handleResponse(message) {
    console.log(`Message from the password fetch: ${message.response}`);
    sendPasteCredentialMessage(message.response.passwd);

  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }

  if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  if (e.target.id === "fetch_passwd") {

    const sending = chrome.runtime.sendMessage({
      action: "request_password",
    });
    sending.then(handleResponse, handleError);

  }
  else if (e.target.id === "close") {
    window.close();
  }
});


function poll(fn, timeout, interval) {
  var endTime = Number(new Date()) + (timeout || 2000);
  interval = interval || 100;
  console.log(`endTime: ${new Date(endTime)}`);
  var checkCondition = async function (resolve, reject) {
    var result = await fn();
    console.log(`result: ${JSON.stringify(result)}`);
    if (result) {
      resolve(result);
    }
    else if (Number(new Date()) < endTime) {
      console.log(`new timeout: ${new Date(endTime)}`);
      setTimeout(checkCondition, interval, resolve, reject);
    }
    else {
      console.log(`Error: ${arguments}`);
      reject(new Error('timed out for ' + fn + ': ' + arguments));
    }
  };

  return new Promise(checkCondition);
}



poll(async function () {
  let response = await chrome.runtime.sendMessage({
    action: "request_password",
  });
  console.log("response = " + JSON.stringify(response));
  return response.response;
}, 20000, 1000).then(function (response) {
  // polling done
  console.log(`Message from the password poll: ${JSON.stringify(response)}`);
  document.getElementById("waiting_time").value = 100;
  sendPasteCredentialMessage(response.passwd);
}).catch(function (e) {
  document.getElementById("waiting_time").value = 0;
  alert("You haven't opened the app in reasonable time.");
});


function sendPasteCredentialMessage(p) {

  browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
    console.log("send msg " + p);

    chrome.tabs.sendMessage(tabs[0].id, { action: "paste_credential", p: p }, function () {
      window.close();
    });
  });
}

