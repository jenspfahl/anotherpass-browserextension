
document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

  }
  else if (e.target.id === "settings") {

    chrome.runtime.sendMessage({
      action: "open_settings",
    });

  }
});


const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

if (webClientId && linked) {
  document.getElementById("state").innerText = "Linked (" + webClientId + ")";
  document.getElementById("link").innerText = "Unlink from app";
}
else {
  document.getElementById("state").innerText = "Not linked";
}