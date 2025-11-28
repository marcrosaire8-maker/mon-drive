import { createClient } from '@supabase/supabase-js' 
// 👆 Vérifie bien que c'est "createClient" ici, et pas "supabase"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// On crée et on exporte la variable "supabase"
export const supabase = createClient(supabaseUrl, supabaseKey)
