-- Allow users to read their own notification preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own notification preferences
CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own notification preferences
CREATE POLICY "Users can insert their own notification preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);