// background script
browser.runtime.onMessage.addListener(function (message, sender, senderResponse) {
  console.log("in bg");

  fetch('http://192.168.178.27:8000/', {
    method: 'GET'
  }).then(res => {
    console.log("get " + res);

    return res.text();
  }).then(res => {

    console.log("send " + res);

    senderResponse(res);
  })
  return true
});