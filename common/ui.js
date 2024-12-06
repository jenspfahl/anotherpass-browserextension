function updateExtensionIcon(unlocked) {
  if (unlocked) {
    chrome.action.setIcon({
      path: {
        24: "/icons/anotherpass-open-24.png",
        32: "/icons/anotherpass-open-32.png",
        48: "/icons/anotherpass-open-48.png",
        96: "/icons/anotherpass-open-96.png"
      },
    });
    chrome.action.setTitle({ title: "ANOTHERpass (" + chrome.i18n.getMessage("vaultUnlocked") +")" });
  }
  else {
    chrome.action.setIcon({
      path: {
        24: "/icons/anotherpass-24.png",
        32: "/icons/anotherpass-32.png",
        48: "/icons/anotherpass-48.png",
        96: "/icons/anotherpass-96.png"
      },
    });
    chrome.action.setTitle({ title: "ANOTHERpass (" + chrome.i18n.getMessage("vaultLocked") +")" });
  }
}

async function bsAlert(title, message, closeLabel) {
    const modalElem = document.createElement('div');
    const lblClose = closeLabel || chrome.i18n.getMessage("lblClose");

    modalElem.id = "modal-confirm";
    modalElem.className = "modal";
    modalElem.innerHTML = `
      <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5">${title}</h1>
            <button id="modal-btn-cancel" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
          </div>             
          <div class="modal-body fs-6 overflow-auto">
            ${message}
        </div>    
        <div class="modal-footer">             
        <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${lblClose}</button>
        </div>
      </div>
    </div>
    `;
    const myModal = new bootstrap.Modal(modalElem, {
      keyboard: false,
      backdrop: 'static'
    });
    myModal.show();
  
    return new Promise((resolve, reject) => {
      document.body.addEventListener('click', response)
  
      function response(e) {
        let bool = false
        if (e.target.id == 'modal-btn-cancel') bool = false
        else if (e.target.id == 'modal-btn-ok') bool = true
        else return
  
        document.body.removeEventListener('click', response)
        const backdrop = document.body.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove()
        modalElem.remove()
        resolve(bool)
      }
    });
  }
  



async function bsConfirm(title, message, okLabel, cancelLabel) {
  const modalElem = document.createElement('div');
  const lblOk = okLabel || chrome.i18n.getMessage("lblOk");
  const lblCancel = cancelLabel || chrome.i18n.getMessage("lblCancel");
  modalElem.id = "modal-confirm";
  modalElem.className = "modal";
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button id="modal-btn-cancel" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>             
        <div class="modal-body fs-7">
          ${message}
      </div>    
      <div class="modal-footer">             
      <button id="modal-btn-cancel" type="button" class="btn btn-secondary rounded-0">${lblCancel}</button>
      <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${lblOk}</button>
      </div>
    </div>
  </div>
  `;
  const myModal = new bootstrap.Modal(modalElem, {
    keyboard: false,
    backdrop: 'static'
  });
  myModal.show();

  return new Promise((resolve, reject) => {
    document.body.addEventListener('click', response)

    function response(e) {
      let bool = false
      if (e.target.id == 'modal-btn-cancel') bool = false
      else if (e.target.id == 'modal-btn-ok') bool = true
      else return

      document.body.removeEventListener('click', response)
      const backdrop = document.body.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove()      
      modalElem.remove()
      resolve(bool)
    }
  });
}



async function bsSetPassword(title, message, okLabel, cancelLabel) {
  const modalElem = document.createElement('div');
  const lblOk = okLabel || chrome.i18n.getMessage("lblOk");
  const lblCancel = cancelLabel || chrome.i18n.getMessage("lblCancel");
  const lblPassword = chrome.i18n.getMessage("lblPassword");
  const lblRepeatPassword = chrome.i18n.getMessage("lblRepeatPassword");

  modalElem.id = "modal-confirm";
  modalElem.className = "modal";
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button id="modal-btn-cancel" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>             
        <div class="modal-body fs-7">
          ${message}
          <hr>
          <div class="form-group mx-sm-3 mb-2">
            <label for="inputPassword1" class="sr-only">${lblPassword}:</label>
            <input type="password" class="form-control" id="inputPassword1" placeholder="${lblPassword}">
          </div>
          <div class="form-group mx-sm-3 mb-2">
            <label for="inputPassword2" class="sr-only">${lblRepeatPassword}:</label>
            <input type="password" class="form-control" id="inputPassword2" placeholder="${lblPassword}">
          </div>
        </div>    
        
        <div class="modal-footer">             
          <button id="modal-btn-cancel" type="button" class="btn btn-secondary rounded-0">${lblCancel}</button>
          <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${lblOk}</button>
        </div>
      </div>
    </div>
  `;
  const myModal = new bootstrap.Modal(modalElem, {
    keyboard: false,
    backdrop: 'static'
  });
  myModal.show();

  const passwd1 = document.getElementById("inputPassword1");
  const passwd2 = document.getElementById("inputPassword2");

  const okButton = document.getElementById("modal-btn-ok");

  passwd1.focus();
  okButton.disabled = true;

  document.addEventListener("input", (e) => {
    if (e.target.id === "inputPassword1" || e.target.id === "inputPassword2") {
        passwd1.classList.remove("invalid-state");
        passwd1.title = chrome.i18n.getMessage("hintInputPassword");
        passwd2.classList.remove("invalid-state");
        passwd2.title = chrome.i18n.getMessage("hintInputPassword");
        okButton.disabled = false;

      if (passwd1.value.length < 8) {
        passwd1.classList.add("invalid-state");
        passwd1.title = chrome.i18n.getMessage("errorPasswordTooShort");
        okButton.disabled = true;
      }
      if (passwd2.value.length < 8) {
        passwd2.classList.add("invalid-state");
        passwd2.title = chrome.i18n.getMessage("errorPasswordTooShort");
        okButton.disabled = true;
      }
      if (passwd1.value.length >= 8 && passwd2.value.length >= 8 && passwd1.value !== passwd2.value) {
        passwd2.classList.add("invalid-state");
        passwd2.title = chrome.i18n.getMessage("errorPasswordDiffers");
        okButton.disabled = true;
      }
      
    }
  });

  return new Promise((resolve, reject) => {
    document.body.addEventListener('click', response)

    function response(e) {
      let bool = false;
      if (e.target.id == 'modal-btn-cancel') bool = false;
      else if (e.target.id == 'modal-btn-ok') bool = true;
      else return;

      document.body.removeEventListener('click', response);
      const backdrop = document.body.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove()      
      modalElem.remove()
      resolve({doSave: bool, password: passwd1.value});
    }
  });
}



async function bsAskForPassword(title, message, okLabel, cancelLabel) {
  const modalElem = document.createElement('div');
  const lblOk = okLabel || chrome.i18n.getMessage("lblOk");
  const lblCancel = cancelLabel || chrome.i18n.getMessage("lblCancel");
  const lblPassword = chrome.i18n.getMessage("lblPassword");
  const lblUseTheApp = chrome.i18n.getMessage("lblUseTheApp");

  modalElem.id = "modal-confirm";
  modalElem.className = "modal";
  modalElem.innerHTML = `
    <div class="modal-dialog modal-dialog-centered _modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${title}</h1>
          <button id="modal-btn-cancel" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cancel"></button>
        </div>     
         
        <div class="modal-body fs-7">
          ${message}
          <p>
          <div class="form-group mx-sm-3 mb-2">
            <input type="password" class="form-control" id="inputPassword1" placeholder="${lblPassword}">
          </div>
          <button id="useAppToUnlock" type="button" class="btn btn-outline-primary rounded-0">${lblUseTheApp}</button>
        </div>    
        
        <div class="modal-footer">             
          <button id="modal-btn-cancel" type="button" class="btn btn-secondary rounded-0">${lblCancel}</button>
          <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${lblOk}</button>
        </div>
      </div>
    </div>
  `;
  const myModal = new bootstrap.Modal(modalElem, {
    keyboard: false,
    backdrop: 'static'
  });
  myModal.show();

  const passwd = document.getElementById("inputPassword1");

  const okButton = document.getElementById("modal-btn-ok");

  passwd.focus();
  okButton.disabled = true;

  passwd.onkeydown = (e) => {
    if (e.key == 'Enter') {
      if (passwd.value.length >= 8) {
        okButton.dispatchEvent(new Event('click', { bubbles: true }));
      }
    }
 };

  document.addEventListener("input", (e) => {
    if (e.target.id === "inputPassword1") {
        passwd.classList.remove("invalid-state");
        passwd.title = chrome.i18n.getMessage("hintInputPassword");
        okButton.disabled = false;

      if (passwd.value.length < 8) {
        passwd.classList.add("invalid-state");
        passwd.title = chrome.i18n.getMessage("errorPasswordTooShort");
        okButton.disabled = true;
      }
      
    }
  });

  return new Promise((resolve, reject) => {
    document.body.addEventListener('click', response);

    function response(e) {
      let bool = false;
      if (e.target.id == 'modal-btn-cancel') bool = false;
      else if (e.target.id == 'modal-btn-ok') bool = true;
      else if (e.target.id == 'useAppToUnlock') bool = null;
      else return;

      document.body.removeEventListener('click', response);
      const backdrop = document.body.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove()      
      modalElem.remove()
      if (bool === null) {
        resolve({doUnlock: true});
      }
      else {
        resolve({doUnlock: bool, password: passwd.value});
      }
    }
  });
}




/*!
 * Color mode toggler for Bootstrap's docs (https://getbootstrap.com/)
 * Copyright 2011-2024 The Bootstrap Authors
 * Licensed under the Creative Commons Attribution 3.0 Unported License.
 */

(() => {
  'use strict'

  const getStoredTheme = () => localStorage.getItem('theme')
  const setStoredTheme = theme => localStorage.setItem('theme', theme)

  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme()
    if (storedTheme) {
      return storedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const setTheme = theme => {
    if (theme === 'auto') {
      document.documentElement.setAttribute('data-bs-theme', (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme)
    }
  }

  setTheme(getPreferredTheme())

  const showActiveTheme = (theme, focus = false) => {
    const themeSwitcher = document.querySelector('#settings-theme')

    if (!themeSwitcher) {
      return
    }

    const themeSwitcherText = document.querySelector('#bd-theme-text')
    const btnToActive = document.querySelector(`[data-bs-theme-value="${theme}"]`)

    document.querySelectorAll('[data-bs-theme-value]').forEach(element => {
      element.classList.remove('active')
      element.setAttribute('aria-pressed', 'false')
    })

    btnToActive.classList.add('active')
    btnToActive.setAttribute('aria-pressed', 'true')

    const themeSwitcherLabel = translateThemeValue(btnToActive.dataset.bsThemeValue);

    themeSwitcher.setAttribute('aria-label', themeSwitcherLabel)

    themeSwitcherText.textContent = themeSwitcherLabel;

    if (focus) {
      themeSwitcher.focus()
    }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme()
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      setTheme(getPreferredTheme())
    }
  })

  window.addEventListener('DOMContentLoaded', () => {
    showActiveTheme(getPreferredTheme())

    document.querySelectorAll('[data-bs-theme-value]')
      .forEach(toggle => {
        toggle.addEventListener('click', () => {
          const theme = toggle.getAttribute('data-bs-theme-value')
          setStoredTheme(theme)
          setTheme(theme)
          showActiveTheme(theme, true)
        })
      })
  })
})()


function translateThemeValue(string) {
  if (string === 'light') {
    return chrome.i18n.getMessage("lblSettingsColorThemeLight");
  } else if (string === 'dark') {
    return chrome.i18n.getMessage("lblSettingsColorThemeDark");
  }
  else {
    return chrome.i18n.getMessage("lblSettingsColorThemeAuto");
  }
}