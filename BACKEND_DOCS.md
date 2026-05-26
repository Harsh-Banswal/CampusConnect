# CampusConnect — Backend Architecture Documentation

## 1. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Database | Supabase (PostgreSQL) | Managed Postgres with built-in auth, RLS, storage, and realtime |
| Auth | Supabase Auth (JWT) | Email/password auth with session management out of the box |
| Client SDK | `@supabase/supabase-js` | Official JS client; handles REST + Realtime subscriptions |
| Storage | Supabase Storage (S3-compatible) | File/image uploads without a separate service |
| Realtime | Supabase Realtime (WebSocket) | Push-based live updates via PostgreSQL replication slots |
| AI Logic | Pure JS (no external API) | Skill matching and campus assistant run entirely client-side |

### Alternatives Considered
- **Firebase** — NoSQL, harder to query relational data (events+registrations+profiles)
- **Node.js + Express + MongoDB** — Requires a dedicated server; overkill for this scale
- **PocketBase** — Lightweight but lacks Supabase's Auth and Realtime maturity

---

## 2. Supabase Client Initialization (`src/lib/supabase.js`)

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Why:** A single client instance is exported and imported across all pages/services. The `anon` key is safe to expose publicly because Row Level Security (RLS) enforces access control at the database level.

**Environment Variables:**
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 3. Authentication (`src/context/AuthContext.jsx`)

### How It Works
```jsx
supabase.auth.getSession()       // Load existing JWT session on app start
supabase.auth.onAuthStateChange()// React to login/logout events
supabase.from('profiles').select('*').eq('id', user.id).single() // Hydrate custom profile data
```

### Flow
1. On mount, `getSession()` reads the JWT from `localStorage`
2. The profile row from `public.profiles` is fetched and merged onto the auth user object
3. `onAuthStateChange` re-runs this whenever the user logs in or out
4. The merged `user` object (includes `role`, `skills`, `department`, etc.) is placed in React Context

### Why React Context?
- Avoids prop drilling `user` through every component
- Alternatives: Zustand, Redux — unnecessary complexity for a single global user state

### Registration (`pages/RegisterPage.jsx`)
```js
// Step 1: Create auth record
await supabase.auth.signUp({ email, password, options: { data: { name, role, ... } } });

// Step 2: Insert public profile (always starts as 'student')
await supabase.from('profiles').upsert([{ id: user.id, name, email, role: 'student', ... }]);

// Step 3 (Club Admin only): Insert pending club request
await supabase.from('clubs').insert([{ name, college, description, owner_id: user.id, status: 'pending' }]);
```

**Role Escalation:** A `club_admin` registrant starts with `role: 'student'`. The system admin reviews and manually updates the profile `role` field to `'club_admin'` upon approval.

---

## 4. Database Schema (`sql/01_tables.sql`)

### 4.1 `profiles`
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'club_admin', 'admin')),
    department TEXT, year TEXT, location TEXT, bio TEXT, avatar TEXT,
    github TEXT, linkedin TEXT,
    skills TEXT[] DEFAULT '{}',
    events_attended INT DEFAULT 0,
    hackathons_won INT DEFAULT 0,
    enrollment_no TEXT,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
```
- `id` is the same UUID as `auth.users`, creating a 1:1 link
- `skills TEXT[]` — PostgreSQL native array; queried with `@>` (contains) or `.contains()`
- `available` — drives AI teammate matching

### 4.2 `events` & `event_registrations`
```sql
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('Hackathon','Workshop','Seminar','Meetup','Other')),
    date DATE NOT NULL, time TIME NOT NULL, venue TEXT NOT NULL,
    max_seats INT NOT NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available','closed','cancelled')),
    participation_mode TEXT DEFAULT 'solo',
    required_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_type TEXT DEFAULT 'solo',
    registration_data JSONB DEFAULT '{}'::jsonb,   -- stores team members, captain info
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, profile_id)  -- prevents double registration
);
```

- `JSONB` for `registration_data` stores flexible team registration details (captain, members array) without extra tables
- `UNIQUE(event_id, profile_id)` enforces one-registration-per-user at DB level
- `ON DELETE CASCADE` auto-cleans registrations when an event is deleted

### 4.3 Chat System
```sql
CREATE TABLE public.conversations (id, is_group, name, created_by, last_message, updated_at);
CREATE TABLE public.conversation_participants (conversation_id, profile_id, unread_count, last_read_at);
CREATE TABLE public.messages (id, conversation_id, sender_id, content, created_at);

-- Enable Realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

- `REPLICA IDENTITY FULL` sends the full old row on UPDATE/DELETE to Realtime subscribers
- `unread_count` per participant is maintained by a database trigger (see Section 6)

### 4.4 Connection Requests
```sql
CREATE TABLE public.connection_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    UNIQUE(requester_id, recipient_id)  -- prevents duplicate requests
);

CREATE INDEX idx_connection_requests_recipient ON public.connection_requests(recipient_id);
CREATE INDEX idx_connection_requests_requester ON public.connection_requests(requester_id);
```

- Indexes on both FK columns for fast "find all my connections" queries
- Chat is only enabled after `status = 'accepted'`

### 4.5 Clubs & Teams
```sql
CREATE TABLE public.clubs (
    id UUID, name, college, description,
    status TEXT CHECK (status IN ('pending','approved','rejected')),
    owner_id UUID REFERENCES profiles(id),
    invite_code TEXT UNIQUE
);

CREATE TABLE public.teams (
    id UUID, name, owner_id, event_id, team_type, required_skills TEXT[]
);
CREATE TABLE public.team_members (
    team_id, profile_id, role, status TEXT CHECK (status IN ('invited','accepted','declined')),
    UNIQUE(team_id, profile_id)
);
```

---

## 5. Row Level Security (`sql/03_policies.sql`)

RLS is enabled on **every table**. Policies use `auth.uid()` — the JWT subject of the logged-in user.

### Why RLS?
- The Supabase `anon` key is public. Without RLS, anyone could read/write any row.
- RLS moves authorization into the database, making it impossible to bypass via direct API calls.
- **Alternative:** Server-side middleware (Express) — requires a dedicated backend server.

### Key Patterns

```sql
-- Public read, own-write pattern (profiles)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Role-based write (events — only club_admin/admin can create)
CREATE POLICY "Organizers and admins can insert events"
  ON public.events FOR INSERT WITH CHECK (
    auth.uid() = organizer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','club_admin'))
  );

-- Participant-scoped read (messages — only conversation members can read)
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

-- Private data (bookmarks — only owner sees their own)
CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT USING (auth.uid() = profile_id);
```

### Infinite Recursion Fix
Naïve policies on `conversations` that query `conversation_participants` would recursively trigger each other. The fix is a `SECURITY DEFINER` function that bypasses RLS internally:

```sql
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- runs as DB owner, not caller
```

---

## 6. Database Functions & Triggers (`sql/02_functions.sql`)

### 6.1 Auto-increment Unread Count
```sql
CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
      AND profile_id != NEW.sender_id;  -- exclude the sender
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();
```

**Why a trigger?** The client that sends a message cannot reliably update other participants' counts (it would require knowing all participants and bypassing their RLS). A server-side trigger runs atomically.

**Alternative:** Supabase Edge Functions (Deno) — works but adds cold-start latency.

### 6.2 Secure Account Deletion
```sql
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Clients cannot directly modify `auth.users`. This `SECURITY DEFINER` function runs as the DB owner and cascades to `public.profiles` via the FK.

---

## 7. Realtime Chat (`pages/ChatPage.jsx`)

### Subscription Pattern
```js
// Listen for new messages in active conversation
const channel = supabase
  .channel(`chat_${activeConv.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${activeConv.id}`  // server-side filter
  }, (payload) => {
    setMessages(prev => [...prev, formatMessage(payload.new)]);
  })
  .subscribe();

// Cleanup on unmount / conversation change
return () => supabase.removeChannel(channel);
```

### Send Message Flow
```js
// 1. Insert message row
const { data } = await supabase.from('messages').insert([{
  conversation_id: activeConv.id,
  sender_id: user.id,
  content: text
}]).select().single();

// 2. Update conversation's last_message (for sidebar preview)
await supabase.from('conversations')
  .update({ last_message: text, updated_at: new Date().toISOString() })
  .eq('id', activeConv.id);
```

The trigger from Section 6.1 fires automatically on step 1 to increment unread counts for all other participants.

### Why not polling?
Realtime WebSocket = instant push. Polling would require `setInterval` + network overhead every N seconds.

---

## 8. File Uploads (`src/lib/uploadService.js`)

```js
export async function uploadFile(file, bucket, userId) {
  // 1. Validate type and size (max 5MB, images only)
  const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowedTypes.includes(file.type)) return { error: 'Only images allowed' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Max 5MB' };

  // 2. Generate unique filename (userId + timestamp + random suffix)
  const filename = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

  // 3. Upload to Supabase Storage bucket
  const { error } = await supabase.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: false   // fail if name collision (won't happen due to random suffix)
  });

  // 4. Get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return { url: data.publicUrl, error: null };
}
```

**Buckets used:**
- `profile-photos` — user avatars
- `event-banners` — event cover images

**Alternative:** Cloudinary — more features (transformations), but external dependency and API key management.

---

## 9. AI Team Matcher (`src/lib/aiTeamMatcher.js`)

No external API — pure JavaScript scoring algorithm.

### Skill Normalization
```js
const SKILL_ALIASES = { js: 'javascript', reactjs: 'react', ml: 'machine learning', ... };

function normalizeSkill(value) {
  return String(value).trim().toLowerCase().replace(/[#.]/g, '').replace(/\s+/g, ' ');
}
function canonicalSkill(value) {
  const n = normalizeSkill(value);
  return SKILL_ALIASES[n] || n;  // map aliases to canonical form
}
```

### Skill Signal Extraction (from event metadata)
```js
export function extractSkillSignals({ title, category, description, tags, explicitSkills }) {
  const weighted = new Map();
  explicitSkills.forEach(s => add(s, 5)); // highest weight
  tags.forEach(s => add(s, 4));
  tokenize(title).forEach(s => add(s, 2));
  tokenize(category).forEach(s => add(s, 1));
  tokenize(description).forEach(s => add(s, 1));
  return Array.from(weighted.entries()).sort((a,b) => b[1]-a[1]).slice(0,10).map(([s]) => s);
}
```

### Student Scoring Formula
```js
export function scoreStudentForTeam(student, currentUser, requiredSkills) {
  const coverageScore   = (directMatches.length / required.length) * 55;  // how many required skills they cover
  const complementScore = (complementaryMatches.length / required.length) * 25; // skills YOU don't have
  const experienceScore = Math.min((projects * 4) + (hackathons_won * 5), 14);
  const diversityScore  = (differentDept ? 3 : 0) + (differentYear ? 3 : 0);
  const availabilityScore = student.available === false ? -100 : 8;  // hard filter
  const overlapPenalty  = Math.min(sharedSkillsWithUser * 1.5, 6);  // penalize redundancy

  return Math.max(0, Math.round(coverageScore + complementScore + experienceScore + diversityScore + availabilityScore - overlapPenalty));
}
```

**Why client-side AI?** Zero latency, no API costs, works offline. The dataset (campus students) is small enough that O(n) scoring is instant.

---

## 10. Campus AI Assistant (`src/lib/campusAssistant.js`)

A rule-based NLP chatbot (no LLM) that runs entirely in the browser.

### Intent Detection
```js
export function answerCampusQuestion(question, context) {
  const q = question.toLowerCase();
  if (q.includes('upcoming') || q.includes('events'))  return answerUpcoming(events);
  if (q.includes('team') || q.includes('teammate'))    return answerTeammates(students, user, events);
  if (q.includes('idea') || q.includes('project'))     return answerIdeas(events, user);
  if (q.includes('prepare') || q.includes('how should')) return answerPreparation(events, user);
  if (q.includes('skill') || q.includes('profile'))   return answerSkills(user);
  return answerHelp();
}
```

### Event-Skill Fit Score
```js
function scoreEventForUser(event, user) {
  const signals = extractSkillSignals(event);  // reuses aiTeamMatcher
  const matched = signals.filter(s => userSkills.includes(s));
  const categoryBoost = event.category === 'Hackathon' ? 8 : 6;
  const seatBoost = seatsLeft > 0 ? 8 : -20;
  return Math.min(100, Math.round((matched.length / signals.length) * 70 + categoryBoost + seatBoost));
}
```

**Alternative:** OpenAI API — would provide better NLP understanding but costs money per query and requires a server proxy to hide the API key.

---

## 11. Route Guards (`src/App.jsx`)

```jsx
function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}
function AdminRoute({ user, children }) {
  return user?.role === 'club_admin' ? children : <Navigate to="/events" replace />;
}
function SystemAdminRoute({ user, children }) {
  return user?.role === 'admin' ? children : <Navigate to="/events" replace />;
}
```

- **PrivateRoute** — requires any logged-in user
- **AdminRoute** — gates `/create-event` to `club_admin` only
- **SystemAdminRoute** — gates `/admin` to `admin` only
- Role is read from `public.profiles.role`, not from JWT metadata, so the DB is always the source of truth

---

## 12. Connections & Messaging Flow

```
Student A sends request → connection_requests (status: pending)
Student B accepts       → UPDATE status = 'accepted'
Both can now see "Message" button
Click Message           → navigate('/chat', { state: { startChatWith: userId } })
ChatPage checks existing conversations → if none, INSERT conversation + 2 participants
```

Key query pattern for fetching connections:
```js
const { data } = await supabase
  .from('connection_requests')
  .select('id, requester_id, recipient_id, status, ...')
  .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
// Then batch-fetch profiles for all other-user IDs
```

---

## 13. Dashboard Data Fetching

### Club Admin (Organizer) View
```js
supabase.from('events')
  .select('*, event_registrations(count)')  // nested count via FK
  .eq('organizer_id', user.id)
```

### Student View
```js
// Step 1: get event IDs the student registered for
const { data: regs } = await supabase.from('event_registrations')
  .select('event_id').eq('profile_id', user.id);

// Step 2: fetch event details for those IDs
const { data: events } = await supabase.from('events')
  .select('*, event_registrations(count)').in('id', eventIds);
```

### Participant Management (Admin)
```js
// Fetch with related profile data in one query (Supabase auto-joins via FK)
supabase.from('event_registrations')
  .select('id, profile_id, registration_type, registration_data, profiles(name, avatar, department, enrollment_no, year)')
  .eq('event_id', event.id)
```

---

## 14. Vercel Deployment (`vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Why:** React Router uses client-side routing. Without this rewrite, refreshing `/events/123` would return a 404 from Vercel's edge network. The rewrite sends all paths to `index.html`, letting React Router handle navigation.

---

## 15. Architecture Diagram

```
Browser (React + Vite)
│
├── AuthContext (JWT session via Supabase Auth)
├── Pages / Components
│     ├── Supabase JS Client ──► Supabase REST API (PostgREST)
│     │                               │
│     │                          RLS Policies (PostgreSQL)
│     │                               │
│     │                          public.* tables
│     │
│     ├── Supabase Realtime ──► WebSocket ──► messages / conversations
│     └── Supabase Storage ──► S3-compatible buckets
│
├── src/lib/aiTeamMatcher.js  (client-side scoring — no external API)
└── src/lib/campusAssistant.js (rule-based intent matching)
```

---

## Summary Table

| Feature | Implementation | Key File(s) |
|---|---|---|
| Auth | Supabase JWT + custom profiles table | `AuthContext.jsx`, `LoginPage.jsx`, `RegisterPage.jsx` |
| Database | PostgreSQL via Supabase | `sql/01_tables.sql` |
| Security | Row Level Security policies | `sql/03_policies.sql` |
| Triggers | plpgsql functions (unread counts, user delete) | `sql/02_functions.sql` |
| Realtime Chat | Supabase Realtime WebSocket channels | `ChatPage.jsx` |
| File Upload | Supabase Storage with validation | `uploadService.js` |
| AI Matching | Pure JS weighted skill scoring | `aiTeamMatcher.js` |
| AI Chatbot | Rule-based intent detection | `campusAssistant.js` |
| Route Guards | React component wrappers checking role | `App.jsx` |
| Deployment | Vercel SPA rewrite | `vercel.json` |
