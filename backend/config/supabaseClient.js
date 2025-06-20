

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;


if (!supabaseUrl) {
    console.error("Supabase URL is not defined. Please check your .env file.");
   
    throw new Error("FATAL: Missing environment variable SUPABASE_URL");
}

if (!supabaseAnonKey) {
    console.error("Supabase Anon Key is not defined. Please check your .env file.");
    throw new Error("FATAL: Missing environment variable SUPABASE_ANON_KEY");
}


const supabase = createClient(supabaseUrl, supabaseAnonKey);


export default supabase;

console.log("Supabase client initialized successfully."); 