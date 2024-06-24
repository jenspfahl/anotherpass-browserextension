const webClientId = localStorage.getItem("web_client_id");
const linkedVaultId = localStorage.getItem("linked_vault_id");


if (webClientId) {

  document.getElementById("web_client_id").innerText = webClientId;
  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");

  getKey("app_public_key").then(async value => { 
    const publicKeyFingerprint = await getPublicKeyShortenedFingerprint(value);
    document.getElementById("fingerprint").innerText = publicKeyFingerprint;
  

    document.addEventListener("click", (e) => {

      if (e.target.id === "accept") {
        localStorage.setItem("linked", true);

        destroySessionKey();

        window.close();
        chrome.runtime.sendMessage({
          action: "open_message_dialog",
          title: "Success",
          text: "Extension successfully linked to vault with id '" + linkedVaultId + "' with the identifier '" + webClientId + "'"
        });
      }

      if (e.target.id === "deny") {
        localStorage.removeItem("linked");
        localStorage.removeItem("web_client_id");
        localStorage.removeItem("server_address");
        localStorage.removeItem("server_port");
        localStorage.removeItem("linked_vault_id");
        localStorage.removeItem("symmetric_key_length");

        destroyAllKeys();


        window.close();
        chrome.runtime.sendMessage({
          action: "open_message_dialog",
          title: "Failure",
          text: "Linking the extension has been denied in the app."
        });
      }
    });

  });


}
else {
  window.close();
  chrome.runtime.sendMessage({
    action: "open_message_dialog",
    title: "Error",
    text: "Something went wrong :("
  });
}
