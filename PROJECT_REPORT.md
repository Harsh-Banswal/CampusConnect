# CampusConnect — Full Project Report

> **Author:** Harsh Banswal
> **Project Type:** Full-Stack Web Application
> **Tech Stack:** React, Vite, Supabase, Tailwind CSS, Vercel
> **Repository:** [github.com/Harsh-Banswal/CampusConnect](https://github.com/Harsh-Banswal/CampusConnect)

---

## Table of Contents

1. [What Is CampusConnect?](#1-what-is-campusconnect)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [Why This Project Is Needed](#3-why-this-project-is-needed)
4. [Tech Stack — Choices and Justification](#4-tech-stack--choices-and-justification)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [Authentication & Role-Based Access Control](#7-authentication--role-based-access-control)
8. [Feature Deep-Dive](#8-feature-deep-dive)
   - [8.1 Landing Page](#81-landing-page)
   - [8.2 Registration System (Multi-Step)](#82-registration-system-multi-step)
   - [8.3 Event Management](#83-event-management)
   - [8.4 Club Management System](#84-club-management-system)
   - [8.5 Developer Directory](#85-developer-directory)
   - [8.6 Real-Time Chat](#86-real-time-chat)
   - [8.7 AI-Powered Team Builder](#87-ai-powered-team-builder)
   - [8.8 AI Campus Assistant (Floating Chatbot)](#88-ai-campus-assistant-floating-chatbot)
   - [8.9 Connections System](#89-connections-system)
   - [8.10 Student Profile System](#810-student-profile-system)
   - [8.11 Club Admin Dashboard](#811-club-admin-dashboard)
   - [8.12 System Admin Dashboard](#812-system-admin-dashboard)
9. [How I Built It — The Development Journey](#9-how-i-built-it--the-development-journey)
10. [Deployment](#10-deployment)
11. [Challenges Faced & How I Solved Them](#11-challenges-faced--how-i-solved-them)

---

## 1. What Is CampusConnect?

CampusConnect is a **full-stack, production-ready university social platform** that unifies every aspect of student digital life into a single web application. It is designed specifically for college and university environments, acting as a bridge between students, clubs, developers, and administrators.

Think of it as a combination of:
- **LinkedIn** (developer profiles, connections, skills)
- **Eventbrite** (event discovery and registration)
- **Discord** (real-time messaging and group chats)
- **GitHub** (team building around technical skills)

…all scoped to your specific college campus, with an AI layer on top that makes personalized recommendations.

The platform supports three distinct user types — **Students**, **Club Admins**, and **System Admins** — each with their own capabilities, dashboards, and access controls. The application is fully responsive, supports dark and light modes, and is deployed live on Vercel with a PostgreSQL backend powered by Supabase.

---

## 2. The Problem It Solves

Before CampusConnect, a typical university student would have to:

| Action | Tool Used |
|---|---|
| Find upcoming events | Check college WhatsApp groups or notice boards |
| Register for an event | Fill a Google Form |
| Find a hackathon partner | Ask randomly in department groups |
| Know which clubs exist | Browse through Instagram pages one by one |
| Message a classmate | Open WhatsApp or SMS |
| View a peer's skills | No structured platform existed |
| Admin manage event participants | Use Google Sheets manually |

This is **fragmented, unscalable, and inefficient.** Students miss events. Club admins manually track everything. Developer collaborations don't happen because there's no discovery mechanism.

CampusConnect solves all of this in one unified platform.

---

## 3. Why This Project Is Needed

### For Students:
- Discover events relevant to their skills without searching across platforms
- Build a rich developer profile to attract collaborators
- Find the right teammate for hackathons using AI matching
- Chat with peers and team groups directly in the app
- Track their registrations, connections, and profile all in one place

### For Club Admins:
- Create and manage campus events with a proper dashboard
- View registered participants in real time
- Add or remove participants and manage event capacity
- Get visibility over their club's activity

### For the College Ecosystem:
- Centralizes campus activity data into a structured database
- Enables data-driven decisions (which events are popular, which skills are in demand)
- Builds a record of student engagement and participation
- Reduces administrative overhead through automation (database triggers, RLS)

---

## 4. Tech Stack — Choices and Justification

### Frontend: **React (v18) + Vite**

**Why React?**
React is the industry-standard choice for building complex, stateful UIs with component reusability. The platform has many interactive views — event cards, chat windows, profile pages, admin dashboards — that all benefit from React's component model and virtual DOM for efficient re-rendering.

**Why Vite over Create React App?**
Vite offers near-instant hot module replacement (HMR) during development and produces significantly smaller, faster production bundles compared to webpack-based CRA. For a project of this size, the developer experience improvement was massive.

### Styling: **Tailwind CSS + PostCSS**

**Why Tailwind?**
Tailwind's utility-first approach allows rapid UI development without writing separate CSS files. Every component's style lives right next to its logic, reducing context switching. The `dark:` variant prefix made implementing the dark/light theme toggle trivial. PostCSS was included as Tailwind's required build tool.

### Backend/Database: **Supabase (PostgreSQL)**

**Why Supabase?**
Supabase is an open-source Firebase alternative built on PostgreSQL. It was chosen for several critical reasons:
- **PostgreSQL** — A production-grade relational database that handles complex queries, joins, and relationships correctly.
- **Built-in Auth** — Supabase Auth provided JWT-based authentication with email/password signup, session management, and `onAuthStateChange` listeners out of the box. No need to build auth from scratch.
- **Row Level Security (RLS)** — PostgreSQL's native RLS lets us enforce security policies at the database level, meaning even if someone bypasses the frontend, they cannot read or write data they don't own.
- **Real-time Subscriptions** — Supabase uses Postgres LISTEN/NOTIFY under the hood to push real-time updates to the frontend over WebSockets. This powers the live chat feature.
- **Storage** — Supabase Storage was used for avatar and image uploads, integrated directly with the auth system.

### Icons: **Lucide React**
Lucide provides a consistent, lightweight SVG icon set that integrates natively into React. Every icon in the UI is from Lucide, keeping the visual language consistent.

### Routing: **React Router v6**
React Router's declarative routing API was used to manage all 16 page routes, including protected routes with custom `PrivateRoute`, `AdminRoute`, and `SystemAdminRoute` guard components.

### State Management: **React Context API**
Three custom contexts were built:
- `AuthContext` — Manages user session and profile state globally
- `ThemeContext` — Manages dark/light mode preference, persisted to localStorage
- `ToastContext` — Global notification system for success/error/info messages

### Deployment: **Vercel**
Vercel was chosen for deployment because it provides zero-configuration CI/CD with GitHub, supports SPA routing via a `vercel.json` rewrite rule, and is completely free for personal projects. Every `git push` to `main` triggers an automatic production deployment.

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (CDN)                      │
│         Hosts the compiled React static build        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│               REACT APPLICATION (SPA)                │
│                                                      │
│  ThemeProvider → AuthProvider → ToastProvider        │
│         ↓                                            │
│    AppContent (reads user from AuthContext)          │
│         ↓                                            │
│    BrowserRouter → 16 Routes                         │
│         ↓                                            │
│   Layout (Navbar + Page + Footer + FloatingChatbot)  │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS Client (HTTPS + WS)
┌──────────────────────▼──────────────────────────────┐
│                  SUPABASE                            │
│                                                      │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth Service│  │ PostgreSQL│  │  Realtime Sub. │  │
│  │  (JWT)      │  │  Database │  │  (WebSockets)  │  │
│  └─────────────┘  └──────────┘  └────────────────┘  │
│                   ┌──────────┐                       │
│                   │  Storage │                       │
│                   │ (Avatars)│                       │
│                   └──────────┘                       │
└─────────────────────────────────────────────────────┘
```

The app is a **Single Page Application (SPA)**. All routing happens on the client. The `vercel.json` file rewrites all URL requests to `index.html`, allowing React Router to handle navigation:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 6. Database Design

The Supabase PostgreSQL database is structured around these core tables:

| Table | Purpose |
|---|---|
| `profiles` | Extended user data (name, department, year, skills, bio, role, avatar) |
| `events` | Campus events (title, date, time, venue, category, capacity, tags) |
| `event_registrations` | Junction table mapping users to events they registered for |
| `clubs` | Club records (name, description, owner_id, status: pending/approved) |
| `conversations` | Chat conversation metadata (type: direct/group, name) |
| `conversation_members` | Junction table: which users are in which conversations |
| `messages` | Individual chat messages (sender, content, conversation_id, timestamp) |
| `connections` | Peer connections between students (status: pending/accepted) |

**Row Level Security (RLS)** is enabled on all tables. Key policies:
- Users can only read their own profile or public profiles
- Only authenticated users can insert event registrations
- Only the event owner (club admin) can update or delete events
- Chat messages are only readable by members of that conversation
- Club creation is only allowed as `status: 'pending'` from the frontend

---

## 7. Authentication & Role-Based Access Control

### How Authentication Works

1. User submits the registration form.
2. `supabase.auth.signUp()` creates an entry in Supabase's internal `auth.users` table and returns a JWT.
3. Simultaneously, the frontend inserts a row into the public `profiles` table with the user's extended data (name, department, year, enrollment number) and their initial role.
4. The `AuthContext` listens to `supabase.auth.onAuthStateChange()`. When the session changes (login, logout, page refresh), it automatically fetches the user's profile from the `profiles` table and merges it with the auth user object.
5. The merged object (containing `user.role`) is stored in React state and made available globally via `useAuth()`.

### Role System

| Role | How Obtained | Capabilities |
|---|---|---|
| `student` | Default on registration | View events, register, chat, connect, use AI |
| `club_admin` | System admin approves club request | All student powers + create/manage events, view participants |
| `admin` | Manually set in DB | Full access + approve/reject club requests, promote users |

### Route Guards

Three custom React components wrap protected routes:

```jsx
// Only logged-in users
function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

// Only club admins
function AdminRoute({ user, children }) {
  return user?.role === 'club_admin' ? children : <Navigate to="/events" replace />;
}

// Only the system admin
function SystemAdminRoute({ user, children }) {
  return user?.role === 'admin' ? children : <Navigate to="/events" replace />;
}
```

---

## 8. Feature Deep-Dive

### 8.1 Landing Page

The landing page (`LandingPage.jsx`) is the public face of the application.

**How it works:**
- A large hero section with a call-to-action (Sign Up / Explore Events) is displayed.
- Feature cards describe the platform's key capabilities.
- The page is fully responsive and renders correctly without requiring a logged-in user.
- When a logged-in user visits `/`, the route remains accessible but the Navbar changes to show the authenticated navigation options.

---

### 8.2 Registration System (Multi-Step)

The registration page (`RegisterPage.jsx`) implements a **2-step multi-page form.**

**Step 1 — Account Details:**
Fields collected: Full Name, College Email, Password, Enrollment Number, Batch, Department (dropdown), Year (dropdown), and Role (Student or Club Admin radio buttons).

**Step 2 — Club Details (Club Admin only):**
If the user selects "Club Admin" as their role, the form advances to Step 2 where they provide: Club Name, College/Department, and a Description.

**How the submission works:**
1. `supabase.auth.signUp()` is called with the email/password and extra metadata.
2. The `profiles` table is upserted with role set to `'student'` — always. Even if someone registers as a Club Admin, they start as a student until approved.
3. If Club Admin, a record is inserted into the `clubs` table with `status: 'pending'`.
4. The system admin reviews the request in their dashboard and can approve it, which promotes the user's role in `profiles` to `'club_admin'`.

This prevents anyone from gaining elevated privileges without admin approval.

---

### 8.3 Event Management

**For Students (`EventsPage.jsx`, `EventDetailPage.jsx`):**
- Students can browse all events sorted by date.
- Each event card shows the title, date, venue, category badge, available seats, and a registration button.
- Clicking an event opens the detail page, which shows the full description, tags, and a prominent Register/Unregister button.
- Seat counts are calculated live from the database: `max_seats - count(event_registrations)`.
- Events can be filtered by category (Hackathon, Workshop, Seminar, etc.).

**For Club Admins (`DashboardPage.jsx`, `CreateEventPage.jsx`):**
- Club admins have a full-featured event creation form with fields for title, description, date, time, venue, category, tags, max seats, and registration deadline.
- The admin dashboard shows all events created by that admin.
- Clicking an event in the dashboard opens an in-page participant management view: a searchable table of all registered students with their enrollment numbers, departments, and years.
- Admins can **manually add** participants (by email lookup) and **remove** participants from events.
- The participant data is pulled live from the `event_registrations` table joined with `profiles`.

---

### 8.4 Club Management System

**How clubs are created:**
1. A user registers as Club Admin and provides club details (see 8.2).
2. The club appears in the System Admin dashboard with `status: 'pending'`.
3. The System Admin reviews and approves or rejects the club.
4. On approval, a Supabase database trigger (or admin action) updates the user's role in `profiles` to `'club_admin'`.

**Club Directory (`ClubsPage.jsx`):**
- All approved clubs are displayed in a card grid.
- Each card shows the club name, description, and college.
- Students can browse and discover clubs they want to engage with.

---

### 8.5 Developer Directory

**`DevelopersPage.jsx`** is a searchable directory of all students who have built out their profiles.

**How it works:**
- Fetches all `profiles` from Supabase with relevant fields (name, skills, department, year, bio, avatar, projects, hackathons_won, available).
- Renders each student as a `DeveloperCard` component.
- Includes a live search bar that filters by name, skill, or department without any additional database queries (client-side filtering for speed).
- Has skill-based tag filtering: click a skill tag to see only students with that skill.
- Shows availability badges so users know who is open to collaborating.
- Each card links to the student's full profile view page (`/profile/:id`).

---

### 8.6 Real-Time Chat

**`ChatPage.jsx`** is the most complex component in the application (~34KB), implementing a full messaging system.

**Features:**
- **Direct Messages (DM):** One-on-one conversations between two users.
- **Group Chats:** Named group conversations with multiple members.
- **Emoji Picker:** Integrated `emoji-picker-react` library for emoji insertion.
- **Real-Time Delivery:** Messages appear instantly for all members without refreshing.

**How Real-Time Works:**
Supabase Realtime is used. The component subscribes to changes on the `messages` table filtered by `conversation_id`:

```js
supabase
  .channel(`room:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
  .subscribe();
```

When any user in the conversation sends a message:
1. The message is `INSERT`ed into the `messages` table.
2. Supabase's Realtime engine detects the INSERT via PostgreSQL's NOTIFY mechanism.
3. All subscribed clients receive the new message payload over their WebSocket connection.
4. The frontend appends the message to the chat UI instantly.

**Conversation Management:**
- Creating a new DM checks if a conversation between those two users already exists to avoid duplicates.
- The conversation list sidebar shows the last message and updates in real time.

---

### 8.7 AI-Powered Team Builder

**`AITeamsPage.jsx`** and the `AITeamRecommender.jsx` component implement the team matching engine entirely on the frontend using a custom-built scoring algorithm in `aiTeamMatcher.js`.

**How the Algorithm Works:**

**Step 1: Skill Signal Extraction (`extractSkillSignals`)**
Given an event object (title, category, description, tags), the algorithm tokenizes the text and applies weighted scoring:
- Tags get weight **4** (most reliable signal)
- Title words get weight **2**
- Category and description words get weight **1**
- Stop words (and, or, the, for, etc.) are filtered out
- Skill aliases normalize variants (e.g., `reactjs → react`, `ml → machine learning`)

The top 10 skills by weighted score are returned as the event's "required skills."

**Step 2: Student Scoring (`scoreStudentForTeam`)**
Each candidate student is scored against the required skills and the current user:

| Component | Max Score | Logic |
|---|---|---|
| Coverage Score | 55 pts | What % of required skills does the candidate have? |
| Complementary Score | 25 pts | What % of required skills does the candidate have that YOU don't? |
| Experience Score | 14 pts | Projects listed × 4 + Hackathons won × 5 |
| Diversity Score | 6 pts | Different department (+3) or different year (+3) |
| Availability Bonus | 8 pts | Student marked as available |
| Overlap Penalty | -6 pts max | Penalizes redundant skills already covered by user |
| Unavailability | -100 pts | Instantly eliminates unavailable students |

**Step 3: Team Building (`buildSuggestedTeam`)**
After ranking all students by score, the team builder greedily picks members who each add at least one new skill not already covered by previously picked members or the user. This ensures skill diversity across the team.

**Step 4: Coverage Report**
The final output shows the team's combined skill coverage percentage and lists any "missing skills" that no team member (including the user) covers. This guides users to recruit specific people.

---

### 8.8 AI Campus Assistant (Floating Chatbot)

**`FloatingAIChatbot.jsx`** is a persistent chatbot widget rendered in the `Layout` component — visible on every page for logged-in users. It pops up as a floating bubble and expands to a chat window.

**`AIAssistantPage.jsx`** is a full-page version of the same assistant with quick-prompt buttons.

**How the AI Works (`campusAssistant.js`):**
Unlike a cloud-based LLM, this AI is entirely **rule-based and runs locally in the browser** — no API calls, no latency, works offline. It uses intent detection (keyword matching) to route questions to specific answer functions:

| User says... | Intent detected | Function called |
|---|---|---|
| "upcoming events" | `upcoming` | `answerUpcoming(events)` |
| "which event fits my skills" | `best_fit` | `answerBestEvents(events, user)` |
| "find teammates", "available" | `team` | `answerTeammates(students, user, events)` |
| "project ideas", "pitch" | `ideas` | `answerIdeas(events, user)` |
| "how should I prepare" | `preparation` | `answerPreparation(events, user)` |
| "my skills" | `skills` | Returns user skill list |

Each function pulls real-time data from the Supabase database (events, student profiles) to generate personalized answers. For example, `answerBestEvents` re-uses the same `scoreEventForUser` function from the team builder to rank events by their fit percentage for that specific user.

The `IDEA_BANK` contains curated project ideas categorized by event type (Hackathon, Workshop, Seminar, etc.) that are personalized with the user's own skills.

---

### 8.9 Connections System

**`ConnectionsPage.jsx`** implements a LinkedIn-style connection/follow system.

**How it works:**
- Users can browse the developer directory and send a connection request.
- A `connections` table stores pairs of `(requester_id, receiver_id, status)`.
- Status can be `pending` or `accepted`.
- Users see a "Connections" tab showing accepted connections and a "Requests" tab for pending ones.
- Accepting a request updates the row's status to `'accepted'`.
- The `ProfileViewPage.jsx` shows the connection status contextually (Connect / Pending / Connected) based on what exists in the `connections` table for that pair of users.

---

### 8.10 Student Profile System

**`ProfilePage.jsx`** is the largest file in the project (~40KB) — a fully editable, feature-rich profile page.

**Profile sections a student can fill out:**
- **Basic Info:** Name, bio, avatar (image upload to Supabase Storage)
- **Academic Info:** Department, year, enrollment number, batch
- **Skills:** Comma-separated tags with live preview
- **Social Links:** GitHub, LinkedIn, portfolio website
- **Stats:** Number of projects completed, hackathons won
- **Availability:** Toggle for "open to collaborate"

**`ProfileViewPage.jsx`** is the read-only view seen when visiting another user's profile at `/profile/:id`. It shows all public information, a connect button (integrated with the connections system), and a "Start Chat" button that creates a DM conversation and redirects to the chat page.

---

### 8.11 Club Admin Dashboard

**`DashboardPage.jsx`** serves as the command center for club admins. It has:

- **Event Statistics:** Total events created, total registrations across all events.
- **Event List:** A table of all events owned by the admin with edit/delete options.
- **Participant Management:** When an event is selected, a sidebar panel opens showing:
  - A searchable list of all registered participants
  - Each participant's enrollment number, department, and year
  - Button to remove a participant (deletes from `event_registrations`)
  - Button to add a participant manually by email lookup

---

### 8.12 System Admin Dashboard

**`SystemAdminDashboard.jsx`** is only accessible to users with `role === 'admin'`, enforced by the `SystemAdminRoute` guard.

**Capabilities:**
- View all pending club requests (from the `clubs` table where `status = 'pending'`)
- Approve a club request — updates the club's `status` to `'approved'` and the owner's `role` in `profiles` to `'club_admin'`
- Reject a club request — updates `status` to `'rejected'`
- View the full list of all registered users on the platform

This is how the privilege elevation system is controlled entirely within the application without needing direct database access.

---

## 9. How I Built It — The Development Journey

### Phase 1: Foundation
Started by setting up the project with `npm create vite@latest` and configuring Tailwind CSS, PostCSS, and ESLint. Created the project folder structure: `pages/`, `components/`, `context/`, `lib/`, `data/`.

### Phase 2: Supabase Integration
Created a Supabase project, designed the initial database schema, and wrote the SQL scripts (saved in `sql/`) for table creation, RLS policies, and triggers. Connected the frontend via the Supabase JS client initialized in `src/lib/supabase.js`.

### Phase 3: Authentication
Built `AuthContext.jsx` with session persistence, `LoginPage.jsx`, and the multi-step `RegisterPage.jsx`. Implemented the role system with the `profiles` table.

### Phase 4: Core Pages
Built the main feature pages one at a time — Events → Event Detail → Developer Directory → Profile → Chat. Each page was first built with static/mock data, then progressively connected to live Supabase queries.

### Phase 5: Admin Features
Built the Club Admin Dashboard with participant management and the System Admin Dashboard with club approval workflows.

### Phase 6: AI Features
Built the `aiTeamMatcher.js` scoring engine from scratch, then wired it up to `AITeamsPage.jsx`. Then built the `campusAssistant.js` intent-routing chatbot and created both the floating widget and the full-page assistant.

### Phase 7: Polish & Connections
Added the Connections system, ProfileViewPage, dark/light theme toggle via ThemeContext, the global Toast notification system, and the Floating AI chatbot visible across all pages.

### Phase 8: Deployment
Configured `vercel.json` for SPA routing, pushed the project to GitHub, imported into Vercel, and added environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel dashboard.

---

## 10. Deployment

The application is deployed as a **static SPA on Vercel** with the Supabase cloud backend handling all data and auth.

**`vercel.json` — SPA Routing Fix:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
Without this, navigating to `/events` directly would result in a 404 from Vercel's CDN, since there is no actual `/events/index.html` file — React Router handles that route entirely client-side.

**Environment Variables configured in Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 11. Challenges Faced & How I Solved Them

| Challenge | Solution |
|---|---|
| Registration race condition: profile not yet created when user tries to access it | Used `.upsert()` with `onConflict: 'id'` and added loading state in `AuthContext` before rendering children |
| `Permission denied` on `npm run dev` after copying project files | Ran `chmod +x node_modules/.bin/*` to restore executable permissions |
| `@rollup/rollup-linux-x64-gnu` missing error | Deleted `node_modules` and `package-lock.json`, then ran clean `npm install` |
| SPA routing 404 on page refresh in production | Added `vercel.json` with catch-all rewrite rule |
| Real-time chat not updating for all users | Implemented Supabase Realtime channel subscription with `postgres_changes` event listener |
| Preventing privilege escalation | Club admin role starts as `'student'`, elevated only by system admin in database; RLS prevents direct DB manipulation |
| Git remote pointing to original collaborator's repo | Used `git remote set-url origin <new-url>` to redirect to personal repository |

---

*This report was prepared to document the complete architecture, feature set, and development process of the CampusConnect platform.*
