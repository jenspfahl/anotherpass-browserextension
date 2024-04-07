
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (linked) {

  if (confirm("Are you sure to unlink '" + webClientId + "' from the app?") == true) {

    localStorage.removeItem("linked");
    localStorage.removeItem("web_client_id");
    localStorage.removeItem("server_address");
    localStorage.removeItem("server_port");
    localStorage.removeItem("linked_vault_id");

    destroyAllKeys(); //TODO doesnt work, too fast?


    alert("Extension unlinked");
  }
  window.close();

}
