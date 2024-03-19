

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


  getKey("client_keypair").then(async value => { // TODO later load app public key
    const appPublicKey = value.publicKey; //TODO later load app public key

    const sessionKey = await generateOrGetSessionKey(); 
    const sessionKeyAsArray = await sessionKeyToArray(sessionKey);
    console.log("sK=" + bytesToBase64(sessionKeyAsArray));

    const encSessionKey = await encryptWithPublicKey(appPublicKey, sessionKeyAsArray);
    const encryptedMessage = await encryptMessage(sessionKey, JSON.stringify(message));


    const request = {
      encSessionKey: bytesToBase64(encSessionKey), // null if in linking phase because we don't have yet a server pubkey
      envelope: encryptedMessage,
    };
    console.log("sending request:", JSON.stringify(request));
    console.log("sending plain request:", JSON.stringify(message));


    fetch('http://' + address + '/', {
      method: 'POST',
      headers: { 
        "X-WebClientId": webClientId, 
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(request)
    }).then(res => {
      console.log("received HTTP Status: " + res.status);

      if (res.status != 200) {
        console.warn("Unsuccessful! Reason: " + JSON.stringify(res.text));
        return null;
      }

      return res.text();
    }).then(res => {

      console.log("received body: " + res);

      var response;
      try {
        response = JSON.parse(res);
      }
      catch (e) {
        console.warn("cannot parse response", e)
        response = {
          "raw": res
        };
      }


      // decrypt response
      return decryptMessage(sessionKey, response.envelope);
    }).then(decryptedPayload => {
      console.debug("decrypted response", decryptedPayload);

      var response;
      try {
        response = JSON.parse(decryptedPayload);
      }
      catch (e) {
        console.warn("cannot parse decryptedPayload", e)
        response = {
          "raw": res
        };
      }

      sendResponse({ response: response });
    }).catch(e => {
      console.error("HTTP failed:", e);
      sendResponse({ response: null });
    });
  });

}