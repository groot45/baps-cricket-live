
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { databaseService } from '../services/api';

const Navbar: React.FC = () => {
  const { user, logout, isAdmin, isScorer } = useAuth();
  const { config } = useTournament();
  const navigate = useNavigate();
  const [logoErr, setLogoErr] = useState(false);
  const [bapsErr, setBapsErr] = useState(false);
  const [dbActive, setDbActive] = useState(false);

  useEffect(() => {
    const checkDb = () => setDbActive(databaseService.isAtlasConnected);
    checkDb();
    const interval = setInterval(checkDb, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLogoDisplay = () => {
    if (config.logoUrl && !logoErr) {
      return (
        <img 
          src={config.logoUrl} 
          className="w-full h-full object-contain" 
          alt="Tournament Logo" 
          onError={() => setLogoErr(true)}
        />
      );
    }
    
    if (config.bapsSymbol && !bapsErr) {
        return <img src={config.bapsSymbol} className="w-full h-full object-contain" alt="BAPS" onError={() => setBapsErr(true)} />;
    }

    return <i className="fas fa-fire-alt text-pramukh-navy text-2xl"></i>;
  };

  return (
    <nav className="bg-pramukh-navy text-white shadow-2xl sticky top-0 z-50 border-b-4 border-pramukh-red">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-4 group">
              <div className="bg-white p-1 rounded-xl shadow-lg flex items-center justify-center w-14 h-14 border-2 border-pramukh-red/20 overflow-hidden transform group-hover:scale-110 transition-transform">
                 {getLogoDisplay()}
              </div>
              <div className="flex flex-col leading-none pt-1 font-din">
                <div className="flex items-center space-x-2 mb-1">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">PRESENTED BY</span>
                   {config.bapsFullLogo ? (
                       <img src={config.bapsFullLogo} className="h-2.5 invert" alt="BAPS Charities" />
                   ) : (
                       <span className="text-[9px] font-black text-white bg-pramukh-red px-1.5 py-0.5 rounded leading-none">BAPS CHARITIES</span>
                   )}
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-black tracking-tight italic uppercase">{config.shortName}</span>
                  <div className={`ml-3 w-2 h-2 rounded-full animate-pulse ${dbActive ? 'bg-green-400' : 'bg-amber-400'}`} title={dbActive ? 'Atlas Cloud (Live)' : 'Local Storage Only'}></div>
                </div>
                <span className="text-[11px] font-bold tracking-[0.3em] text-pramukh-red uppercase ml-0.5">{config.location} {config.year}</span>
              </div>
            </Link>
            <div className="hidden lg:flex space-x-1 font-din ml-8">
              <Link to="/live" className="hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-widest italic">MATCH CENTER</Link>
              {isAdmin && <Link to="/admin" className="hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-widest italic">ADMIN PANEL</Link>}
              {isScorer && <Link to="/scorer" className="hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-bold transition-colors uppercase tracking-widest italic">SCORING CONSOLE</Link>}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex flex-col items-end leading-none font-din">
                  <span className="text-[10px] font-black text-pramukh-red uppercase tracking-widest">AUTHORIZED</span>
                  <span className="text-sm font-bold text-white uppercase tracking-tighter italic">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-pramukh-red hover:brightness-110 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-red-500/30 font-din italic"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-white text-pramukh-navy hover:bg-slate-100 px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-lg font-din italic"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
