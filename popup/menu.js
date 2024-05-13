
document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

  } else if (e.target.id === "unlink") {

    chrome.runtime.sendMessage({
      action: "start_unlink_flow",
    });

  }
  else if (e.target.id === "settings") {

    chrome.runtime.sendMessage({
      action: "open_settings",
    });

  }
  else if (e.target.id === "lock") {
    alert("Not yet implemented");
  }
  else if (e.target.id === "fetch_credential") {
    alert("Not yet implemented");
  }
  else if (e.target.id === "help") {
    alert("For help please visit https://github.com/jenspfahl/anotherpass-webext");
  }
  else if (e.target.id === "info") {
    alert("ANOTHERpass Web Extension (c) Jens Pfahl 2024 (v0.1)");
  }
});


const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (webClientId && linked) {
  document.getElementById("state").innerText = "Linked (as " + webClientId + ")";
  document.getElementById("link").style.display = 'none';
}
else {
  document.getElementById("state").innerText = "Not linked";
  document.getElementById("settings").style.display = 'none';
  document.getElementById("lock").style.display = 'none';
  document.getElementById("unlink").style.display = 'none';
  document.getElementById("fetch_credential").style.display = 'none';

}