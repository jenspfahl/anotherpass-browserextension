const STOP_POLLING = "STOP_POLLING";

function poll(fn, timeout, interval) {
  const startTime = Number(new Date());
  const endTime = startTime + (timeout || 2000);
  const totalTime = endTime - startTime;
  interval = interval || 100;
  console.debug(`poll endTime: ${new Date(endTime)}`);
  const checkCondition = async function (resolve, reject) {
    const nowTime = Number(new Date());
    const pastTime = nowTime - startTime;
    const progress = pastTime / totalTime;
    const result = await fn(progress);
    //console.debug(`result: ${JSON.stringify(result)}`);
    if (result) {
      resolve(result);
    }
    else if (result === STOP_POLLING) {
      console.log(`Polling stopped by caller`);
      reject(new Error('stopped by caller'));
    }
    else if (nowTime < endTime) {
      console.log(`new timeout: ${new Date(endTime)}`);
      setTimeout(checkCondition, interval, resolve, reject);
    }
    else {
      console.error(`Error: ${arguments}`);
      reject(new Error('timed out'));
    }
  };

  return new Promise(checkCondition);
}


async function getAddress(isFromBg) {
  let server = await getTempOrLocalKey("server_address", isFromBg);
  console.debug("stored server address", server);

  if (isIntentedHandle(server)) {
    const serverFromHandle = handleToIpAddress(server);
    console.debug("IP from handle " + server, serverFromHandle);
    if (serverFromHandle) {
      server = serverFromHandle;
    }
  }
  const port = await getTempOrLocalKey("server_port", isFromBg);
  return server + ":" + port;
}

/**
 * If server public key is known: 
 * BaseKey + OneTimeKey = TransportKey
 * OneTimeKey is sent encrypted with the pubkey of the server
 * 
 * If serer public key is unknown (only in linking phase) we don't have a baseKey and use a linking sessionKey:
 * SesssionKey (generated by client) = TransportKey
 * 
 * @param {*} message 
 * @param {*} sendResponse 
 */
async function remoteCall(message, sendResponse, isFromBg, timeout) {
  let parsedResponse, rawResponse;
  try {
    const isLinking = await getTemporaryKey("is_linking", isFromBg);
    const webClientId = await getTempOrLocalKey("web_client_id", isFromBg);
    const linked = await getLocalValue("linked");
    console.debug("remote call asks isLinking? " + isLinking);
    try {
      let request;
      let requestTransportKeyAsArray;
      if (!isLinking && linked) {
        const appPublicKey = await getKey("app_public_key");
        const oneTimeKey = await generateAesKey(await getSupportedKeyLength(isFromBg));
        const oneTimeKeyAsArray = await aesKeyToArray(oneTimeKey);

        const encOneTimeKey = await encryptWithPublicKey(appPublicKey, oneTimeKeyAsArray);
    
        const baseKey = await getKey("base_key");
        const baseKeyAsArray = await aesKeyToArray(baseKey);
      
        requestTransportKeyAsArray = await hashKeys(baseKeyAsArray, oneTimeKeyAsArray); 
        const requestTransportKey = await arrayToAesKey(requestTransportKeyAsArray);
    
        const envelope = await encryptMessage(requestTransportKey, JSON.stringify(message));

        request = {
          encOneTimeKey: bytesToBase64(encOneTimeKey), 
          envelope: envelope
        };
      }
      else {
        const sessionKey = await generateOrGetSessionKey(); 

        const envelope = await encryptMessage(sessionKey, JSON.stringify(message));
        request = {
          envelope: envelope
        };
      }

      //console.debug("sending plain request:", JSON.stringify(message));  
      //console.debug("sending request:", JSON.stringify(request));

      const address = await getAddress(isFromBg);
      console.debug("fetch from", address);

      rawResponse = await fetch('http://' + address + '/', {
          method: 'POST',
          headers: { 
            "X-WebClientId": webClientId, 
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(timeout)
        });

      console.log("received HTTP Status: ", rawResponse.status);
      console.log("received HTTP response: ", rawResponse);

      const body = await rawResponse.json();
      if (rawResponse.status == 202 || rawResponse.status == 401) {
        console.info("Waiting for user interaction!", body);
        sendResponse({ response: null, status: rawResponse.status, error: body.error });
        return null;
      }
      else if (rawResponse.status == 403) {
        console.info("User denied request!", body);
        sendResponse({ response: null, status: rawResponse.status, error: body.error });
        return null;
      }
      else if (rawResponse.status != 200 && rawResponse.status != 204) {
        console.error("Unsuccessful!", body);
        sendResponse({ response: null, status: rawResponse.status, error: body.error });
        return null;
      }


      let keyPair;
      if (isLinking) {
        keyPair = await getKey("temp_client_keypair");
      }
      else {
        keyPair = await getKey("client_keypair");
      }
      const encOneTimeKey = base64ToBytes(body.encOneTimeKey);
      const decOneTimeKeyAsArray = await decryptWithPrivateKey(keyPair.privateKey, encOneTimeKey);
      let responseTransportKeyAsArray;
      if (!isLinking && linked) {
        // derive reponse transport key (local base key + sent encrypted one-time key + used request transport key)
        const baseKey = await getKey("base_key");
        const baseKeyAsArray = await aesKeyToArray(baseKey);
        responseTransportKeyAsArray = await hashKeys(baseKeyAsArray, decOneTimeKeyAsArray, requestTransportKeyAsArray);
      }
      else {
        // in linking phase the client doesn't have a basekey and uses the previously shared session key as second key
        const sessionKey = await generateOrGetSessionKey(); 
        const sessionKeyAsArray = await aesKeyToArray(sessionKey);        
        // derive transport key (session key + sent encrypted one-time key)
        responseTransportKeyAsArray = await hashKeys(sessionKeyAsArray, decOneTimeKeyAsArray);
      }

      const transportKey = await arrayToAesKey(responseTransportKeyAsArray);
      // decrypt response
      const decryptedPayload = await decryptMessage(transportKey, body.envelope);

      //console.debug("decrypted response", decryptedPayload);

      if (decryptedPayload == null) {
        console.error("HTTP decrypted payload is null");
        sendResponse({ response: null });
        return null;
      }

      
      parsedResponse = JSON.parse(decryptedPayload);
    }
    catch (e) {
      console.warn("cannot parse decryptedPayload", e) //signal timed out
      sendResponse({
        response: null ,
        error: rawResponse !== undefined ? rawResponse.error || e.message : e.message,
       });
       return;
    }

    sendResponse({ response: parsedResponse });

  }
  catch (e) {
    console.warn("HTTP fetch failed:", e)

    sendResponse({
       response: null ,
       error: rawResponse !== undefined ? rawResponse.error || e.message : e.message,
      });
  }  
    
   
}


function isValidIPAdressOrHostnameOrHandle(string) {  
  if (isIntentedIPAdress(string)) {
    return isValidIPAdress(string);
  }
  return handleToIpAddress(string) || isValidHostname(string);
}  


function isIntentedIPAdress(ipAddress) {  
  return (/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.test(ipAddress));
}  

function isIntentedHandle(handle) {  
  return (/^\@[aei][a-z]{1,6}$/.test(handle));
}  

function isValidIPAdress(ipAddress) {  
  return (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipAddress));
}  

function isValidHostname(hostname) {  // includes invalid IP adresses!
  return (/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(hostname));
}  

const BASE_CHARS = "abcdefghijklmnopqrstuvwxyz"

function handleToIpAddress(handle) {
  if (!isIntentedHandle(handle)) {
    console.warn("invalid handle", handle);
    return undefined;
  }
  const classifier = handle.charAt(1);
  let offset;
  if (classifier == "a") { // Class A
    offset = 0x0a000000;
  }
  else if (classifier == "e") { // Class B
    offset = 0xac100000;
  }
  else if (classifier == "i") { // Class C
    offset = 0xc0a80000;
  }
  const data = handle.substring(2);
  const num = fromBasedStringToNumber(data);
  const ipAsLong = offset + num;


  if (classifier == "a" && ipAsLong > 0x0affffff) { // Class A
    console.warn("hanlde not a class A net IP address");
  }
  else if (classifier == "e" && ipAsLong > 0xac1fffff) { // Class B
    console.warn("hanlde not a class B net IP address");
  }
  else if (classifier == "i" && ipAsLong > 0xc0a8ffff) { // Class C
    console.warn("hanlde not a class C net IP address");
  }

  
  return numberToIp(ipAsLong);
}

function fromBasedStringToNumber(basedString) {
  let base = BASE_CHARS.length;
  let num = 0;

  for (let i = 0; i < basedString.length; i++) {
      num = num * base + BASE_CHARS.indexOf(basedString[i]);
  }

  return num;
}

function numberToIp(num) { 
  // Ensure the number is within the valid range for an IPv4 address 
  if (num < 0 || num > 4294967295) { 
    return undefined;
  } 
  return [ (num >>> 24) & 255, // First octet 
           (num >>> 16) & 255, // Second octet 
           (num >>> 8) & 255, // Third octet 
            num & 255 // Fourth octet 
         ].join('.'); 
  } 