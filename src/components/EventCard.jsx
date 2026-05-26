import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';

const categoryColors = {
  Hackathon: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Workshop: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Seminar: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
  Meetup: 'bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase tracking-wider',
};

const statusColors = {
  available: 'bg-accent-green text-gray-900 font-bold uppercase tracking-wider',
  closed: 'bg-red-500 text-white font-bold uppercase tracking-wider',
  ongoing: 'bg-yellow-500 text-gray-900 font-bold uppercase tracking-wider',
};

export default function EventCard({ event, isPast }) {
  const maxSeats = Number(event.maxSeats) || 0;
  const filled = maxSeats > 0 ? Math.round((event.registrations / maxSeats) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastEvent = isPast || new Date(event.date) < today;

  return (
    <div className={`card overflow-hidden flex flex-col transition duration-300 ${isPastEvent ? 'opacity-65 hover:opacity-100' : ''}`}>
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`badge ${categoryColors[event.category] || 'bg-dark-surface border border-dark-border text-gray-300 uppercase tracking-wider'}`}>
            {event.category}
          </span>
          <span className={`badge ${isPastEvent ? 'bg-dark-surface border border-dark-border text-gray-500 font-bold uppercase tracking-wider' : statusColors[event.status] || 'bg-dark-surface border border-dark-border text-gray-300 uppercase tracking-wider'}`}>
            {isPastEvent ? 'Ended' : event.status === 'closed' ? 'Closed' : 'Available'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-accent-purple hidden font-semibold mb-1">{event.club}</p>
        <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">{event.title}</h3>

        <div className="space-y-1.5 text-xs text-gray-400 font-medium mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span>{new Date(event.date).toDateString()} &bull; {event.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>{event.venue}</span>
          </div>
        </div>

        {/* Registration bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 font-bold mb-2">
            <span className="text-gray-300">Registration Progress</span>
            <span className="text-accent-green">{event.registrations} / {maxSeats} Seats</span>
          </div>
          <div className="w-full bg-dark-surface border border-dark-border rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${filled >= 100 ? 'bg-accent-green' : filled >= 70 ? 'bg-accent-green' : 'bg-accent-green'}`}
              style={{ width: `${Math.min(filled, 100)}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4 mt-auto">
          {event.tags.map((tag) => (
            <span key={tag} className="badge bg-dark-surface border border-dark-border text-gray-300">{tag}</span>
          ))}
        </div>

        <Link
          to={`/events/${event.id}`}
          className={
            isPastEvent
              ? "w-full rounded-xl bg-dark-surface border border-dark-border text-gray-300 hover:border-accent hover:text-accent px-5 py-2.5 font-bold text-center transition hover:-translate-y-0.5 uppercase tracking-wider text-sm"
              : `w-full rounded-xl bg-accent-green px-5 py-2.5 font-bold text-gray-900 text-center transition hover:-translate-y-0.5 hover:bg-green-400 uppercase tracking-wider text-sm ${
                  event.status === 'closed' ? 'opacity-60 pointer-events-none' : ''
                }`
          }
        >
          {isPastEvent ? 'View Details' : event.status === 'closed' ? 'Closed' : 'View Details'}
        </Link>
      </div>
    </div>
  );
}
