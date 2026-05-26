const fs = require('fs');

// --- Update EventsPage.jsx ---
let page = fs.readFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/pages/EventsPage.jsx', 'utf8');

// Header
page = page.replace('text-3xl font-extrabold text-gray-900 mb-1', 'text-3xl font-extrabold text-white mb-1');
page = page.replace('text-gray-500', 'text-gray-400'); // multiple occurrences maybe? 

// Let's do regex for global replacements in the page safely
page = page.replace(/border-gray-200/g, 'border-dark-border');
page = page.replace(/text-gray-900/g, 'text-white');
page = page.replace(/text-gray-700/g, 'text-gray-300');
page = page.replace(/text-gray-600/g, 'text-gray-300');
page = page.replace(/text-gray-500/g, 'text-gray-400');
page = page.replace(/text-gray-400/g, 'text-gray-500');

// Tabs
page = page.replace(/text-blue-600 border-b-blue-600/g, 'text-accent border-b-accent');
page = page.replace(/hover:text-gray-700/g, 'hover:text-gray-200');

// Search Input
page = page.replace(/bg-white/g, 'bg-dark-surface');

// Category Pills
page = page.replace(/'bg-blue-600 text-white'/g, "'bg-accent text-gray-900 border border-accent'");
page = page.replace(/'bg-dark-surface text-gray-300 border border-dark-border hover:border-blue-300 hover:text-blue-600'/g, "'bg-dark-surface text-gray-300 border border-dark-border hover:border-accent hover:text-accent'");
// The original was 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
page = page.replace(/'bg-dark-surface text-gray-300 border border-dark-border hover:border-blue-300 hover:text-blue-600'/g, "'bg-dark-surface text-gray-300 border border-dark-border hover:border-accent hover:text-accent'");
// Wait, I replaced bg-white with bg-dark-surface globally. So the string is now:
// 'bg-dark-surface text-gray-300 border border-dark-border hover:border-blue-300 hover:text-blue-600'
// Let's fix it:
page = page.replace(/hover:border-blue-300/g, 'hover:border-accent');
page = page.replace(/hover:text-blue-600/g, 'hover:text-accent');

// Clear filters button
page = page.replace(/border-red-200 hover:bg-red-50/g, 'border-red-500/30 hover:bg-red-500/10 text-red-400');

// Loading spinner
page = page.replace(/border-blue-600/g, 'border-accent');

fs.writeFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/pages/EventsPage.jsx', page);


// --- Update EventCard.jsx ---
let card = fs.readFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/components/EventCard.jsx', 'utf8');

// We want to rewrite the badges logic at the top of EventCard.jsx
card = card.replace(
`const categoryColors = {
  Hackathon: 'bg-purple-100 text-purple-700',
  Workshop: 'bg-blue-100 text-blue-700',
  Seminar: 'bg-green-100 text-green-700',
  Meetup: 'bg-orange-100 text-orange-700',
};`,
`const categoryColors = {
  Hackathon: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Workshop: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Seminar: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Meetup: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
};`
);

card = card.replace(
`const statusColors = {
  available: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
  ongoing: 'bg-yellow-100 text-yellow-700',
};`,
`const statusColors = {
  available: 'bg-accent-green text-gray-900 font-bold uppercase tracking-wider',
  closed: 'bg-red-500 text-white font-bold uppercase tracking-wider',
  ongoing: 'bg-yellow-500 text-gray-900 font-bold uppercase tracking-wider',
};`
);

// Fallbacks in JSX
card = card.replace(/'bg-gray-100 text-gray-700'/g, "'bg-dark-surface border border-dark-border text-gray-300 uppercase tracking-wider'");

// Content styling
card = card.replace(/text-blue-600/g, 'text-accent-purple hidden'); // Hide club if matching image, or just make it accent
card = card.replace(/text-gray-900/g, 'text-white text-xl mt-2'); // Title
card = card.replace(/text-gray-500/g, 'text-gray-400 font-medium');
card = card.replace(/text-gray-600/g, 'text-gray-300');

// Progress Bar
card = card.replace('flex justify-between text-xs text-gray-400 font-medium mb-1', 'flex justify-between text-xs text-gray-400 font-bold mb-2');
card = card.replace('<span className="flex items-center gap-1"><Users size={11}/> {event.registrations} registered</span>', '<span className="text-gray-300">Registration Progress</span>');
card = card.replace('<span>{maxSeats} seats</span>', '<span className="text-accent-green">{event.registrations} / {maxSeats} Seats</span>');
card = card.replace('bg-gray-100 rounded-full h-1.5', 'bg-dark-surface border border-dark-border rounded-full h-1.5 overflow-hidden');
card = card.replace(/bg-red-500/g, 'bg-accent-green');
card = card.replace(/bg-yellow-500/g, 'bg-accent-green');
card = card.replace(/bg-blue-500/g, 'bg-accent-green');

// Tags
card = card.replace(/bg-gray-100/g, 'bg-dark-surface border border-dark-border');

// View Details button
card = card.replace('btn-primary text-sm text-center', 'w-full rounded-xl bg-accent-green px-5 py-2.5 font-bold text-gray-900 text-center transition hover:-translate-y-0.5 hover:bg-green-400 uppercase tracking-wider text-sm');

fs.writeFileSync('/home/harsh/Desktop/CampusConnect(DONE)/frontend/src/components/EventCard.jsx', card);
console.log('Done');
