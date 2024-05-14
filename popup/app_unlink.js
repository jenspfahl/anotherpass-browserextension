
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (linked) {


  localStorage.removeItem("linked");
  localStorage.removeItem("web_client_id");
  localStorage.removeItem("server_address");
  localStorage.removeItem("server_port");
  localStorage.removeItem("linked_vault_id");

  destroyAllKeys(); //TODO doesnt work, too fast?

  window.close();

  chrome.runtime.sendMessage({
    action: "open_message_dialog",
    title: "Success",
    text: "Extension unlinked"
  });

}
