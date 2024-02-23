
document.addEventListener("click", (e) => {


  console.log("click");


  function handleResponse(message) {
    console.log(`Message from the password fetch: ${message.response}`);
    browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
      console.log("send msg " + JSON.stringify(message.response));

      chrome.tabs.sendMessage(tabs[0].id, { action: "paste", p: message.response.passwd }, function (response) {
        //alert(response);
        window.close();
      });
    });
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }



  /**
  * Get the active tab,
  * then call "beastify()" or "reset()" as appropriate.
  */
  if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  if (e.target.type === "reset") {

    const sending = chrome.runtime.sendMessage({
      ip: "192.168.178.27",
    });
    sending.then(handleResponse, handleError);

  }
});




// The polling function
function poll(fn, timeout, interval) {
  var endTime = Number(new Date()) + (timeout || 2000);
  interval = interval || 100;
  console.log(`endTime: ${new Date(endTime)}`);
  var checkCondition = async function (resolve, reject) {
    // If the condition is met, we're done! 
    var result = await fn();
    console.log(`result: ${JSON.stringify(result)}`);
    if (result) {
      resolve(result);
    }
    // If the condition isn't met but the timeout hasn't elapsed, go again
    else if (Number(new Date()) < endTime) {
      console.log(`new timeout: ${new Date(endTime)}`);
      setTimeout(checkCondition, interval, resolve, reject);
    }
    // Didn't match and too much time, reject!
    else {
      console.log(`Error: ${arguments}`);
      reject(new Error('timed out for ' + fn + ': ' + arguments));
    }
  };

  return new Promise(checkCondition);
}



// Usage:  ensure element is visible
poll(async function () {
  await new Promise(r => setTimeout(r, 2000));
  let response = await chrome.runtime.sendMessage({
    ip: "192.168.178.27",
  });
  console.log("response = " + JSON.stringify(response));
  return response.response;
}, 20000, 1000).then(function (response) {
  // Polling done, now do something else!
  console.log(`Message from the password poll: ${JSON.stringify(response)}`);

    browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
      console.log("send msg " + response.passwd);

      chrome.tabs.sendMessage(tabs[0].id, { action: "paste", p: response.passwd }, function () {
        //alert(response);
        window.close();
      });
    });
}).catch(function (e) {
  // Polling timed out, handle the error!
  alert("Timeout!" + e);
});
