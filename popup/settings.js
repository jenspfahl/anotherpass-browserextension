
document.addEventListener("click", (e) => {


  if (e.target.tagName !== "BUTTON") {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  else if (e.target.id === "update") {

    // TODO check and save data --> function
    const ip = document.getElementById("ip").value;
    const port = document.getElementById("port").value;

    const pollingTimeout = document.getElementById("pollingTimeout").value;
    const pollingInterval = document.getElementById("pollingInterval").value;


    if (!ip) {
      alert("A host is required");
    }
    else if (!port) {
      alert("A port is required");
    }
    else {
      localStorage.setItem("server_address", ip);
      localStorage.setItem("server_port", port);
      localStorage.setItem("polling_timeout", pollingTimeout);
      localStorage.setItem("polling_interval", pollingInterval);
      window.close();
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

  const linkedVaultId = localStorage.getItem("linked_vault_id");
  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");

  const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
  const pollingInterval = localStorage.getItem("polling_interval") || 2;

  document.getElementById("web_client_id").innerText = webClientId;
  document.getElementById("linked_vault_id").innerText = linkedVaultId;

  document.getElementById("ip").value = ip;
  document.getElementById("port").value = port;

  document.getElementById("pollingTimeout").value = pollingTimeout;
  document.getElementById("pollingInterval").value = pollingInterval;
}



