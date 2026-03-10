const { createClient } = require('@supabase/supabase-js');

// Use exatamente esta URL que funcionou no seu Chrome
const supabaseUrl = 'https://dcxigqvzpggudziezlva.supabase.co';
// Use a sua Publishable Key (Anon) que aparece na imagem anterior
const supabaseKey = 'sb_publishable_tRo-dHajfEW_hX_1iLcf2Q_Y5q-jMgd'; 

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Evita erros de armazenamento local no Electron
  }
});

module.exports = { supabase };