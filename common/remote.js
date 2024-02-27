

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


function getAddress() {
  const server = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  return server + ":" + port;
}

function remoteCall(message, sendResponse) {
  const webClientId = localStorage.getItem("web_client_id");

  const address = getAddress();
  console.log("fetch from", address);
  fetch('http://' + address + '/', {
    method: 'POST',
    headers: { "X-WebClientId": webClientId},
    body: JSON.stringify(message)
  }).then(res => {
    console.log("received: " + JSON.stringify(res));

    return res.text();
  }).then(res => {

    console.log("send " + res);

    sendResponse({ response: JSON.parse(res) });
  }).catch(e => {
    console.warn(e);
    sendResponse({ response: null });
  });
}