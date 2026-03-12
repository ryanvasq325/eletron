const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcxigqvzpggudziezlva.supabase.co';

const supabaseKey = 'sb_publishable_tRo-dHajfEW_hX_1iLcf2Q_Y5q-jMgd'; 

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false 
  }
});

module.exports = { supabase };