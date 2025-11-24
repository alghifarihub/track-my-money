import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase'; 

// KITA KOMENTARIN DULU COMPONENT YANG MUNGKIN BIKIN ERROR
// import { AuthPage } from './components/AuthPage';
// import { Dashboard } from './components/Dashboard';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pura-pura loading biar tau React jalan
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return <div className="p-10 text-white bg-black h-screen">Loading System...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-900 text-white gap-4">
      <h1 className="text-4xl font-bold text-orange-500">Aplikasi Jalan! 🚀</h1>
      <p>Layar hitam sudah sembuh.</p>
      <p className="text-gray-400">Sekarang saatnya cek file AuthPage.tsx ada atau nggak.</p>
      
      {/* Tombol Cek Supabase */}
      <button 
        onClick={async () => {
           const { data } = await supabase.from('transactions').select('*');
           console.log(data);
           alert('Cek Console buat liat data Supabase');
        }}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
      >
        Tes Koneksi Database
      </button>
    </div>
  );
}
