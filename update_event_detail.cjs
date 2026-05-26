const fs = require('fs');

let page = fs.readFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/pages/EventDetailPage.jsx', 'utf8');

// Global Text & Background replacements
page = page.replace(/bg-gray-100/g, 'bg-dark-surface');
page = page.replace(/bg-gray-50\/70/g, 'bg-dark-surface');
page = page.replace(/bg-gray-50/g, 'bg-dark-surface');
page = page.replace(/border-gray-100/g, 'border-dark-border');
page = page.replace(/border-gray-200/g, 'border-dark-border');

page = page.replace(/text-gray-900/g, 'text-white');
page = page.replace(/text-gray-700/g, 'text-gray-300');
page = page.replace(/text-gray-600/g, 'text-gray-400');
page = page.replace(/text-gray-500/g, 'text-gray-400');
page = page.replace(/text-gray-400/g, 'text-gray-500');

page = page.replace(/bg-white/g, 'bg-dark-card');

// Specific replacements

// Badges
page = page.replace(/bg-violet-100 text-violet-700/g, 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider');
page = page.replace(/bg-slate-100 text-slate-700/g, 'bg-dark-surface border border-dark-border text-gray-300 uppercase tracking-wider');
page = page.replace(/bg-green-100 text-green-700/g, 'bg-accent-green text-gray-900 font-bold uppercase tracking-wider');
page = page.replace(/bg-red-100 text-red-700/g, 'bg-red-500 text-white font-bold uppercase tracking-wider');

// Registration block
page = page.replace(/text-green-700 bg-green-50/g, 'text-green-300 bg-green-900/40 border border-green-900');
page = page.replace(/text-green-600/g, 'text-green-400');
page = page.replace(/bg-violet-500/g, 'bg-accent-purple');
page = page.replace(/text-red-600 hover:bg-red-50/g, 'text-red-400 hover:bg-red-500/10');
page = page.replace(/text-red-700/g, 'text-red-400');
page = page.replace(/bg-red-50/g, 'bg-red-900/40');
page = page.replace(/border-red-100/g, 'border-red-900');

// "by Campus Connect"
page = page.replace(/text-violet-600 font-semibold mb-6/g, 'text-accent-purple font-semibold mb-6');

// Grid items icons
page = page.replace(/text-violet-600 mt-0.5/g, 'text-accent mt-0.5');

// "About this Event" tags
page = page.replace(/bg-violet-50 text-violet-700/g, 'bg-dark-surface border border-dark-border text-gray-300');

// Save / Share buttons
page = page.replace(/bg-violet-50 border-violet-300 text-violet-600/g, 'bg-accent-purple/20 border-accent-purple text-accent-purple');
page = page.replace(/border-dark-border text-gray-400 hover:bg-dark-surface/g, 'border-dark-border text-gray-300 hover:bg-dark hover:text-white');

// Modals
page = page.replace(/bg-slate-900\/60/g, 'bg-black/60');
page = page.replace(/hover:bg-dark-surface hover:text-gray-400/g, 'hover:bg-dark hover:text-white');

fs.writeFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/pages/EventDetailPage.jsx', page);
console.log('done');
