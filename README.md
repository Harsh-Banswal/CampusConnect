# CampusConnect

CampusConnect is your ultimate, all-in-one university platform designed to supercharge student life. By seamlessly connecting students, clubs, and developers, CampusConnect transforms the traditional campus ecosystem into a dynamic, digital community. Discover events, build project teams with AI, and engage with campus organizations—all in one place.

## Core Features

- **Event Management**: Discover, register for, and manage campus events with real-time updates and seamless ticketing.
- **Club Hub**: Explore university clubs, join vibrant communities, and stay engaged with the latest campus organizations.
- **Developer Connections**: Connect with fellow developers, share portfolios, and collaborate on exciting projects.
- **Real-Time Chat**: Integrated messaging system with emoji support and group chats to keep in touch with peers and project teams.
- **AI-Powered Team Builder**: Smart team recommendations and matchmaking using integrated AI to help you find the perfect partners for hackathons and academic projects.
- **Modern & Responsive UI**: A sleek, premium, and fully responsive user interface built with Tailwind CSS, supporting elegant dark/light mode themes.

## Tech Stack

- **Frontend**: React (v18), Vite, React Router
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime Subscriptions, Row Level Security)
- **AI Integration**: AI-driven recommendation and matchmaking engine
- **Deployment**: Configured for seamless deployment on Vercel

## Local Development Setup

Follow these steps to run the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Harsh-Banswal/CampusConnect.git
   cd CampusConnect
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the project and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173` to view the application.

## Database Setup (Supabase)

If you are setting up a fresh Supabase project, you can use the SQL scripts provided in the `sql/` directory to create the required tables, triggers, and Row Level Security (RLS) policies.

- `sql/supabase_schema.sql` - Core schema setup
- `sql/add_missing_rls_policies.sql` - Security policies

