
document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    const sending = chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

    // TODO add Settings action

  }
});


var webClientId = localStorage.getItem("web_client_id");

if (webClientId) {
  document.getElementById("state").innerText = "Coupled";
  document.getElementById("link").innerText = "Decouple from app";
}
else {
  document.getElementById("state").innerText = "Not coupled";
}