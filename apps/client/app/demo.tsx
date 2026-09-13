import { Screen } from '../src/screens';
// Ancienne page d'accueil (fixture Lina, donnees synthetiques) — deplacee
// depuis "/" pour que l'arrivee sur le site soit le parcours reel
// (HomeScreen/TransactionsScreen/LendingScreen), pas une maquette de
// demonstration. Toujours accessible pour montrer le scenario de
// prevision Lina.
export default function Demo() { return <Screen screen="home"/>; }
