// Vercel entry: api/index.js re-exports this app, and vercel.json rewrites every request to it.
import { createApp } from './app';

export default createApp();
