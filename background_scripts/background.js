// background script
browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("in bg");

  fetch('http://'+ message.ip + ':8001/', {
    method: 'GET'
  }).then(res => {
    console.log("get " + res);

    return res.text();
  }).then(res => {

    console.log("send " + res);

    sendResponse({ response: res }); })
  return true
});