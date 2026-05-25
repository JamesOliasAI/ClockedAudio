import { createClient } from '@supabase/supabase-js';
import { getLevelAndProgress } from './gameScience';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are valid and non-empty
export const isLiveMode = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '');

let supabaseInstance = null;

// Log active mode in browser to aid development
if (typeof window !== 'undefined') {
  console.log(`[SupabaseClient] Initializing in ${isLiveMode ? 'LIVE DATABASE MODE' : 'LOCAL FALLBACK MODE'}`);
}

if (isLiveMode) {
  // Use a global singleton pattern to prevent multiple Supabase instances from fighting over navigator.locks during HMR
  const globalForSupabase = typeof window !== 'undefined' ? window : globalThis;
  
  if (!globalForSupabase.__supabaseInstance) {
    // A robust lock implementation that prevents cross-tab race conditions 
    // which cause "Invalid Refresh Token: Already Used", while avoiding the 
    // dreaded HMR infinite hang bug of native navigator.locks.
    const memoryLocks = {};
    const fallbackLock = async (name, fn) => {
      if (!memoryLocks[name]) memoryLocks[name] = Promise.resolve();
      const resultPromise = memoryLocks[name].then(() => fn());
      memoryLocks[name] = resultPromise.catch(() => {});
      return resultPromise;
    };

    const robustLock = async (name, acquireTimeout, fn) => {
      if (typeof navigator === 'undefined' || !navigator.locks) {
        return fallbackLock(name, fn);
      }

      // Try to acquire the native cross-tab lock to sync across tabs
      return new Promise((resolve, reject) => {
        let lockResolved = false;

        const timeoutId = setTimeout(() => {
          if (!lockResolved) {
            console.warn(`[Supabase Auth] Lock "${name}" acquisition timed out. Falling back to memory lock.`);
            lockResolved = true;
            resolve(fallbackLock(name, fn));
          }
        }, 5000); // 5 second max wait for cross-tab lock

        navigator.locks.request(name, { mode: 'exclusive' }, async (lock) => {
          if (lockResolved) return; // if timeout already fired, do nothing with the late lock
          lockResolved = true;
          clearTimeout(timeoutId);
          
          if (lock) {
            try {
              const res = await fn();
              resolve(res);
            } catch (err) {
              reject(err);
            }
          } else {
            resolve(fallbackLock(name, fn));
          }
        }).catch((err) => {
          if (!lockResolved) {
            lockResolved = true;
            clearTimeout(timeoutId);
            resolve(fallbackLock(name, fn));
          }
        });
      });
    };

    globalForSupabase.__supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        lock: robustLock,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  supabaseInstance = globalForSupabase.__supabaseInstance;
} else {
  // --- HIGH-FIDELITY LOCAL STORAGE MOCK STORE FOR LOCAL FALLBACK MODE ---
  const MOCK_STORAGE_KEY = 'clocked_audio_mock_db';

  // Seed default data if not present
  const defaultDb = {
    users: [
      {
        id: 'guest-producer',
        username: 'guest_producer',
        email: 'guest@clockedaudio.io',
        full_name: 'Guest Producer',
        bio: 'Testing the arena coordinates.',
        discord_username: 'guest_producer',
        discord_avatar_url: null,
        link_soundcloud: '',
        link_spotify: '',
        link_twitter: '',
        link_instagram: '',
        total_xp: 120,
        current_level: 1,
        current_rank: 'Bedroom Producer (Bronze I)',
        is_premium: false,
        stripe_customer_id: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-user-111',
        username: 'Beatsmith_Pro',
        email: 'beatsmith@clockedaudio.io',
        full_name: 'Alex Beatsmith',
        bio: 'Cybernetic synth wave manipulator. Ableton Live operator. 808 specialist.',
        discord_username: 'beatsmith#1337',
        discord_avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png',
        link_soundcloud: 'https://soundcloud.com/beatsmith_pro',
        link_spotify: 'https://spotify.com/artist/beatsmith_pro',
        link_twitter: 'https://x.com/beatsmith_pro',
        link_instagram: 'https://instagram.com/beatsmith_pro',
        total_xp: 2420,
        current_level: 5,
        current_rank: 'Garage Hobbyist (Silver I)',
        is_premium: false,
        stripe_customer_id: null,
        created_at: new Date().toISOString()
      }
    ],
    daily_drops: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Midnight Shadows',
        stem_url: 'https://synthesized-stems.s3.amazonaws.com/daily/midnight-shadows.zip',
        release_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }
    ],
    daily_drop_submissions: [
      { id: 'beat-093', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-alpha', audio_url: '/audio/sample1.mp3', created_at: new Date().toISOString() },
      { id: 'beat-412', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-beta', audio_url: '/audio/sample2.mp3', created_at: new Date().toISOString() },
      { id: 'beat-882', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-gamma', audio_url: '/audio/sample3.mp3', created_at: new Date().toISOString() },
      { id: 'beat-105', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-delta', audio_url: '/audio/sample4.mp3', created_at: new Date().toISOString() },
      { id: 'beat-392', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-epsilon', audio_url: '/audio/sample5.mp3', created_at: new Date().toISOString() }
    ],
    daily_drop_attempts: [
      { id: 'attempt-093', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-alpha', created_at: new Date().toISOString() },
      { id: 'attempt-412', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-beta', created_at: new Date().toISOString() },
      { id: 'attempt-882', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-gamma', created_at: new Date().toISOString() },
      { id: 'attempt-105', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-delta', created_at: new Date().toISOString() },
      { id: 'attempt-392', daily_drop_id: '11111111-1111-1111-1111-111111111111', user_id: 'user-epsilon', created_at: new Date().toISOString() }
    ],
    daily_drop_votes: [
      { id: 'vote-1', submission_id: 'beat-093', voter_user_id: 'user-external-1', is_upvote: true, created_at: new Date().toISOString() },
      { id: 'vote-2', submission_id: 'beat-093', voter_user_id: 'user-external-2', is_upvote: true, created_at: new Date().toISOString() },
      { id: 'vote-3', submission_id: 'beat-093', voter_user_id: 'user-external-3', is_upvote: false, created_at: new Date().toISOString() },
      
      { id: 'vote-4', submission_id: 'beat-412', voter_user_id: 'user-external-1', is_upvote: true, created_at: new Date().toISOString() },
      { id: 'vote-5', submission_id: 'beat-412', voter_user_id: 'user-external-2', is_upvote: true, created_at: new Date().toISOString() },
      
      { id: 'vote-6', submission_id: 'beat-105', voter_user_id: 'user-external-1', is_upvote: true, created_at: new Date().toISOString() },
      { id: 'vote-7', submission_id: 'beat-105', voter_user_id: 'user-external-2', is_upvote: false, created_at: new Date().toISOString() }
    ]
  };

  const getDb = () => {
    if (typeof window === 'undefined') return defaultDb;
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultDb));
      return defaultDb;
    }
    return JSON.parse(stored);
  };

  const saveDb = (db) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    }
  };

  const recalculateUserRank = (user) => {
    const { level, rankName } = getLevelAndProgress(user.total_xp);
    user.current_level = level;
    user.current_rank = rankName;
  };

  // Build the mock builder interface mimicking Supabase syntax
  const createMockQueryBuilder = (tableName) => {
    let filters = [];
    let orderCol = null;
    let orderAsc = true;
    let limitVal = null;
    let isSingle = false;
    let operation = 'select'; // default operation is select
    let operationData = null;

    const builder = {
      select: (fields) => {
        operation = 'select';
        return builder;
      },
      eq: (column, value) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      order: (column, { ascending = true } = {}) => {
        orderCol = column;
        orderAsc = ascending;
        return builder;
      },
      limit: (num) => {
        limitVal = num;
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      insert: (rows) => {
        operation = 'insert';
        operationData = rows;
        return builder;
      },
      update: (updates) => {
        operation = 'update';
        operationData = updates;
        return builder;
      },
      upsert: (rows) => {
        operation = 'upsert';
        operationData = rows;
        return builder;
      },
      delete: () => {
        operation = 'delete';
        return builder;
      },
      // Execution methods returning { data, error }
      then: async (resolve) => {
        try {
          const dbData = getDb();
          const list = dbData[tableName] || [];

          if (operation === 'select') {
            let result = [...list];
            filters.forEach(filter => {
              result = result.filter(filter);
            });

            if (orderCol) {
              result.sort((a, b) => {
                const valA = a[orderCol];
                const valB = b[orderCol];
                if (valA < valB) return orderAsc ? -1 : 1;
                if (valA > valB) return orderAsc ? 1 : -1;
                return 0;
              });
            }

            if (limitVal !== null) {
              result = result.slice(0, limitVal);
            }

            if (isSingle) {
              result = result.length > 0 ? result[0] : null;
            }

            resolve({ data: result, error: null });
          } else if (operation === 'insert') {
            const inserted = Array.isArray(operationData) ? operationData : [operationData];
            
            const newRows = inserted.map(row => {
              const newRow = { 
                id: row.id || `mock-${tableName.substring(0, 3)}-${Math.floor(Math.random() * 10000)}`,
                created_at: new Date().toISOString(),
                ...row
              };
              if (tableName === 'users') {
                recalculateUserRank(newRow);
              }
              list.push(newRow);
              return newRow;
            });

            dbData[tableName] = list;
            saveDb(dbData);

            resolve({ data: isSingle ? newRows[0] : newRows, error: null });
          } else if (operation === 'update') {
            let updatedRows = [];

            dbData[tableName] = list.map(row => {
              // Check if matches the filters
              let matches = true;
              filters.forEach(filter => {
                if (!filter(row)) matches = false;
              });

              if (matches) {
                const updatedRow = { ...row, ...operationData };
                if (tableName === 'users') {
                  recalculateUserRank(updatedRow);
                }
                updatedRows.push(updatedRow);
                return updatedRow;
              }
              return row;
            });

            saveDb(dbData);
            resolve({ data: isSingle ? updatedRows[0] : updatedRows, error: null });
          } else if (operation === 'upsert') {
            const toUpsert = Array.isArray(operationData) ? operationData : [operationData];
            let upsertedRows = [];

            toUpsert.forEach(row => {
              const index = list.findIndex(r => r.id === row.id || (row.user_id && r.user_id === row.user_id && tableName === 'users'));
              let finalRow;
              if (index !== -1) {
                // Update existing
                finalRow = { ...list[index], ...row };
                if (tableName === 'users') {
                  recalculateUserRank(finalRow);
                }
                list[index] = finalRow;
              } else {
                // Insert new
                finalRow = {
                  id: row.id || `mock-${tableName.substring(0, 3)}-${Math.floor(Math.random() * 10000)}`,
                  created_at: new Date().toISOString(),
                  ...row
                };
                if (tableName === 'users') {
                  recalculateUserRank(finalRow);
                }
                list.push(finalRow);
              }
              upsertedRows.push(finalRow);
            });

            dbData[tableName] = list;
            saveDb(dbData);

            resolve({ data: isSingle ? upsertedRows[0] : upsertedRows, error: null });
          } else if (operation === 'delete') {
            const remaining = list.filter(row => {
              let matches = true;
              filters.forEach(filter => {
                if (!filter(row)) matches = false;
              });
              return !matches;
            });

            dbData[tableName] = remaining;
            saveDb(dbData);

            resolve({ data: null, error: null });
          }
        } catch (e) {
          resolve({ data: null, error: e });
        }
      }
    };

    return builder;
  };

  // Mock Authentication client
  const mockAuth = {
    getSession: async () => {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const activeUserJson = localStorage.getItem('clocked_audio_active_user');
      if (activeUserJson) {
        const parsed = JSON.parse(activeUserJson);
        // Refresh with latest db values
        const db = getDb();
        const freshUser = db.users.find(u => u.id === parsed.id) || parsed;
        return { data: { session: { user: freshUser } }, error: null };
      }
      // Start in a clean signed out state so we can test the gates!
      return { data: { session: null }, error: null };
    },
    signInWithOAuth: async ({ provider, options }) => {
      if (typeof window === 'undefined') return { data: null, error: null };
      if (provider === 'discord') {
        const redirectTo = options?.redirectTo || window.location.origin;
        window.location.href = `/auth/discord-mock?redirectTo=${encodeURIComponent(redirectTo)}`;
        return { data: { provider: 'discord', url: `/auth/discord-mock?redirectTo=${encodeURIComponent(redirectTo)}` }, error: null };
      }
      return { data: null, error: new Error('Unsupported provider in mock mode') };
    },
    signUp: async ({ email, password, options }) => {
      const db = getDb();
      const username = options?.data?.username || email.split('@')[0];
      const newUser = {
        id: `mock-user-${Math.floor(Math.random() * 10000)}`,
        username: username,
        email: email,
        total_xp: 0,
        current_level: 1,
        current_rank: 'Bedroom Producer (Bronze I)',
        is_premium: false,
        stripe_customer_id: null,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      saveDb(db);
      localStorage.setItem('clocked_audio_active_user', JSON.stringify(newUser));
      
      // Trigger auth state change callbacks
      authCallbacks.forEach(cb => cb('SIGNED_IN', { user: newUser }));
      
      return { data: { user: newUser, session: { user: newUser } }, error: null };
    },
    signInWithPassword: async ({ email }) => {
      const db = getDb();
      let user = db.users.find(u => u.email === email);
      if (!user) {
        // Create user on the fly for ease of mockup authentication
        user = {
          id: `mock-user-${Math.floor(Math.random() * 10000)}`,
          username: email.split('@')[0],
          email: email,
          total_xp: 100,
          current_level: 1,
          current_rank: 'Bedroom Producer (Bronze I)',
          is_premium: false,
          stripe_customer_id: null,
          created_at: new Date().toISOString()
        };
        db.users.push(user);
        saveDb(db);
      }
      localStorage.setItem('clocked_audio_active_user', JSON.stringify(user));
      authCallbacks.forEach(cb => cb('SIGNED_IN', { user }));
      return { data: { user, session: { user } }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('clocked_audio_active_user');
      authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange: (cb) => {
      authCallbacks.push(cb);
      // Immediately run callback with current state
      mockAuth.getSession().then(({ data }) => {
        if (data.session) {
          cb('SIGNED_IN', data.session);
        } else {
          cb('SIGNED_OUT', null);
        }
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = authCallbacks.indexOf(cb);
              if (index !== -1) authCallbacks.splice(index, 1);
            }
          }
        }
      };
    }
  };

  const authCallbacks = [];

  supabaseInstance = {
    auth: mockAuth,
    from: (table) => createMockQueryBuilder(table)
  };
}

export const supabase = supabaseInstance;
