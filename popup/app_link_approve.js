var webClientId = localStorage.getItem("web_client_id");


if (webClientId) {

  document.getElementById("web_client_id").innerText = webClientId;
  const ip = localStorage.getItem("server_address");
  const port = localStorage.getItem("server_port");

  getKey("app_public_key").then(async value => { 
    const publicKeyFingerprint = await getPublicKeyShortenedFingerprint(value);
    document.getElementById("fingerprint").innerText = publicKeyFingerprint;
  

    document.addEventListener("click", (e) => {

      if (e.target.id === "accept") {
        localStorage.setItem("linked", true);

        alert("Extension successfully linked.");
        window.close();
      }

      if (e.target.id === "deny") {
        localStorage.removeItem("linked");
        localStorage.removeItem("web_client_id");
        localStorage.removeItem("server_address");
        localStorage.removeItem("server_port");

        destroyAllKeys();


        alert("Extension unlinked for security reasons");
        window.close();

      }
    });

  });


}
else {
  alert("Something went wrong :(")
}
