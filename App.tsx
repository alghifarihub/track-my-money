
import React, { useEffect, useState, useMemo } from 'react';
import { Bell, Loader2, CheckCircle2, User, Settings, BellRing, Database, ChevronRight, LogOut, Shield, Play, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion'; 
import { DashboardStats } from './components/DashboardStats';
import { Analytics } from './components/Analytics';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { BudgetView } from './components/BudgetView';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav'; 
import { DateRangePicker } from './components/ui/DateRangePicker'; 
import { OnboardingWizard } from './components/OnboardingWizard'; 
import { AppTour } from './components/AppTour'; 
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { financeService } from './services/financeService';
import { Transaction, DashboardStats as StatsType, UserProfile, CurrencyCode, BudgetLimits, DateRange } from './types';
import { TRANSLATIONS } from './constants';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Switch, Badge, Separator, Dialog } from './components/ui/DesignSystem';
import { UserProvider, useUser } from './contexts/UserContext';
import { supabase } from './lib/supabase';

type View = 'overview' | 'transactions' | 'budgeting' | 'settings';

const formatNumberString = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseFormattedNumber = (value: string) => {
    return parseFloat(value.replace(/\./g, '')) || 0;
};

// --- Inner App Component ---
const AppContent = () => {
  const { profile, loading: userLoading, updateProfile, refreshProfile } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimits>({});
  
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now
    };
  });

  const [activeView, setActiveView] = useState<View>('overview');
  const [toast, setToast] = useState<{message: string, visible: boolean}>({ message: '', visible: false });
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [tempBalance, setTempBalance] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Check if we are in demo mode for UI adjustments
  const isDemo = financeService.isDemoMode();

  const loadData = async () => {
    if (!profile) return;
    try {
      const [txData, budgetData] = await Promise.all([
        financeService.getTransactions(),
        financeService.getBudgetLimits()
      ]);
      setTransactions(txData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setBudgetLimits(budgetData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id' | 'created_at'>) => {
    setActionLoading(true);
    try {
      const added = await financeService.addTransaction(newTx);
      setTransactions(prev => [added, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      showToast("Transaction added successfully");
      setIsAddModalOpen(false); 
    } catch (error) {
        showToast("Failed to add transaction");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await financeService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast("Transaction deleted");
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const handleUpdateBudgets = async (newLimits: BudgetLimits) => {
    try {
        await financeService.updateBudgetLimits(newLimits);
        setBudgetLimits(newLimits);
        showToast("Budgets updated successfully!");
    } catch (error) {
        console.error("Failed to update budgets", error);
    }
  };

  const handleSaveInitialBalance = async () => {
     if (!profile) return;
     const num = parseFormattedNumber(tempBalance); 
     try {
         await updateProfile({ ...profile, initialBalance: num });
         setIsBalanceModalOpen(false);
         showToast("Initial balance updated");
     } catch (e) {
         console.error(e);
     }
  };

  const openBalanceModal = () => {
      const initial = profile?.initialBalance?.toString() || '';
      setTempBalance(formatNumberString(initial));
      setIsBalanceModalOpen(true);
  };

  const handleLogout = async () => {
    if (isDemo) {
        financeService.disableDemoMode();
        window.location.reload();
    } else {
        try {
            await supabase.auth.signOut();
            window.location.reload();
        } catch (error) {
            console.error("Logout failed", error);
        }
    }
  };

  // --- Helpers & Filtering ---
  const t = TRANSLATIONS[profile?.language || 'en'];
  const activeCategories = useMemo(() => Object.keys(budgetLimits).sort(), [budgetLimits]);

  const formatCurrency = (amount: number) => {
    const currency = profile?.currency || 'USD';
    return new Intl.NumberFormat(profile?.language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transactions;
    const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
    const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
    return transactions.filter(t => { const tDate = new Date(t.date); return tDate >= from && tDate <= to; });
  }, [transactions, dateRange]);

  const stats: StatsType = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const initial = profile?.initialBalance || 0;
    const totalBalance = initial + totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    return { totalBalance, totalIncome, totalExpense, savingsRate };
  }, [filteredTransactions, profile?.initialBalance]);

  // --- Settings View ---
  const SettingsView = () => {
    const [formState, setFormState] = useState<UserProfile>(profile!);
    const [activeTab, setActiveTab] = useState('account');

    const handleSave = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setSettingsLoading(true);
      try {
        await updateProfile(formState);
        showToast("Settings saved successfully!");
      } catch (e) {
        showToast("Failed to save settings");
      } finally {
        setSettingsLoading(false);
      }
    };

    return (
      <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 mb-2">General</h3>
          {['account', 'preferences'].map(id => (
              <button key={id} onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === id ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
                <span className={`${activeTab === id ? 'text-orange-500' : 'text-zinc-500'}`}>{id === 'account' ? <User size={18}/> : <Settings size={18}/>}</span>
                <span className="capitalize">{id}</span>
              </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            {isDemo && (
                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-sm flex items-center gap-3">
                    <Shield size={20} />
                    <span>You are currently in <strong>Demo Mode</strong>. Changes are saved locally to your browser.</span>
                </div>
            )}
            
            <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-8">
               {activeTab === 'account' && (
                 <div className="space-y-6">
                    <div className="relative h-32 rounded-2xl bg-gradient-to-r from-orange-600 to-purple-700 overflow-hidden mb-8">
                       <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                          <div className="w-24 h-24 rounded-full bg-zinc-900 p-1 ring-4 ring-zinc-900">
                             <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-orange-500">
                                {formState.name ? formState.name.charAt(0).toUpperCase() : 'U'}
                             </div>
                          </div>
                          <div className="mb-3">
                             <h2 className="text-2xl font-bold text-white drop-shadow-md">{formState.name || 'User'}</h2>
                             {isDemo && <Badge variant="shimmer">DEMO USER</Badge>}
                          </div>
                       </div>
                    </div>
                    <Input label={t.displayName} value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} />
                    <Input label={t.email} value={formState.email} disabled className="opacity-50 cursor-not-allowed"/>
                 </div>
               )}

               {activeTab === 'preferences' && (
                  <div className="space-y-6">
                     <div className="bg-zinc-950/50 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                        <div className="p-4 flex items-center justify-between">
                            <label className="text-sm font-medium text-white">{t.currency}</label>
                            <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white" value={formState.currency} onChange={(e) => setFormState({...formState, currency: e.target.value as CurrencyCode})}>
                                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="IDR">IDR (Rp)</option>
                            </select>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <label className="text-sm font-medium text-white">{t.language}</label>
                            <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white" value={formState.language} onChange={(e) => setFormState({...formState, language: e.target.value as any})}>
                                <option value="en">English</option><option value="id">Bahasa Indonesia</option>
                            </select>
                        </div>
                     </div>
                  </div>
               )}
               
               <div className="block md:hidden pt-8">
                  <Button variant="danger" type="button" className="w-full h-12" onClick={handleLogout}>
                     <LogOut size={18} className="mr-2" />
                     {isDemo ? "Exit Demo" : t.signOut}
                  </Button>
               </div>
            </form>
          </div>
          <div className="p-6 border-t border-white/5 bg-zinc-950/30 flex justify-end">
             <Button onClick={(e) => handleSave(e)} disabled={settingsLoading} className="min-w-[120px]">
                {settingsLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {settingsLoading ? t.saving : t.saveChanges}
             </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
        case 'overview': return <div className="space-y-6 animate-in fade-in"><DashboardStats stats={stats} formatCurrency={formatCurrency} labels={t} onEditBalance={openBalanceModal}/><Analytics transactions={filteredTransactions} labels={t} formatCurrency={formatCurrency} currency={profile?.currency || 'USD'}/><div className="grid grid-cols-1 xl:grid-cols-3 gap-6"><div className="xl:col-span-2 order-2 xl:order-1"><TransactionList transactions={filteredTransactions.slice(0, 5)} onDelete={handleDeleteTransaction} formatCurrency={formatCurrency} labels={t} /></div><div className="hidden md:block xl:col-span-1 order-1 xl:order-2"><TransactionForm onAdd={handleAddTransaction} loading={actionLoading} labels={t} categories={activeCategories} currency={profile!.currency}/></div></div></div>;
        case 'transactions': return <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full animate-in fade-in"><div className="xl:col-span-2 order-2 xl:order-1 h-full"><TransactionList transactions={filteredTransactions} onDelete={handleDeleteTransaction} formatCurrency={formatCurrency} labels={t} /></div><div className="hidden md:block xl:col-span-1 order-1 xl:order-2"><TransactionForm onAdd={handleAddTransaction} loading={actionLoading} labels={t} categories={activeCategories} currency={profile!.currency}/></div></div>;
        case 'budgeting': return <div className="animate-in fade-in"><BudgetView transactions={filteredTransactions} budgetLimits={budgetLimits} onUpdateLimits={handleUpdateBudgets} formatCurrency={formatCurrency} labels={t}/></div>;
        case 'settings': return <SettingsView />;
        default: return null;
    }
  };

  if (userLoading || !profile) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div><p className="text-zinc-500 text-sm animate-pulse">Loading Profile...</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {!profile.onboardingCompleted && !isDemo && <OnboardingWizard onFinish={() => { refreshProfile(); showToast("Setup complete!"); }} />}
      <AppTour />
      <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen} title={t.setInitialBalance}><div className="space-y-4"><Input type="text" inputMode="numeric" value={tempBalance} onChange={e => setTempBalance(formatNumberString(e.target.value))} placeholder="0" autoFocus/><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setIsBalanceModalOpen(false)}>{t.cancel}</Button><Button onClick={handleSaveInitialBalance}>{t.save}</Button></div></div></Dialog>
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen} title={t.addTransaction}><TransactionForm onAdd={handleAddTransaction} loading={actionLoading} labels={t} categories={activeCategories} currency={profile!.currency}/></Dialog>
      {toast.visible && <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-500"><div className="bg-zinc-900 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 backdrop-blur-md"><CheckCircle2 size={18} /><span className="font-medium text-sm">{toast.message}</span></div></div>}
      
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <MobileNav activeView={activeView} onNavigate={setActiveView} onAddClick={() => setIsAddModalOpen(true)}/>
      
      <main className="md:pl-64 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
          {/* Top Bar with Demo Indicator */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
             <div>
                {isDemo && <span className="text-[10px] font-bold bg-orange-500 text-black px-2 py-0.5 rounded mb-2 inline-block">DEMO MODE</span>}
                <h2 className="text-2xl md:text-3xl font-bold text-white capitalize tracking-tight">{profile?.language === 'id' && activeView === 'overview' ? 'Ringkasan' : activeView}</h2>
             </div>
             <div className="flex items-center gap-4 w-full md:w-auto">
                {activeView !== 'settings' && <DateRangePicker id="tour-filter" date={dateRange} setDate={setDateRange} className="w-full md:w-auto" />}
                <button className="hidden md:block p-2 rounded-full hover:bg-zinc-800 text-zinc-400"><Bell size={20}/></button>
             </div>
          </div>
          <div className="min-h-[500px]">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

// --- Root App ---
const App = () => {
  const [session, setSession] = useState<any | null>(null);
  const [isDemo, setIsDemo] = useState(financeService.isDemoMode());
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Check initial state
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEnterDemo = () => {
      financeService.enableDemoMode();
      setIsDemo(true);
      window.location.reload();
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  // Logic: Show App if (Session Exists) OR (Demo Mode is Active)
  const isAuthenticated = !!session || isDemo;

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
         showAuth ? (
             <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <AuthPage onBack={() => setShowAuth(false)} onEnterDemo={handleEnterDemo} />
             </motion.div>
         ) : (
             <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <LandingPage onStart={() => setShowAuth(true)} onEnterDemo={handleEnterDemo} />
             </motion.div>
         )
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <UserProvider>
                <AppContent />
            </UserProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
