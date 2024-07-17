const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));

const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");


(async () => {

  if (!linked) {
    console.warn("Not linked, cannot continue.");
    return;
  }

  document.onkeydown = function(evt) {
    console.debug("key", evt);
    evt = evt || window.event;
    if (evt.key === "Escape") {
      chrome.runtime.sendMessage({ action: "close_credential_dialog", tabId: requestData.tabId });
    }
  };

  const url = requestData.url.toLowerCase();

  document.addEventListener("click", async (e) => {

    if (e.target.id === "fetch_credential") {
      chrome.runtime.sendMessage({
        action: "start_password_request_flow",
        url: url
      });

      // force popup close
      chrome.runtime.sendMessage({ action: "close_credential_dialog", tabId: requestData.tabId });

    }

    if (e.target.id === "lock" || e.target.id === "lock_icon") {
      const isUnlocked = await isLocalVaultUnlocked();
      if (isUnlocked) {
        // lock local vault
        deleteTemporaryKey("clientKey");
        updateVaultUi();
      }
      else {
        //request clientKey from app
        await chrome.runtime.sendMessage({
          action: "start_client_key_request_flow",
          tabId: requestData.tabId
        });
        const isUnlocked = await isLocalVaultUnlocked();
        updateVaultUi(isUnlocked);
      }
    }

  });

  const isUnlocked = await isLocalVaultUnlocked();

  updateVaultUi(isUnlocked);

  if (isUnlocked) {
    const list = document.getElementById("credential_list");
    await loadCredentials(url, list);
  }

})()

async function loadCredentials(url, list) {
  const response = await chrome.runtime.sendMessage({
    action: "list_local_credentials",
    url: url
  });

  console.debug("response", response);

  const credentials = response.credentials;
  const matches = response.matches;

  console.debug("credentials", credentials);
  console.debug("matches", matches);

  renderSection("Suggested", list);

  matches.forEach(credential => {
    renderCredential(credential, list);
  });

  renderLine(list);

  renderSection("All", list);

  credentials.forEach(credential => {
    renderCredential(credential, list);
  });
}

function updateVaultUi(unlocked) {
  if (unlocked) {
    document.getElementById("lock_icon").innerText = "lock_open";
    document.getElementById("lock").title = "Lock local vault";
    document.getElementById("hint").classList.add("d-none");
  }
  else {
    document.getElementById("lock_icon").innerText = "lock";
    document.getElementById("lock").title = "Unlock local vault";
    document.getElementById("hint").classList.remove("d-none");
    document.getElementById("hint").innerText = "Local vault is locked, unlock first or fetch credential from the app.";
    const list = document.getElementById("credential_list");
    list.innerHTML = "";
  }
}


function renderCredential(credential, list) {
  let uuid = credential.uid;

  const li = document.createElement("li");
  li.classList.add("no-bullets");
  li.innerHTML = `
      <div class="nav-link my-1 mr-3">
        <button id="credential_button_${uuid}" class="btn">
        ${credential.name.substring(0, 25)}
        </button>
      </div>
    `;
  list.appendChild(li);

  document.addEventListener("click", async (e) => {

    if (e.target.id === "credential_button_" + uuid) {
      sendPasteCredentialMessage(requestData.tabId, credential.uid);
    }


  });
}


function renderSection(text, list) {

  const li = document.createElement("li");
  li.classList.add("no-bullets");
  li.innerHTML = `
  <b>${text}</b>
    `;
  list.appendChild(li);
  
}

function renderLine(list) {

  const li = document.createElement("li");
  li.classList.add("no-bullets");
  li.innerHTML = `<hr>`;
  list.appendChild(li);
  
}


function sendPasteCredentialMessage(tabId, uid) {

  chrome.runtime.sendMessage({ action: "forward_credential", uid: uid, tabId: tabId });
    
}