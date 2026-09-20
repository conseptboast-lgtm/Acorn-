// ============================================================
// ===== SUPABASE CONFIG =====
// ============================================================
const SUPABASE_URL = 'https://slczgjzihhhegktemysi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nb72CQM2UbHgEF3ezUH8Yw_AeXuLt9X';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// ===== FIELD NORMALIZER =====
// Handles "currentLevel" OR "currentlevel" OR "current_level"
// ============================================================
function normalizeUser(u) {
    if (!u) return null;
    return {
        id: u.id,
        userId: u.userId || u.userid || u.user_id,
        fullName: u.fullName || u.fullname || u.full_name,
        phone: u.phone,
        password: u.password,
        avatar: u.avatar,
        bank: u.bank,
        pin: u.pin,
        currentLevel: u.currentLevel || u.currentlevel || u.current_level || 'Rox 0',
        balance: Number(u.balance) || 0,
        totalEarned: Number(u.totalEarned || u.totalearned || u.total_earned) || 0,
        todayProfit: Number(u.todayProfit || u.todayprofit || u.today_profit) || 0,
        yesterdayProfit: Number(u.yesterdayProfit || u.yesterdayprofit || u.yesterday_profit) || 0,
        totalProfit: Number(u.totalProfit || u.totalprofit || u.total_profit) || 0,
        tasksCompletedToday: Number(u.tasksCompletedToday || u.taskscompletedtoday) || 0,
        lastTaskDate: u.lastTaskDate || u.lasttaskdate,
        registrationDate: u.registrationDate || u.registrationdate,
        referralCode: u.referralCode || u.referralcode,
        referredBy: u.referredBy || u.referredby,
        referralCount: Number(u.referralCount || u.referralcount) || 0,
        referralEarnings: Number(u.referralEarnings || u.referralearnings) || 0
    };
}

// ============================================================
// ===== USER HELPERS =====
// ============================================================
async function dbGetUser(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('Users')
            .select('*')
            .eq('userId', userId)
            .limit(1);
        if (error) throw error;
        if (!data || data.length === 0) return null;
        return normalizeUser(data[0]);
    } catch (e) {
        console.error('dbGetUser error:', e);
        return null;
    }
}

async function dbGetUsers() {
    try {
        const { data, error } = await supabaseClient.from('Users').select('*');
        if (error) throw error;
        return (data || []).map(normalizeUser);
    } catch (e) {
        console.error('dbGetUsers error:', e);
        return [];
    }
}

async function dbCreateUser(user) {
    try {
        const { data, error } = await supabaseClient
            .from('Users')
            .insert([user])
            .select();
        if (error) throw error;
        return normalizeUser(data[0]);
    } catch (e) {
        console.error('dbCreateUser error:', e);
        return null;
    }
}

async function dbUpdateUser(userId, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('Users')
            .update(updates)
            .eq('userId', userId)
            .select();
        if (error) throw error;
        return normalizeUser(data[0]);
    } catch (e) {
        console.error('dbUpdateUser error:', e);
        return null;
    }
}

// ============================================================
// ===== DEPOSITS =====
// ============================================================
async function dbGetDeposits() {
    try {
        const { data, error } = await supabaseClient
            .from('Deposits')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('dbGetDeposits error:', e);
        return [];
    }
}

async function dbCreateDeposit(deposit) {
    try {
        const { data, error } = await supabaseClient
            .from('Deposits')
            .insert([deposit])
            .select();
        if (error) throw error;
        return data[0];
    } catch (e) {
        console.error('dbCreateDeposit error:', e);
        return null;
    }
}

// ============================================================
// ===== WITHDRAWALS =====
// ============================================================
async function dbGetWithdrawals() {
    try {
        const { data, error } = await supabaseClient
            .from('Withdrawals')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('dbGetWithdrawals error:', e);
        return [];
    }
}

async function dbCreateWithdrawal(w) {
    try {
        const { data, error } = await supabaseClient
            .from('Withdrawals')
            .insert([w])
            .select();
        if (error) throw error;
        return data[0];
    } catch (e) {
        console.error('dbCreateWithdrawal error:', e);
        return null;
    }
}

// ============================================================
// ===== REFERRALS =====
// ============================================================
async function dbGetReferrals(referrerId) {
    try {
        const { data, error } = await supabaseClient
            .from('Users')
            .select('*')
            .eq('referredBy', referrerId);
        if (error) throw error;
        return (data || []).map(normalizeUser);
    } catch (e) {
        console.error('dbGetReferrals error:', e);
        return [];
    }
}