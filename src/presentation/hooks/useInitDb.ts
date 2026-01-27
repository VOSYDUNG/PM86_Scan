import React from 'react';
import { getDb } from '@/data/sqlite/db';

export function useInitDb(): { ready: boolean; error?: string } {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getDb();
        if (alive) setReady(true);
      } catch (e) {
        if (alive) setError(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ready, error };
}
