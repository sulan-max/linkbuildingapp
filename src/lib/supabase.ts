import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://njtjpbmudwhadozfpkll.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGpwYm11ZHdoYWRvemZwa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzYwMjEsImV4cCI6MjA5MTE1MjAyMX0.5XUVSVKTP28gM-tEfslp-EYWtCpBMtP51ExNd3YVtM4'
)
