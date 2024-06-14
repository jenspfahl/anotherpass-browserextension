
const data = JSON.parse(new URLSearchParams(location.search).get('data'));

document.addEventListener("click", (e) => {


  if (e.target.id === "cancel") {
    window.close();
  }
  else if (e.target.id === "ok") {
    chrome.runtime.sendMessage({
      action: data.confirmAction,
    });
    window.close();
  }
});


document.getElementById("title").innerText = data.title;
document.getElementById("text").innerText = data.text;


