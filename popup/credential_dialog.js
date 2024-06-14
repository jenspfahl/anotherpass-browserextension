
const credential = JSON.parse(new URLSearchParams(location.search).get('data'));

document.addEventListener("click", (e) => {


  if (e.target.id === "close") {
    window.close();
  }
  else if (e.target.id === "copy") {
    navigator.clipboard.writeText(credential.password);
    alert("Password copied to clipboard");
  }
});


document.getElementById("name").innerText = credential.name;
document.getElementById("website").innerText = credential.website;
document.getElementById("username").innerText = credential.user;
document.getElementById("password").innerText = credential.password;


