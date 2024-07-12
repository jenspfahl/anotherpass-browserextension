const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));

const webClientId = localStorage.getItem("web_client_id");
const linked = localStorage.getItem("linked");


(async () => {

  const isUnlocked = await isLocalVaultUnlocked();

  if (!isUnlocked || !linked) {
    console.warn("Not linked nor unlocked, cannot present local credentials.");
    return;
  }


  const url = requestData.url.toLowerCase();

  document.addEventListener("click", async (e) => {

    if (e.target.id === "fetch_credential") {
      const sending = chrome.runtime.sendMessage({
        action: "start_password_request_flow",
        url: url
      });

      //TODO force popup close
    }

  });


  const response = await chrome.runtime.sendMessage({
    action: "list_local_credentials",
    url: url
  });



  const list = document.getElementById("credential_list");
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

 
})()

function renderCredential(credential, list) {
  let uuid = credential.uid;

  const li = document.createElement("li");
  li.classList.add("no-bullets");
  li.innerHTML = `
      <div class="nav-link my-1 mr-3">
        <button id="credential_button_${uuid}" class="btn">
        ${credential.name}
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