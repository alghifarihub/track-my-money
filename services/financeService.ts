
import { Transaction, UserProfile, BudgetLimits, CurrencyCode } from '../types';
import { DEFAULT_CATEGORIES, generateDemoData } from '../constants';
import { supabase } from '../lib/supabase';

const DEMO_STORAGE_KEY = 'ghifar_demo_mode';
const DEMO_DATA_KEY = 'ghifar_demo_data';
const DEMO_PROFILE_KEY = 'ghifar_demo_profile';
const DEMO_BUDGET_KEY = 'ghifar_demo_budgets';

// Default object for fresh users
const DEFAULT_SETTINGS: UserProfile = {
  name: '', 
  email: '',
  currency: 'IDR', 
  language: 'en',
  darkMode: true,
  onboardingCompleted: false,
  tourCompleted: false,
  emailAlerts: true,
  monthlyReport: true,
  initialBalance: 0
};

// --- Helpers for Demo Mode (LocalStorage) ---
const getLocalData = <T>(key: string, defaultVal: T): T => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultVal;
};

const setLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- Helpers for Supabase Mapping ---
const mapProfileFromDB = (data: any): UserProfile => ({
  name: data.name ?? '',
  email: data.email ?? '',
  currency: data.currency ?? 'IDR',
  language: data.language ?? 'en',
  darkMode: data.dark_mode ?? true,
  onboardingCompleted: data.onboarding_completed ?? false,
  tourCompleted: data.tour_completed ?? false,
  emailAlerts: data.email_alerts ?? true,
  monthlyReport: data.monthly_report ?? true,
  initialBalance: Number(data.initial_balance) || 0,
  monthlyBudgetGoal: Number(data.monthly_budget_goal) || 0
});

const mapProfileToDB = (profile: UserProfile) => ({
  name: profile.name || '',
  currency: profile.currency || 'IDR',
  language: profile.language || 'en',
  dark_mode: profile.darkMode ?? true,
  onboarding_completed: profile.onboardingCompleted ?? false,
  tour_completed: profile.tourCompleted ?? false,
  email_alerts: profile.emailAlerts ?? true,
  monthly_report: profile.monthlyReport ?? true,
  initial_balance: profile.initialBalance || 0,
  monthly_budget_goal: profile.monthlyBudgetGoal || 0
});

export const financeService = {
  // --- Mode Management ---
  enableDemoMode: () => {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
      
      // Initialize Demo Data if empty
      if (!localStorage.getItem(DEMO_DATA_KEY)) {
          const demoTxs = generateDemoData();
          setLocalData(DEMO_DATA_KEY, demoTxs);
          
          const demoProfile: UserProfile = {
              ...DEFAULT_SETTINGS,
              name: 'Demo User',
              email: 'demo@example.com',
              initialBalance: 15000000,
              onboardingCompleted: true,
              tourCompleted: false // Let them see the tour
          };
          setLocalData(DEMO_PROFILE_KEY, demoProfile);

          const demoBudgets: BudgetLimits = {};
          DEFAULT_CATEGORIES.forEach(c => demoBudgets[c] = 2000000);
          setLocalData(DEMO_BUDGET_KEY, demoBudgets);
      }
  },

  disableDemoMode: () => {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      // Optional: Clear demo data to save space, or keep it for next time
      // localStorage.removeItem(DEMO_DATA_KEY);
  },

  isDemoMode: () => {
      return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  },

  clearLocalSession: () => {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      localStorage.removeItem(DEMO_DATA_KEY);
      localStorage.removeItem(DEMO_PROFILE_KEY);
      localStorage.removeItem(DEMO_BUDGET_KEY);
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    if (financeService.isDemoMode()) {
        await new Promise(r => setTimeout(r, 500)); // Fake latency
        return getLocalData<Transaction[]>(DEMO_DATA_KEY, []);
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Error getTransactions:", err);
        return [];
    }
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
    if (financeService.isDemoMode()) {
        await new Promise(r => setTimeout(r, 400));
        const newTx: Transaction = {
            ...transaction,
            id: `demo-${Date.now()}`,
            created_at: new Date().toISOString()
        };
        const current = getLocalData<Transaction[]>(DEMO_DATA_KEY, []);
        setLocalData(DEMO_DATA_KEY, [newTx, ...current]);
        return newTx;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const safeAmount = Number(transaction.amount);
    const newTx = {
      ...transaction,
      amount: safeAmount,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    if (financeService.isDemoMode()) {
        const current = getLocalData<Transaction[]>(DEMO_DATA_KEY, []);
        const updated = current.filter(t => t.id !== id);
        setLocalData(DEMO_DATA_KEY, updated);
        return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- User Profile ---
  getUserSettings: async (): Promise<UserProfile> => {
    if (financeService.isDemoMode()) {
        return getLocalData<UserProfile>(DEMO_PROFILE_KEY, DEFAULT_SETTINGS);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_SETTINGS;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
        return { ...DEFAULT_SETTINGS, email: user.email || '' };
    }

    return mapProfileFromDB(data);
  },

  updateUserSettings: async (settings: UserProfile): Promise<UserProfile> => {
    if (financeService.isDemoMode()) {
        await new Promise(r => setTimeout(r, 600));
        setLocalData(DEMO_PROFILE_KEY, settings);
        return settings;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const payload = {
        id: user.id,
        updated_at: new Date().toISOString(),
        email: user.email,
        ...mapProfileToDB(settings)
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw new Error(error.message);
    
    return settings;
  },

  // --- Budgets ---
  getBudgetLimits: async (): Promise<BudgetLimits> => {
    if (financeService.isDemoMode()) {
        return getLocalData<BudgetLimits>(DEMO_BUDGET_KEY, {});
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('budget_limits')
      .select('category, amount')
      .eq('user_id', user.id);

    if (error) return {};

    const limits: BudgetLimits = {};
    data?.forEach((item: any) => {
        limits[item.category] = Number(item.amount);
    });

    return limits;
  },

  updateBudgetLimits: async (limits: BudgetLimits): Promise<BudgetLimits> => {
    if (financeService.isDemoMode()) {
        setLocalData(DEMO_BUDGET_KEY, limits);
        return limits;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const upsertData = Object.entries(limits).map(([category, amount]) => ({
        user_id: user.id,
        category,
        amount: Number(amount)
    }));

    if (upsertData.length === 0) return {};

    const { error } = await supabase
        .from('budget_limits')
        .upsert(upsertData, { onConflict: 'user_id, category' });

    if (error) throw error;
    return limits;
  },

  convertDataCurrency: async (from: CurrencyCode, to: CurrencyCode): Promise<void> => {
     // Not implemented for stability
  },

  injectDemoData: async () => {
    // Only available in Supabase mode via Settings (if user really wants to pollute DB)
    // But now we recommend "Demo Mode" instead.
    console.warn("Inject Demo Data called.");
    // Reuse existing logic if needed, but primarily we use enableDemoMode() now.
  }
};
