import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const run = async () => {
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  console.log({ data, error, count });
};

run();
