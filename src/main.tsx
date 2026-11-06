import {createRoot} from 'react-dom/client';
import AppDefault, { App as AppNamed } from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';

const App = AppDefault || AppNamed;

createRoot(document.getElementById('root')!).render(<App />);

