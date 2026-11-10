// Bloqueo del scroll del documento mientras hay un modal o un menú abierto.
// Se marca el <html> (el viewport) y no el <body>: html tiene overflow-x, y con ese valor el overflow
// del body no llega al viewport, así que la página seguía scrolleando detrás del modal.
// Los bloqueos se cuentan: el scroll vuelve solo cuando se cierra el último modal.
let locks = 0;

export function lockDocumentScroll() {
  locks += 1;
  document.documentElement.classList.add("modal-open");
}

export function unlockDocumentScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.documentElement.classList.remove("modal-open");
}
