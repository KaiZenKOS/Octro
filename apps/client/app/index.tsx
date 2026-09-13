import { HomeScreen } from '../src/account-screens';
// Arrivee sur le site = le parcours reel (compte -> KYC simule -> credit
// Odoo), plus une maquette de demonstration. Le wallet (solde/historique)
// vit sur /transactions, le lending sur /lending. L'ancienne page
// d'accueil fixture (Lina) reste disponible sur /demo.
export default function Home() { return <HomeScreen />; }
