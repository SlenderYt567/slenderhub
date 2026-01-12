import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrqzpzczhvzrrdsjzqgb.supabase.co';
// Usando a chave fornecida. Se der erro 401, verifique se esta é a chave 'anon' / 'public' em Project Settings > API
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycXpwemN6aHZ6cnJkc2p6cWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjUxNjEsImV4cCI6MjA4Mzc0MTE2MX0.9iMKLDpfwRDM1vP4gEV5IsS1rA4bNsRk08MzW0FAOxM'; 

export const supabase = createClient(supabaseUrl, supabaseKey);
