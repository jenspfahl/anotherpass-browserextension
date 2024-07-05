
async function bsAlert(title, message, closeLabel) {
    const modalElem = document.createElement('div')
    modalElem.id = "modal-confirm"
    modalElem.className = "modal"
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
        <div class="modal-footer"">             
        <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${closeLabel||"Close"}</button>
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
  const modalElem = document.createElement('div')
  modalElem.id = "modal-confirm"
  modalElem.className = "modal"
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
      <button id="modal-btn-cancel" type="button" class="btn btn-secondary rounded-0">${cancelLabel||"Cancel"}</button>
      <button id="modal-btn-ok" type="button" class="btn btn-primary rounded-0">${okLabel||"Ok"}</button>
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
    const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`
    themeSwitcher.setAttribute('aria-label', themeSwitcherLabel)

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

