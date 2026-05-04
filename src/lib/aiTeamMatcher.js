const STOP_WORDS = new Set([
  'and', 'or', 'with', 'for', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'by',
  'team', 'project', 'event', 'student', 'students', 'build', 'create', 'make',
  'using', 'based', 'required', 'need', 'needs', 'needed', 'skill', 'skills'
]);

const SKILL_ALIASES = {
  js: 'javascript',
  javascript: 'javascript',
  reactjs: 'react',
  nodejs: 'node',
  'node.js': 'node',
  ui: 'ui design',
  ux: 'ui design',
  ml: 'machine learning',
  ai: 'artificial intelligence',
};

export function normalizeSkill(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[#.]/g, '')
    .replace(/\s+/g, ' ');
}

function canonicalSkill(value) {
  const normalized = normalizeSkill(value);
  return SKILL_ALIASES[normalized] || normalized;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map(canonicalSkill)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

export function extractSkillSignals({ title = '', category = '', description = '', tags = [], explicitSkills = [] }) {
  const weighted = new Map();

  const add = (skill, weight) => {
    const clean = canonicalSkill(skill);
    if (!clean || STOP_WORDS.has(clean)) return;
    weighted.set(clean, (weighted.get(clean) || 0) + weight);
  };

  explicitSkills.forEach((skill) => add(skill, 5));
  tags.forEach((skill) => add(skill, 4));
  tokenize(title).forEach((skill) => add(skill, 2));
  tokenize(category).forEach((skill) => add(skill, 1));
  tokenize(description).forEach((skill) => add(skill, 1));

  return Array.from(weighted.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);
}

function uniqueSkills(skills = []) {
  return Array.from(new Set(skills.map(canonicalSkill).filter(Boolean)));
}

function intersection(source, target) {
  const targetSet = new Set(target);
  return source.filter((item) => targetSet.has(item));
}

export function scoreStudentForTeam(student, currentUser, requiredSkills) {
  const candidateSkills = uniqueSkills(student.skills);
  const userSkills = uniqueSkills(currentUser?.skills || []);
  const required = uniqueSkills(requiredSkills);
  const directMatches = intersection(candidateSkills, required);
  const userMatches = intersection(userSkills, required);
  const complementaryMatches = directMatches.filter((skill) => !userMatches.includes(skill));
  const sharedMatches = intersection(candidateSkills, userSkills);

  const coverageScore = required.length ? (directMatches.length / required.length) * 55 : 20;
  const complementScore = required.length ? (complementaryMatches.length / required.length) * 25 : 10;
  const experienceScore = Math.min(((student.projects || 0) * 4) + ((student.hackathons_won || 0) * 5), 14);
  const diversityScore =
    (student.department && currentUser?.department && student.department !== currentUser.department ? 3 : 0) +
    (student.year && currentUser?.year && student.year !== currentUser.year ? 3 : 0);
  const availabilityScore = student.available === false ? -100 : 8;
  const overlapPenalty = Math.min(sharedMatches.length * 1.5, 6);

  const score = Math.max(
    0,
    Math.round(coverageScore + complementScore + experienceScore + diversityScore + availabilityScore - overlapPenalty)
  );

  const reasons = [];
  if (directMatches.length) reasons.push(`Matches ${directMatches.slice(0, 3).join(', ')}`);
  if (complementaryMatches.length) reasons.push(`Adds ${complementaryMatches.slice(0, 3).join(', ')} to your team`);
  if (student.available !== false) reasons.push('Marked available');
  if (student.projects > 0) reasons.push(`${student.projects} project${student.projects === 1 ? '' : 's'} listed`);

  return {
    ...student,
    score,
    matchedSkills: directMatches,
    complementarySkills: complementaryMatches,
    reasons: reasons.slice(0, 3),
  };
}

export function recommendStudents(students, currentUser, requiredSkills, limit = 8) {
  return students
    .filter((student) => student.id !== currentUser?.id && student.available !== false)
    .map((student) => scoreStudentForTeam(student, currentUser, requiredSkills))
    .filter((student) => student.score > 0)
    .sort((a, b) => b.score - a.score || (b.matchedSkills?.length || 0) - (a.matchedSkills?.length || 0))
    .slice(0, limit);
}

export function buildSuggestedTeam(recommendedStudents, currentUser, requiredSkills, teamSize = 4) {
  const picked = [];
  const covered = new Set(uniqueSkills(currentUser?.skills || []).filter((skill) => requiredSkills.includes(skill)));

  recommendedStudents.forEach((student) => {
    if (picked.length >= Math.max(teamSize - 1, 1)) return;
    const addsNewSkill = student.matchedSkills.some((skill) => !covered.has(skill));
    if (addsNewSkill || picked.length < 2) {
      picked.push(student);
      student.matchedSkills.forEach((skill) => covered.add(skill));
    }
  });

  const missingSkills = uniqueSkills(requiredSkills).filter((skill) => !covered.has(skill));
  const coverage = requiredSkills.length ? Math.round((covered.size / requiredSkills.length) * 100) : 100;

  return {
    members: picked,
    coverage: Math.min(coverage, 100),
    missingSkills,
  };
}
