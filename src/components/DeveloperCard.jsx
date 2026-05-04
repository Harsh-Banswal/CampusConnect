import { Github, Linkedin, MessageSquare, Briefcase, Code2, User } from 'lucide-react';

const skillColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

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
    ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
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

      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-full bg-slate-900 text-white ring-2 ring-blue-100 flex-shrink-0 flex items-center justify-center font-semibold text-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{dev.name}</h3>
            <span
              className={`badge ${dev.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            >
              {dev.available ? 'Available' : 'Busy'}
            </span>
          </div>
          <p className="text-sm text-blue-600 font-medium">{dev.role}</p>
          <p className="text-xs text-gray-500">{dev.year}</p>
          {dev.enrollment_no && <p className="text-xs text-gray-400 font-medium">• {dev.enrollment_no}</p>}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dev.bio}</p>

      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Code2 size={13} className="text-blue-500" />
          <span><strong className="text-gray-800">{dev.projects}</strong> Projects</span>
        </div>
        <div className="flex items-center gap-1">
          <Briefcase size={13} className="text-purple-500" />
          <span><strong className="text-gray-800">{dev.hackathons}</strong> Hackathons</span>
        </div>
      </div>


      <div className="flex flex-wrap gap-1.5 mb-4">
        {dev.skills.map((skill, i) => (
          <span key={skill} className={`badge ${skillColors[i % skillColors.length]}`}>
            {skill}
          </span>
        ))}
      </div>


      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          type="button"
          onClick={stopAndCall(onConnect)}
          disabled={connectDisabled}
          className={`text-sm flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-medium transition-colors ${
            connectDisabled
              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500'
              : connectToneClass
          }`}
        >
          <User size={15} /> {connectLabel}
        </button>
        <button
          type="button"
          onClick={stopAndCall(onMessage)}
          className="border border-gray-200 rounded-xl text-gray-700 hover:text-gray-900 hover:border-gray-400 transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-white"
        >
          <MessageSquare size={15} /> Message
        </button>
        {dev.github ? (
          <a
            href={dev.github}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:border-gray-400 transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-white"
          >
            <Github size={15} /> GitHub
          </a>
        ) : (
          <button
            type="button"
            disabled
            onClick={(event) => event.stopPropagation()}
            className="border border-gray-100 rounded-xl text-gray-300 bg-gray-50 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium cursor-not-allowed"
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
            className="border border-gray-200 rounded-xl text-blue-500 hover:text-blue-700 hover:border-blue-400 transition-colors flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-white"
          >
            <Linkedin size={15} /> LinkedIn
          </a>
        ) : (
          <button
            type="button"
            disabled
            onClick={(event) => event.stopPropagation()}
            className="border border-gray-100 rounded-xl text-gray-300 bg-gray-50 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium cursor-not-allowed"
          >
            <Linkedin size={15} /> LinkedIn
          </button>
        )}
      </div>
    </div>
  );
}
