
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

  } else if (e.target.id === "unlink") {

    chrome.runtime.sendMessage({
      action: "open_confirmation_dialog",
      title: "Unlink from app",
      text: "Are you sure to unlink '" + webClientId + "' from the app?",
      confirmAction: "start_unlink_flow",
      width: 300,
      height: 200
    });

  }
  else if (e.target.id === "settings") {

    chrome.runtime.sendMessage({
      action: "open_settings",
    });

  }
  else if (e.target.id === "lock") {
    chrome.runtime.sendMessage({
      action: "open_message_dialog",
      title: "Unlock local vault",
      text: "Not yet implemented"
    });

  }
  else if (e.target.id === "fetch_credential") {
    const sending = chrome.runtime.sendMessage({
      action: "start_single_password_request_flow"
    });
  }
  else if (e.target.id === "help") {
    chrome.runtime.sendMessage({
      action: "open_url",
      url: "https://github.com/jenspfahl/anotherpass-webext"
    });
    window.close();
  }
  else if (e.target.id === "info") {
    chrome.runtime.sendMessage({
      action: "open_message_dialog",
      title: "About the extension",
      text: "ANOTHERpass Browser Extension (c) Jens Pfahl 2024 (v0.1)",
      width: 300,
      height: 200
    });
  }
});


if (webClientId && linked) {
  console.log("menu linked mode");
  document.getElementById("state").innerText = "Linked (as " + webClientId + ")";
  document.getElementById("link").style.display = 'none';
}
else {
  console.log("menu unlinked mode");

  document.getElementById("state").innerText = "Not linked";
  document.getElementById("settings").style.display = 'none';
  document.getElementById("lock").style.display = 'none';
  document.getElementById("unlink").style.display = 'none';
  document.getElementById("fetch_credential").style.display = 'none';

}