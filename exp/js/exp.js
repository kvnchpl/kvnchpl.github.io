const TITLE_PREFIX = "EXP | ";
const idTarget = document.querySelector(".exp-page-id");
const returnLink = document.querySelector(".exp-return");

function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

if (returnLink) {
  returnLink.tabIndex = 1;

  returnLink.addEventListener("click", (event) => {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(returnLink.href);
  });
}

if (idTarget) {
  idTarget.tabIndex = 2;

  const title = document.title.trim();
  const pageId = title.startsWith(TITLE_PREFIX)
    ? title.slice(TITLE_PREFIX.length)
    : title;

  idTarget.textContent = pageId;
}
