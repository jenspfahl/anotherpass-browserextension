
document.addEventListener("click", (e) => {


  if (e.target.tagName !== "BUTTON") {
    // Ignore when click is not on a button within <div id="popup-content">.
    return;
  }
  else if (e.target.id === "close") {
    window.close();
  }
});

const data = JSON.parse(new URLSearchParams(location.search).get('data'));

document.getElementById("title").innerText = data.title;
document.getElementById("text").innerText = data.text;


