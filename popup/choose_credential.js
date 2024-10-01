const requestData = JSON.parse(new URLSearchParams(location.search).get('data'));


(async () => {
  const linked = await getLocalValue("linked");

  const searchInput = document.getElementById("search_input");


  if (!linked) {
    console.warn("Not linked, cannot continue.");
    return;
  }

  searchInput.addEventListener("input", (e) => updateCredentialList(e.target.value));


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
        tabId: requestData.tabId,
        url: url
      });

      // force popup close
      chrome.runtime.sendMessage({ action: "close_credential_dialog", tabId: requestData.tabId });

    }


    if (e.target.id === "create_credential") {
      const response = await chrome.runtime.sendMessage({
        action: "get_username_from_field",
        tabId: requestData.tabId 
      });
    
      console.debug("create credential prep response", response);
    
      const user = response.user

      chrome.runtime.sendMessage({
        action: "start_password_creation_flow",
        tabId: requestData.tabId,
        url: url,
        user: user
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
        await chrome.runtime.sendMessage({
          action: "update_extension_icon"
        });
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
    else if (e.target.id === "clear_search" || e.target.id === "clear_search_icon") {
      searchInput.value = "";
      updateCredentialList("");
      searchInput.focus();
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

  if (matches.length > 0) {
    renderSection("Suggested", list);

    matches.forEach(credential => {
      renderCredential(credential, list);
    });

    renderLine(list);
  }

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
    document.getElementById("search_group").classList.remove("d-none");

    document.getElementById("search_input").focus();

  }
  else {
    document.getElementById("lock_icon").innerText = "lock";
    document.getElementById("lock").title = "Unlock local vault";
    document.getElementById("hint").classList.remove("d-none");
    document.getElementById("hint").innerText = "Local vault is locked, unlock first or fetch credential from the app.";
    const list = document.getElementById("credential_list");
    list.innerHTML = "";
    document.getElementById("search_group").classList.add("d-none");

  }
}


function renderCredential(credential, list) {
  let uuid = credential.uid;

  const li = document.createElement("li");

  let searchable = credential.name.trim().toLowerCase();
  if (credential.website) {
    searchable = searchable + " " + credential.website.trim().toLowerCase();
  }
  li.setAttribute("searchable", searchable);

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

function updateCredentialList(searchFor) {

  const searchString = searchFor.toLowerCase().trim();

  const list = document.getElementById("credential_list");
  const children = list.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const searchable = child.getAttribute("searchable");
    if (searchable) {
      if (searchable.includes(searchString)) {
        child.classList.remove("d-none");
      }
      else {
        child.classList.add("d-none");
      }
    }
  }
}



function sendPasteCredentialMessage(tabId, uid) {

  chrome.runtime.sendMessage({ action: "forward_credential", uid: uid, tabId: tabId });
    
}
