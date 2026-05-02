import './style.css';
import { startApp } from './app';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root element');

root.innerHTML = '';
startApp(root);
