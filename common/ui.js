
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
          <div class="modal-body fs-6">
            ${message}
        </div>    
        <div class="modal-footer" style="border-top:0px">             
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
      <div class="modal-footer" style="border-top:0px">             
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


