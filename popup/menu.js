
const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");

const linkedVaultId = localStorage.getItem("linked_vault_id");
const ip = localStorage.getItem("server_address");
const port = localStorage.getItem("server_port");

const pollingTimeout = localStorage.getItem("polling_timeout") || 60;
const pollingInterval = localStorage.getItem("polling_interval") || 2;

document.getElementById("linked_vault_id").innerText = linkedVaultId;

document.getElementById("server-settings-host").value = ip;
document.getElementById("server-settings-port").value = port;

document.getElementById("server-settings-polling-timeout").value = pollingTimeout;
document.getElementById("server-settings-polling-interval").value = pollingInterval;

document.addEventListener("click", (e) => {

  if (e.target.id === "btn-save-settings") {

    // TODO check and save data --> function
    const ip = document.getElementById("server-settings-host").value;
    const port = document.getElementById("server-settings-port").value;

    const pollingTimeout = document.getElementById("server-settings-polling-timeout").value;
    const pollingInterval = document.getElementById("server-settings-polling-interval").value;


    if (!ip) {
      bsAlert("Error", "A host is required");
    }
    else if (!port) {
      bsAlert("Error", "A port is required");
    }
    else {
      localStorage.setItem("server_address", ip);
      localStorage.setItem("server_port", port);
      localStorage.setItem("polling_timeout", pollingTimeout);
      localStorage.setItem("polling_interval", pollingInterval);
    }

  }

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
          console.log("unlink response:" + JSON.stringify(response));
          updateMenuUi(null, null);

          bsAlert("Success", "App successfully un-linked!");

        });
      }
     });

  }
  else if (e.target.id === "settings") {

    chrome.runtime.sendMessage({
      action: "open_settings",
    });

  }
  else if (e.target.id === "lock") {
    bsAlert("Error", "This operation is not yet supported!");
    /*chrome.runtime.sendMessage({
      action: "open_message_dialog",
      title: "Unlock local vault",
      text: "Not yet implemented"
    });*/

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


updateMenuUi(webClientId, linked);


function updateMenuUi(webClientId, linked) {
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
}



async function bsConfirm(title, message, okLabel) {
  const modalElem = document.createElement('div')
  modalElem.id = "modal-confirm"
  modalElem.className = "modal"
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>             
        <div class="modal-body fs-7">
          ${message}
      </div>    
      <div class="modal-footer" style="border-top:0px">             
      <button id="modal-btn-descartar" type="button" class="btn btn-secondary rounded-0">Cancel</button>
      <button id="modal-btn-aceptar" type="button" class="btn btn-primary rounded-0">${okLabel||"Ok"}</button>
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
  });
}



async function bsAlert(title, message, closeLabel) {
  const modalElem = document.createElement('div')
  modalElem.id = "modal-confirm"
  modalElem.className = "modal"
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>             
        <div class="modal-body fs-6">
          ${message}
      </div>    
      <div class="modal-footer" style="border-top:0px">             
      <button id="modal-btn-aceptar" type="button" class="btn btn-primary rounded-0">${closeLabel||"Close"}</button>
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
  });
}


function bsNotification(targetId, type, message) {
  const target = document.getElementById(targetId)
  const wrapper = document.createElement('div')
  wrapper.innerHTML = [
    `<div class="alert alert-${type} alert-dismissible" role="alert">`,
    `   <div>${message}</div>`,
    '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
    '</div>'
  ].join('');

  target.append(wrapper);
}


