-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- 1. PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- 2. PROJECTS
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = profile_id);


-- 2.5 PAST EVENTS
DROP POLICY IF EXISTS "Public past events are viewable by everyone" ON public.past_events;
CREATE POLICY "Public past events are viewable by everyone" ON public.past_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create past events" ON public.past_events;
CREATE POLICY "Users can create past events" ON public.past_events FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own past events" ON public.past_events;
CREATE POLICY "Users can update own past events" ON public.past_events FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own past events" ON public.past_events;
CREATE POLICY "Users can delete own past events" ON public.past_events FOR DELETE USING (auth.uid() = profile_id);


-- 3. EVENTS
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers and admins can insert events" ON public.events;
CREATE POLICY "Organizers and admins can insert events" ON public.events FOR INSERT 
WITH CHECK (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);

DROP POLICY IF EXISTS "Organizers and admins can update events" ON public.events;
CREATE POLICY "Organizers and admins can update events" ON public.events FOR UPDATE 
USING (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);

DROP POLICY IF EXISTS "Organizers and admins can delete events" ON public.events;
CREATE POLICY "Organizers and admins can delete events" ON public.events FOR DELETE 
USING (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);


-- 4. EVENT REGISTRATIONS
DROP POLICY IF EXISTS "Registrations are viewable by everyone" ON public.event_registrations;
CREATE POLICY "Registrations are viewable by everyone" ON public.event_registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can register themselves" ON public.event_registrations;
CREATE POLICY "Users can register themselves" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can unregister themselves" ON public.event_registrations;
CREATE POLICY "Users can unregister themselves" ON public.event_registrations FOR DELETE USING (auth.uid() = profile_id);


-- 5. BOOKMARKS
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = profile_id);


-- 6. CHAT & MESSAGES
-- Conversations (Fixed infinite recursion)
DROP POLICY IF EXISTS "Conversation participants can view conversations" ON public.conversations;
CREATE POLICY "Conversation participants can view conversations" ON public.conversations FOR SELECT 
USING (created_by = auth.uid() OR public.is_conversation_participant(id));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Conversation participants can update conversations" ON public.conversations;
CREATE POLICY "Conversation participants can update conversations" ON public.conversations FOR UPDATE 
USING (created_by = auth.uid() OR public.is_conversation_participant(id));

DROP POLICY IF EXISTS "Conversation participants can delete conversations" ON public.conversations;
CREATE POLICY "Conversation participants can delete conversations" ON public.conversations FOR DELETE 
USING (created_by = auth.uid() OR public.is_conversation_participant(id));

-- Conversation Participants (Fixed infinite recursion)
DROP POLICY IF EXISTS "Conversation participants can view participant rows" ON public.conversation_participants;
CREATE POLICY "Conversation participants can view participant rows" ON public.conversation_participants FOR SELECT 
USING (profile_id = auth.uid() OR public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation creators can add participants" ON public.conversation_participants FOR INSERT 
WITH CHECK (auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_participants.conversation_id AND c.created_by = auth.uid()));

DROP POLICY IF EXISTS "Conversation participants can update participant rows" ON public.conversation_participants;
CREATE POLICY "Conversation participants can update participant rows" ON public.conversation_participants FOR UPDATE 
USING (profile_id = auth.uid() OR public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Conversation participants can delete participant rows" ON public.conversation_participants;
CREATE POLICY "Conversation participants can delete participant rows" ON public.conversation_participants FOR DELETE 
USING (profile_id = auth.uid() OR public.is_conversation_participant(conversation_id));

-- Messages
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT 
USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT 
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));


-- 7. NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = profile_id);


-- 8. CONNECTION REQUESTS
DROP POLICY IF EXISTS "Users can view connection requests involving them" ON public.connection_requests;
CREATE POLICY "Users can view connection requests involving them" ON public.connection_requests FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests" ON public.connection_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update connection requests involving them" ON public.connection_requests;
CREATE POLICY "Users can update connection requests involving them" ON public.connection_requests FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can delete connection requests involving them" ON public.connection_requests;
CREATE POLICY "Users can delete connection requests involving them" ON public.connection_requests FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);


-- 9. TEAMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Students can view teams they belong to') THEN
        CREATE POLICY "Students can view teams they belong to" ON public.teams FOR SELECT USING (
            owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = teams.id AND team_members.profile_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Students can create teams') THEN
        CREATE POLICY "Students can create teams" ON public.teams FOR INSERT WITH CHECK (owner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'Students can view their team memberships') THEN
        CREATE POLICY "Students can view their team memberships" ON public.team_members FOR SELECT USING (
            profile_id = auth.uid() OR EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'Team owners can invite members') THEN
        CREATE POLICY "Team owners can invite members" ON public.team_members FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid())
        );
    END IF;
END $$;
