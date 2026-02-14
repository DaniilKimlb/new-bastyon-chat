window.jQuery ||
  document.write('<script src="js/vendor/jquery-3.4.1.min.js"></script>');
_SEO = null;

function buildChat(streamRoom) {
  const roomId = streamRoom || localStorage.getItem("streamRoom");

  if (roomId) {
    if (window.core?.mtrx?.client) {
      window.matrixchat.mtrx.core
        .renderChatToElement(document.querySelector("#exported div"), roomId, {
          style: "stream"
        })
        .then(r => {
          console.log("stream", r);
        })
        .catch(e => {
          if (e) console.error(e);
        });
    } else {
      setTimeout(() => buildChat(streamRoom), 1000);
    }
  } else {
    console.error("missing:roomId");
  }
}

if (document.querySelector("#create-chat")) {
  document.querySelector("#create-chat").onclick = function () {
    window.core
      .createStreamRoom(`ForTest-${Math.random().toString(32).slice(2)}`)
      .then(r => {
        console.log("stream", r);
        localStorage.setItem("streamRoom", r);
        buildChat(r);
      });
  };
}
