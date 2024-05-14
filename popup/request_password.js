const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));

document.addEventListener("click", (e) => {


  function handleResponse(message) {
    console.log(`Message from the password fetch: ${message.response}`);
    sendPasteCredentialMessage(message.response.passwd);

  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }

  if (e.target.tagName !== "BUTTON") {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  else if (e.target.id === "close") {
    destroySessionKey();
    window.close();
  }
  else if (e.target.id === "update") {

    // TODO check and save data --> function
    const ip = document.getElementById("ip").value;
    const port = document.getElementById("port").value;

    if (!ip) {
      alert("A host is required");
    }
    else if (!port) {
      alert("A port is required");
    }
    else {
      localStorage.setItem("server_address", ip);
      localStorage.setItem("server_port", port);
    }

  }
});


var webClientId = localStorage.getItem("web_client_id");

if (!webClientId) {
  window.close();
  chrome.runtime.sendMessage({
    action: "open_message_dialog",
    title: "Error",
    text: "Extension not linked with an app! Please first link it."
  });
} 
else {

  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");
  document.getElementById("ip").value = ip;
  document.getElementById("port").value = port;


  getKey("app_public_key").then(async value => {
    document.getElementById("web_client_id").innerText = webClientId;

    // destroy previous if still exists
    destroySessionKey();
    const sessionKey = await generateOrGetSessionKey();
    const sessionKeyAsArray = await aesKeyToArray(sessionKey);
    const sessionKeyBase64 = bytesToBase64(sessionKeyAsArray);
    console.log("Request Session Key = " + sessionKeyBase64);
    
    const baseKey = await getKey("base_key");
    const baseKeyAsArray = await aesKeyToArray(baseKey);
    const fingerprintAsArray = await hashKeys(baseKeyAsArray, sessionKeyAsArray);
    const formattedFingerprint = toShortenedFingerprint(fingerprintAsArray);

    document.getElementById("fingerprint").innerText = formattedFingerprint;


    const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
    const pollingInterval = localStorage.getItem("polling_interval") || 2;


    poll(async function (progress) {
      document.getElementById("waiting_time").value = progress;
      let response = await chrome.runtime.sendMessage({
        action: "request_credential",
        requestIdentifier: sessionKeyBase64
      });
      console.debug("response = " + JSON.stringify(response));
      if (response.status == 403) {
        console.warn("Request rejected");
        document.getElementById("waiting_time").value = 0;
        document.getElementById("instruction").innerText = "Request was rejected!";
        document.getElementById("close").innerText = "Close";

        alert("The request has been rejected in the app or the vault was locked.");
        // cancel polling
        destroySessionKey();
        window.close();
        return null;
      }
      return response.response;
    }, pollingTimeout * 1000, pollingInterval * 1000).then(function (response) { 
      // polling done
      document.getElementById("waiting_time").value = 100;

      destroySessionKey();
      
      console.log("autofill " + requestData.autofill);

      if (requestData.autofill) {
        sendPasteCredentialMessage(response.password);
      }
      else {
        presentCredential(response);
      }
    }).catch(function (e) {
      document.getElementById("waiting_time").value = 0;
      document.getElementById("instruction").innerText = "Unable to receive credentials!";
      document.getElementById("close").innerText = "Close";

      alert("You haven't opened the app in reasonable time or the host or port is wrong.");
      destroySessionKey();
      window.close();
    });


    function sendPasteCredentialMessage(p) {

      browser.tabs.query({ active: true, currentWindow: false /* true for actino popup, false for request password popup */ }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "paste_credential", password: p }, function () {
          window.close();
        });
      });
    }

    function presentCredential(credential) {
      console.log("present " + JSON.stringify(credential));
      chrome.runtime.sendMessage({
        action: "open_credential_dialog",
        credential: credential
      });
      window.close();
    }
  });

}



