import { createClient } from '@supabase/supabase-js';

// ⚠️ SUSTITUYE ESTOS VALORES CON LOS DE TU PROYECTO SUPABASE
// (Están en Supabase -> Settings -> API)
const supabaseUrl = 'https://bmaylrfhbfpwaxiumsbg.supabase.co';
const supabaseKey = 'sb_publishable_R29S578clD9et-bkS2RzMg_kmUi7hJl';

export const supabase = createClient(supabaseUrl, supabaseKey);