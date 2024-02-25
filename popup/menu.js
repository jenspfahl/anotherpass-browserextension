document.addEventListener("click", (e) => {

  if (e.target.id === "link") {

    const sending = chrome.runtime.sendMessage({
      action: "start_link_flow",
    });

    // TODO add Settings action

  }
});
