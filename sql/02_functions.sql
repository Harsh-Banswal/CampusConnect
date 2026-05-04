-- ==========================================
-- 1. CHAT LOGIC: UNREAD COUNTS
-- ==========================================

-- Create a function to increment unread counts for all other participants
CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment unread_count for all participants EXCEPT the sender
    UPDATE public.conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
      AND profile_id != NEW.sender_id;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists to be safe
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;

-- Create the trigger on the messages table
CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_unread_count();


-- ==========================================
-- 2. SECURITY HELPER FUNCTIONS
-- ==========================================

-- Create a SECURITY DEFINER function to check participant status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. USER MANAGEMENT FUNCTIONS
-- ==========================================

-- Function to delete user account securely
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  -- Delete the user from auth.users. 
  -- Assuming cascade deletes on foreign keys, this will clean up their profile.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
