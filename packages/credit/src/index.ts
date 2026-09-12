// @octro/credit — moteur de scoring credit (methodologie "Odoo Credit
// Assessment Report"), calcul pur sans I/O (meme esprit que
// services/optimizer, mais en TypeScript). packages/application/ appelle
// assessCredit() apres avoir recupere les donnees brutes via OdooPort.
export * from "./types.js";
export * from "./helpers.js";
export * from "./assess-credit.js";
