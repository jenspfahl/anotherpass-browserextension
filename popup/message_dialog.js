
document.addEventListener("click", (e) => {


  if (e.target.id === "close") {
    window.close();
  }
});

const data = JSON.parse(new URLSearchParams(location.search).get('data'));

document.getElementById("title").innerText = data.title;
document.getElementById("text").innerText = data.text;


