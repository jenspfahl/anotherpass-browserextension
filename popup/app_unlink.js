
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (linked) {
  console.log("unlink " + webClientId);
  localStorage.removeItem("linked");
  localStorage.removeItem("web_client_id");
  localStorage.removeItem("server_address");
  localStorage.removeItem("server_port");
  localStorage.removeItem("linked_vault_id");
  localStorage.removeItem("symmetric_key_length");


  destroyAllKeys(); //TODO doesnt work, too fast?

  window.close();

  chrome.runtime.sendMessage({
    action: "open_message_dialog",
    title: "Success",
    text: "Extension unlinked"
  });

}
