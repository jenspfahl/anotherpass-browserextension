

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


  loadKeyPair("client_keypair", async function (keyPair) { // TODO later load app public key
    const appPublicKey = keyPair.publicKey; //TODO later load app public key

    const sessionKey = await generateOrGetSessionKey(); 
    console.log("sK=" + sessionKey);
    const sessionKeyAsArray = await sessionKeyToArray(sessionKey);
    const encSessionKey = await encryptWithPublicKey(appPublicKey, sessionKeyAsArray);
    const encryptedMessage = await encryptMessage(sessionKey, JSON.stringify(message));


    const request = {
      encSessionKey: bytesToBase64(encSessionKey),
      envelope: encryptedMessage
    };
    console.log("sending request:", JSON.stringify(request));


    fetch('http://' + address + '/', {
      method: 'POST',
      headers: { "X-WebClientId": webClientId},
      body: JSON.stringify(request)
    }).then(res => {
      console.log("received: " + JSON.stringify(res));

      if (res.status == 401) {
        console.warn("App said Unauthorized");
        return null;
      }
      //TODO decrypt payload with sessionKey
      // response looks allways like { "envelope", "signature"(optional) }
      return res.text();
    }).then(res => {

      console.log("send " + res);

      sendResponse({ response: JSON.parse(res) });
    }).catch(e => {
      console.warn(e);
      sendResponse({ response: null });
    });
  });

}