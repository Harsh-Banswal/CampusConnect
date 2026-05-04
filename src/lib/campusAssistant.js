import { extractSkillSignals, recommendStudents } from './aiTeamMatcher';

const IDEA_BANK = {
  Hackathon: [
    'AI campus helpdesk that answers questions from event, club, and timetable data',
    'Smart teammate matcher that forms balanced teams from skills and availability',
    'Lost-and-found tracker with image search and location based notifications',
    'Mental wellness check-in app with anonymous peer support routing',
  ],
  Workshop: [
    'Mini portfolio project using the workshop topic and your current skills',
    'Learning companion that converts notes into flashcards and quizzes',
    'Attendance and feedback dashboard for workshop organizers',
  ],
  Seminar: [
    'Research summary board with key takeaways, questions, and follow-up resources',
    'Topic explainer chatbot trained on speaker notes and public references',
    'Student interest survey that recommends next seminars to the club',
  ],
  Meetup: [
    'Networking buddy finder based on skills, goals, and availability',
    'Community project board where students can pitch ideas after the meetup',
    'Club member onboarding assistant with FAQs and task suggestions',
  ],
  Other: [
    'Campus productivity assistant for events, clubs, and project planning',
    'Skill growth tracker that recommends collaborators and events',
    'Student opportunity dashboard with personalized next steps',
  ],
};

const QUICK_PROMPTS = [
  'What events are coming up?',
  'Which event fits my skills?',
  'Find teammates for me',
  'Give me project ideas for the next hackathon',
  'Who is available for AI or React?',
  'How should I prepare for upcoming events?',
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function formatDate(date, time) {
  if (!date) return 'date not set';
  const parsed = new Date(date);
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `${day} at ${String(time).slice(0, 5)}` : day;
}

function getUpcomingEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((event) => new Date(event.date) >= today && event.status !== 'closed' && event.status !== 'cancelled')
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getEventByQuestion(events, question) {
  const q = normalize(question);
  return events.find((event) => q.includes(normalize(event.title))) || getUpcomingEvents(events)[0] || events[0];
}

function userSkillSet(user) {
  return (user?.skills || []).map((skill) => normalize(skill));
}

function scoreEventForUser(event, user) {
  const signals = extractSkillSignals({
    title: event.title,
    category: event.category,
    description: event.description,
    tags: event.tags || [],
  });
  const skills = userSkillSet(user);
  const matched = signals.filter((skill) => skills.includes(normalize(skill)));
  const categoryBoost = event.category === 'Hackathon' ? 8 : event.category === 'Workshop' ? 6 : 3;
  const seatsLeft = Math.max((event.max_seats || 0) - (event.registrations || 0), 0);
  const seatBoost = seatsLeft > 0 ? 8 : -20;

  return {
    ...event,
    aiSignals: signals,
    matchedSkills: matched,
    fitScore: Math.max(0, Math.min(100, Math.round((matched.length / Math.max(signals.length, 1)) * 70 + categoryBoost + seatBoost))),
  };
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function answerUpcoming(events) {
  const upcoming = getUpcomingEvents(events).slice(0, 5);
  if (!upcoming.length) {
    return 'I could not find any upcoming open events right now. Check again after clubs publish new events.';
  }

  return `Here are the upcoming open events I found:\n\n${bulletList(upcoming.map((event) => {
    const seatsLeft = Math.max((event.max_seats || 0) - (event.registrations || 0), 0);
    return `${event.title} (${event.category || 'Event'}) on ${formatDate(event.date, event.time)} at ${event.venue || 'venue TBA'} - ${seatsLeft} seats left`;
  }))}`;
}

function answerBestEvents(events, user) {
  const ranked = getUpcomingEvents(events)
    .map((event) => scoreEventForUser(event, user))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 4);

  if (!ranked.length) return answerUpcoming(events);

  return `Best events for you based on your profile skills:\n\n${bulletList(ranked.map((event) => {
    const matched = event.matchedSkills.length ? ` Matches your ${event.matchedSkills.join(', ')}.` : ' Add more profile skills to improve matching.';
    return `${event.title} - ${event.fitScore}% fit.${matched}`;
  }))}`;
}

function answerTeammates(students, user, events, question) {
  const selectedEvent = getEventByQuestion(events, question);
  const requiredSkills = selectedEvent
    ? extractSkillSignals({
        title: selectedEvent.title,
        category: selectedEvent.category,
        description: selectedEvent.description,
        tags: selectedEvent.tags || [],
      })
    : user?.skills || [];

  const matches = recommendStudents(students, user, requiredSkills, 5);
  if (!matches.length) {
    return 'I could not find available teammates with matching skills yet. Ask students to update their skills and set their status to available.';
  }

  const intro = selectedEvent
    ? `For ${selectedEvent.title}, I would suggest these available teammates:`
    : 'I found these available teammates for you:';

  return `${intro}\n\n${bulletList(matches.map((student) => {
    const skills = student.matchedSkills.length ? student.matchedSkills.join(', ') : (student.skills || []).slice(0, 3).join(', ');
    return `${student.name} - ${student.score}% fit, skills: ${skills || 'profile skills not listed'}`;
  }))}\n\nYou can open Team Builder to create a group chat with the selected people.`;
}

function answerIdeas(events, user, question) {
  const event = getEventByQuestion(events, question);
  const category = event?.category || 'Other';
  const baseIdeas = IDEA_BANK[category] || IDEA_BANK.Other;
  const signals = event
    ? extractSkillSignals({
        title: event.title,
        category: event.category,
        description: event.description,
        tags: event.tags || [],
      })
    : [];
  const userSkills = user?.skills?.slice(0, 4) || [];

  const personalized = baseIdeas.slice(0, 4).map((idea, index) => {
    const skillHint = userSkills[index % Math.max(userSkills.length, 1)] || signals[index % Math.max(signals.length, 1)] || 'React';
    return `${idea} - use ${skillHint} and present it with a simple demo plus impact metrics`;
  });

  const eventLine = event ? ` for ${event.title}` : '';
  return `Here are strong project ideas${eventLine}:\n\n${bulletList(personalized)}\n\nBest presentation angle: explain the campus problem, show a working flow, then finish with who benefits and how you would scale it.`;
}

function answerPreparation(events, user) {
  const nextEvent = getUpcomingEvents(events)[0];
  const skills = user?.skills?.length ? user.skills.slice(0, 5).join(', ') : 'your strongest skills';
  if (!nextEvent) {
    return `For now, update your profile skills and availability. Once events are published, I can match ${skills} to the best event and teammates.`;
  }

  const signals = extractSkillSignals({
    title: nextEvent.title,
    category: nextEvent.category,
    description: nextEvent.description,
    tags: nextEvent.tags || [],
  });

  return `For the next event, ${nextEvent.title}, prepare like this:\n\n${bulletList([
    `Review the core topics: ${signals.slice(0, 5).join(', ') || nextEvent.category}`,
    `Update your profile with skills like ${skills}`,
    'Form a small team with one builder, one designer/presenter, and one domain researcher',
    'Prepare a 2 minute problem statement and a 5 minute demo plan',
  ])}`;
}

function answerHelp() {
  return `You can ask me things like:\n\n${bulletList(QUICK_PROMPTS)}\n\nI use CampusConnect data: upcoming events, event tags, your profile skills, available students, and team matching signals.`;
}

export function getQuickPrompts() {
  return QUICK_PROMPTS;
}

export function answerCampusQuestion(question, context) {
  const q = normalize(question);
  const { events = [], students = [], user = null } = context;

  if (!q.trim()) return answerHelp();
  if (q.includes('upcoming') || q.includes('coming') || q.includes('events') || q.includes('next event')) {
    if (q.includes('idea') || q.includes('project') || q.includes('present')) return answerIdeas(events, user, question);
    if (q.includes('fit') || q.includes('best') || q.includes('recommend')) return answerBestEvents(events, user);
    return answerUpcoming(events);
  }
  if (q.includes('team') || q.includes('teammate') || q.includes('partner') || q.includes('available') || q.includes('person')) {
    return answerTeammates(students, user, events, question);
  }
  if (q.includes('idea') || q.includes('project') || q.includes('present') || q.includes('pitch')) {
    return answerIdeas(events, user, question);
  }
  if (q.includes('prepare') || q.includes('how should') || q.includes('what should')) {
    return answerPreparation(events, user);
  }
  if (q.includes('skill') || q.includes('profile')) {
    return `Your current listed skills are: ${(user?.skills || []).join(', ') || 'none yet'}.\n\nAdd specific skills like React, Python, UI Design, Machine Learning, Supabase, Node, Public Speaking, or Data Analysis so events and teammates can be matched better.`;
  }

  return `${answerHelp()}\n\nFor your question, I would start by checking upcoming events and matching them with your skills. Try asking: "Which event fits my skills?"`;
}
