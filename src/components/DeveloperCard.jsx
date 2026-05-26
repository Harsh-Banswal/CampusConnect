import { Github, Linkedin, MessageSquare, Briefcase, Code2, User } from 'lucide-react';

export default function DeveloperCard({
  dev,
  onOpenProfile,
  onConnect,
  onMessage,
  connectLabel = 'Connect',
  connectDisabled = false,
  connectTone = 'primary'
}) {
  const initials = dev.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  const handleCardClick = () => {
    if (onOpenProfile) onOpenProfile(dev);
  };

  const stopAndCall = (handler) => (event) => {
    event.stopPropagation();
    if (handler) handler(dev);
  };

  const connectToneClass = connectTone === 'danger'
    ? 'border border-dark-border bg-dark-surface text-rose-400 hover:border-rose-400 hover:text-rose-300'
    : 'btn-primary';

  return (
    <div
      className="card p-5 flex flex-col cursor-pointer transition-transform hover:-translate-y-0.5"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
    >

      <div className="flex items-start gap-4 mb-3">
        {dev.avatar ? (
          <img 
            src={dev.avatar} 
            alt={dev.name} 
            className="w-14 h-14 rounded-full ring-2 ring-dark-surface flex-shrink-0 object-cover" 
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-accent-muted text-accent ring-2 ring-dark-surface flex-shrink-0 flex items-center justify-center font-bold text-lg">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-bold text-white text-lg">{dev.name}</h3>
            <span
              className={`badge ${dev.available ? 'bg-accent-mutedGreen text-accent-green border border-accent-green/30' : 'bg-dark-surface text-gray-500 border border-dark-border'}`}
            >
              {dev.available ? 'Available' : 'Busy'}
            </span>
          </div>
          <p className="text-sm text-gray-400 font-medium">{dev.role}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
             <p className="text-xs text-gray-500">{dev.year}</p>
             {dev.enrollment_no && <p className="text-xs text-gray-500 font-medium">• {dev.enrollment_no}</p>}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">{dev.bio || 'No bio provided yet.'}</p>

      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Code2 size={14} className="text-gray-500" />
          <span><strong className="text-gray-300">{dev.projects}</strong> Projects</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase size={14} className="text-gray-500" />
          <span><strong className="text-gray-300">{dev.hackathons}</strong> Hackathons</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {dev.skills.slice(0, 4).map((skill, i) => (
          <span key={skill} className={`badge border ${i === 0 ? 'bg-accent-muted text-accent border-accent' : 'bg-dark-surface text-gray-300 border-dark-border'}`}>
            {skill}
          </span>
        ))}
        {dev.skills.length > 4 && (
          <span className="badge bg-dark-surface text-gray-500 border border-dark-border">
            +{dev.skills.length - 4}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          type="button"
          onClick={stopAndCall(onConnect)}
          disabled={connectDisabled}
          className={`text-sm flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold transition-colors ${
            connectDisabled
              ? 'cursor-not-allowed border border-dark-border bg-dark-card text-gray-600 opacity-70'
              : connectToneClass
          }`}
        >
          <User size={15} /> {connectLabel}
        </button>
        <button
          type="button"
          onClick={stopAndCall(onMessage)}
          className="border border-dark-border rounded-xl text-gray-300 hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-dark-surface"
        >
          <MessageSquare size={15} /> Message
        </button>
        {dev.github ? (
          <a
            href={dev.github}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="border border-dark-border rounded-xl text-gray-400 hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-dark-surface"
          >
            <Github size={15} /> GitHub
          </a>
        ) : (
          <button
            type="button"
            disabled
            onClick={(event) => event.stopPropagation()}
            className="border border-dark-border rounded-xl text-gray-600 bg-dark-card flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold cursor-not-allowed opacity-50"
          >
            <Github size={15} /> GitHub
          </button>
        )}
        {dev.linkedin ? (
          <a
            href={dev.linkedin}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="border border-dark-border rounded-xl text-gray-400 hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-dark-surface"
          >
            <Linkedin size={15} /> LinkedIn
          </a>
        ) : (
          <button
            type="button"
            disabled
            onClick={(event) => event.stopPropagation()}
            className="border border-dark-border rounded-xl text-gray-600 bg-dark-card flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold cursor-not-allowed opacity-50"
          >
            <Linkedin size={15} /> LinkedIn
          </button>
        )}
      </div>
    </div>
  );
}
