-- Enable Supabase Realtime for profiles table so client subscriptions receive row-level UPDATE events
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
