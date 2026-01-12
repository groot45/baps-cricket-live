
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import Navbar from './components/Navbar';
import LiveScores from './pages/LiveScores';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import ScorerDashboard from './pages/scorer/ScorerDashboard';
import { BAPS_ASSETS } from './config/tournament';
import { databaseService } from './services/api';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const SiteGatekeeper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState(false);
  
  const SITE_ACCESS_KEY = "PRAMUKH2026";

  useEffect(() => {
    const sessionAccess = sessionStorage.getItem('site_access_granted');
    if (sessionAccess === 'true') {
      setAccessGranted(true);
    }
  }, []);

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.toUpperCase() === SITE_ACCESS_KEY) {
      sessionStorage.setItem('site_access_granted', 'true');
      setAccessGranted(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!accessGranted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-pramukh-navy flex items-center justify-center p-6 font-din">
        <div className="absolute inset-0 opacity-10">
          <i className="fas fa-baseball-ball text-[40rem] absolute -top-20 -left-20 rotate-45 text-white"></i>
        </div>
        
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl relative z-10 border-b-[16px] border-pramukh-red text-center">
          <div className="bg-pramukh-navy w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl border-4 border-pramukh-red/30 transform -rotate-3 overflow-hidden">
             <img src={BAPS_ASSETS.SYMBOL} className="w-20 h-20 object-contain invert" alt="BAPS Charities Symbol" />
          </div>
          <h1 className="text-3xl font-black text-pramukh-navy uppercase italic mb-2 tracking-tighter">PRIVATE ACCESS</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-10">BAPS Charities Event Portal</p>
          
          <form onSubmit={handleAccess} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">ENTER ACCESS KEY</label>
              <input 
                type="password" 
                className={`w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-black text-center text-xl tracking-[0.5em] transition-all outline-none ${error ? 'border-pramukh-red bg-red-50' : 'border-slate-100 focus:border-pramukh-navy'}`}
                placeholder="••••••••"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-pramukh-navy text-white font-black py-5 rounded-2xl uppercase italic tracking-widest shadow-xl hover:brightness-125 transition-all">
              Unlock Site
            </button>
            {error && <p className="text-pramukh-red text-[10px] font-black uppercase tracking-widest animate-pulse mt-4">Invalid Access Key</p>}
          </form>
          
          <div className="mt-12 pt-8 border-t border-slate-100">
             <img src={BAPS_ASSETS.FULL_LOGO} className="h-6 mx-auto opacity-40 grayscale hover:grayscale-0 transition-all cursor-pointer" alt="BAPS Charities" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useTournament();
  
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd]">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-pramukh-navy py-16 border-t-[12px] border-pramukh-red font-din relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
           <img src={BAPS_ASSETS.SYMBOL} className="w-[30rem] absolute -right-40 -bottom-20 invert rotate-12" alt="" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-10 md:space-y-0">
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
              <img src={BAPS_ASSETS.FULL_LOGO} className="h-10 invert mb-2" alt="BAPS Charities Full Logo" />
              <div className="leading-none">
                <span className="text-white text-3xl font-black italic uppercase tracking-tighter">{config.shortName}</span>
                <div className="text-pramukh-red text-xs font-black tracking-[0.4em] mt-1 uppercase italic">{config.location} • EST {config.year}</div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 mb-6">
                <p className="text-white font-black italic text-sm tracking-widest mb-2">SAMP • SUHRADBHAV • EKTA</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                  Dedicated to serving the community<br/>through the spirit of selfless service.
                </p>
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                &copy; {config.year} BAPS Charities. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TournamentProvider>
        <SiteGatekeeper>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/live" replace />} />
                <Route path="/live" element={<LiveScores />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scorer"
                  element={
                    <ProtectedRoute requiredRole="SCORER">
                      <ScorerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/live" replace />} />
              </Routes>
            </Layout>
          </Router>
        </SiteGatekeeper>
      </TournamentProvider>
    </AuthProvider>
  );
};

export default App;
