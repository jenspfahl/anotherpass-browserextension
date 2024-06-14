
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

  } else if (e.target.id === "unlink") {

     bsConfirm(
      "Unlink from app", 
      "Are you sure to unlink '" + webClientId + "' from the app?",
      "Unlink"
    )
    .then((decision) => {
      if (decision === true) {
        chrome.runtime.sendMessage({
          action: "start_unlink_flow",
        }).then((response) => {
          
        });
      }
     });

    /*chrome.runtime.sendMessage({
      action: "open_confirmation_dialog",
      title: "Unlink from app",
      text: "Are you sure to unlink '" + webClientId + "' from the app?",
      confirmAction: "start_unlink_flow",
      width: 300,
      height: 200
    });*/

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
  document.getElementById("link").classList.add("d-none");
}
else {
  console.log("menu unlinked mode");

  document.getElementById("state").innerText = "Not linked";
  document.getElementById("unlink").classList.add("d-none");
}


async function bsConfirm(title, message, okLabel) {
  const modalElem = document.createElement('div')
  modalElem.id = "modal-confirm"
  modalElem.className = "modal"
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>             
        <div class="modal-body fs-6">
          <p>${message}</p>
      </div>    
      <div class="modal-footer" style="border-top:0px">             
      <button id="modal-btn-descartar" type="button" class="btn btn-secondary">Cancel</button>
      <button id="modal-btn-aceptar" type="button" class="btn btn-primary">${okLabel||"Ok"}</button>
      </div>
    </div>
  </div>
  `
  const myModal = new bootstrap.Modal(modalElem, {
    keyboard: false,
    backdrop: 'static'
  })
  myModal.show()

  return new Promise((resolve, reject) => {
    document.body.addEventListener('click', response)

    function response(e) {
      let bool = false
      if (e.target.id == 'modal-btn-descartar') bool = false
      else if (e.target.id == 'modal-btn-aceptar') bool = true
      else return

      document.body.removeEventListener('click', response)
      document.body.querySelector('.modal-backdrop').remove()
      modalElem.remove()
      resolve(bool)
    }
  })
}