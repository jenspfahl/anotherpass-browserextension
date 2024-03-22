
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (linked) {

  if (confirm("Are you sure to unlink '" + webClientId + "' from the app?") == true) {

    localStorage.removeItem("linked");
    localStorage.removeItem("web_client_id");
    localStorage.removeItem("server_address");
    localStorage.removeItem("server_port");

    destroyAllKeys();


    alert("Extension unlinked");
  }
  window.close();

}
