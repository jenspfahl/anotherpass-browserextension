
var webClientId = localStorage.getItem("web_client_id");

if (webClientId) {

  if (confirm("Are you sure to decouple '" + webClientId + "' from the app?") == true) {

    localStorage.removeItem("web_client_id");
    localStorage.removeItem("server_address");
    localStorage.removeItem("server_port");
    deleteKeyPair("client_keypair");


    alert("Extension decoupled");
  }
  window.close();

}
