/**
 * Wraps the page's single <dialog>. It never closes itself: Esc, the close button and a click
 * outside all call `onDismiss`, and main.js decides what that means for the URL. That keeps the
 * hash the one source of truth. The native modal handles the focus trap and returns focus to the card.
 */
export function createPanel(dialog, { onDismiss }) {
  const label = dialog.querySelector(".panel-label");
  const title = dialog.querySelector(".panel-title");
  const body = dialog.querySelector(".panel-body");
  let meantToBeOpen = false;

  // Chrome may close a modal on a repeated Esc even when "cancel" is prevented.
  // If it closes without hide() asking, treat that as a dismiss so the URL catches up.
  dialog.addEventListener("close", () => {
    if (meantToBeOpen) {
      meantToBeOpen = false;
      onDismiss();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    onDismiss();
  });
  // The dialog element has no padding, so a click that lands on it (not its contents) is on the backdrop.
  // Both the press and the release must be there, or a text selection dragged out of the panel would close it.
  let pressedOnBackdrop = false;
  dialog.addEventListener("pointerdown", (event) => {
    pressedOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener("click", (event) => {
    if (pressedOnBackdrop && event.target === dialog) onDismiss();
    pressedOnBackdrop = false;
  });
  dialog.querySelector(".panel-close").addEventListener("click", onDismiss);

  return {
    show(content) {
      label.textContent = content.label;
      title.textContent = content.title;
      body.innerHTML = content.html;
      body.scrollTop = 0;
      dialog.classList.toggle("panel-wide", Boolean(content.wide));
      meantToBeOpen = true;
      if (!dialog.open) {
        dialog.showModal();
      } else {
        // The link that was clicked is gone with the old content; keep focus inside the panel.
        title.focus();
      }
    },
    hide() {
      meantToBeOpen = false;
      if (dialog.open) dialog.close();
    },
  };
}
