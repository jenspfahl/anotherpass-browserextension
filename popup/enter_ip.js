
document.addEventListener("click", (e) => {


  console.log("click");


  /**
  * Get the active tab,
  * then call "beastify()" or "reset()" as appropriate.
  */
  if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  if (e.target.type === "reset") {


    inputIp();

  }
});

let uuid = crypto.randomUUID();
console.log(uuid);
const array = new Uint32Array(10);
crypto.getRandomValues(array);

console.log("Your lucky numbers:");
for (const num of array) {
  console.log(num);
}

let keyPair = window.crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["encrypt", "decrypt"],
).then(keyPair => {
  console.log(keyPair);
});



function handleResponse(message) {
  console.log(`Message from the background script: ${message.response}`);
  alert(message.response);
}

function handleError(error) {
  console.log(`Error: ${error}`);
}

function inputIp() {

  console.log("here");


  var ip = prompt("Enter IP address:");

  if (ip == null || ip == "") {
    ip = "192.168.178.27";
  }

  const sending = chrome.runtime.sendMessage({
    ip: ip,
  });
  sending.then(handleResponse, handleError);


  console.log("there");




}