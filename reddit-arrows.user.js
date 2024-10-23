(() => {
  let keymap = {
    ArrowLeft: "prevButton",
    ArrowRight: "nextButton",
  };
  document.addEventListener("keydown", event => {
    if (!(event.key in keymap)) return;

    document.querySelector("#shreddit-media-lightbox gallery-carousel")?.shadowRoot.querySelector(`span[slot="${keymap[event.key]}"]`).click();
  });
})();
