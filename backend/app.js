const AppState = (() => {
  const SUPABASE_URL = 'https://tqhlwtqwntvfsbhrafgx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_eA_1uj0oxuIMZgFcV29UOw_mokbS2xF';

  const supabase = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  // Retrieve local active session with database-mapped fields
  const getSession = () => ({
    role: (localStorage.getItem('user_role') || 'student').toLowerCase(),
    email: localStorage.getItem('user_email') || 'student@college.edu',
    name: localStorage.getItem('user_name') || 'Aarav Sharma',
    code: localStorage.getItem('user_role_code') || '2024CS101',
    id: localStorage.getItem('user_id') || '',
    dept: localStorage.getItem('user_dept') || 'Computer Science & Engineering',
    semester: localStorage.getItem('user_semester') || '4'
  });

  const clearSession = () => {
    ['user_email', 'user_id', 'user_role', 'user_name', 'user_role_code', 'user_dept', 'user_semester'].forEach(k => localStorage.removeItem(k));
  };

  // Synchronize active profile directly from Supabase profiles table
  const syncProfile = async () => {
    const s = getSession();
    if (!supabase) return s;
    try {
      let query = supabase.from('profiles').select('id, role, full_name, email, roll_or_faculty_id, department, semester');
      if (s.id) {
        query = query.eq('id', s.id);
      } else if (s.email) {
        query = query.eq('email', s.email);
      }
      const { data } = await query.single();
      if (data) {
        if (data.id) localStorage.setItem('user_id', data.id);
        if (data.role) localStorage.setItem('user_role', data.role);
        if (data.full_name) localStorage.setItem('user_name', data.full_name);
        if (data.email) localStorage.setItem('user_email', data.email);
        if (data.roll_or_faculty_id) localStorage.setItem('user_role_code', data.roll_or_faculty_id);
        if (data.department) localStorage.setItem('user_dept', data.department);
        if (data.semester !== null && data.semester !== undefined) localStorage.setItem('user_semester', String(data.semester));
        return getSession();
      }
    } catch (e) {
      console.warn('Sync profile notice:', e);
    }
    return s;
  };

  // Safe Supabase table query helper
  const fetchTable = async (table, select = '*', orderCol = null) => {
    if (!supabase) return { data: null, error: 'No client' };
    try {
      let q = supabase.from(table).select(select);
      if (orderCol) q = q.order(orderCol, { ascending: false });
      return await q;
    } catch (e) {
      console.warn(`Query ${table} notice:`, e);
      return { data: null, error: e };
    }
  };

  return {
    supabase,
    getSession,
    clearSession,
    syncProfile,
    fetchTable
  };
})();

window.AppState = AppState;
