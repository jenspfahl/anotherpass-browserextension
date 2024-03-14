var webClientId = localStorage.getItem("web_client_id");


if (webClientId) {

  document.getElementById("web_client_id").innerText = webClientId;
  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");

  getKey("client_keypair").then(async keyPair => {
    const publicKeyFingerprint = await getPublicKeyShortenedFingerprint(keyPair.publicKey);
    document.getElementById("fingerprint").innerText = publicKeyFingerprint;


    poll(async function () {
      let response = await chrome.runtime.sendMessage({
        action: "approve_link",
      });
      console.log("response = " + JSON.stringify(response));
      return response.response;
    }, 30000, 1000).then(function (response) { 
      // polling done
      console.log(`Message from the approve link poll: ${JSON.stringify(response)}`);
      document.getElementById("waiting_time").value = 100;

      //TODO store nextKeyPair
      localStorage.setItem("linked", true);
        destroyCurrentSessionKey();
      
    }).catch(function (e) {
      document.getElementById("waiting_time").value = 0;
      document.getElementById("instruction").innerText = "Unable to receive credentials!";
      document.getElementById("close").innerText = "Close";

      alert("You haven't opened the app in reasonable time or the host or port is wrong.");
    });


  
  });


}
else {
  alert("Something went wrong :(")
}
