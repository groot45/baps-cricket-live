
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { UserRole } from '../types';
import { databaseService } from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { config } = useTournament();
  const navigate = useNavigate();
  const [symErr, setSymErr] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const users = await databaseService.getUsers();
      const foundUser = users.find((u: any) => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
      );

      if (foundUser) {
        login({ 
          id: foundUser.id, 
          username: foundUser.username, 
          role: foundUser.role, 
          token: 'fake-jwt-token' 
        });
        
        if (foundUser.role === UserRole.ADMIN) {
          navigate('/admin');
        } else {
          navigate('/scorer');
        }
      } else {
        setError('Verification Failed. Invalid credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pramukh-navy py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-din text-slate-900">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
         <i className="fas fa-fire-alt text-[50rem] absolute -top-40 -left-40 text-white opacity-10 rotate-45"></i>
      </div>
      
      <div className="max-w-md w-full space-y-8 bg-white p-12 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative z-10 border-b-[20px] border-pramukh-red border-t-8 border-slate-50">
        <div className="text-center">
          <div className="flex justify-center mb-8">
             <div className="bg-pramukh-navy p-6 rounded-[2.5rem] shadow-2xl border-4 border-pramukh-red transform -rotate-2 flex items-center justify-center overflow-hidden">
                 {config.bapsSymbol && !symErr ? (
                    <img src={config.bapsSymbol} className="w-20 h-20 object-contain invert" alt="BAPS Logo" onError={() => setSymErr(true)} />
                 ) : (
                    <i className="fas fa-fire-alt text-5xl text-white"></i>
                 )}
             </div>
          </div>
          <h2 className="text-4xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none mb-1">
            OFFICIAL PORTAL
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mb-4">
            BAPS CHARITIES EVENT SYSTEM
          </p>
          <div className="flex justify-center items-center space-x-2 opacity-30 grayscale">
             {config.bapsFullLogo ? (
                <img src={config.bapsFullLogo} className="h-4 object-contain" alt="BAPS" />
             ) : (
                <>
                    <i className="fas fa-certificate text-[10px]"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">BAPS CHARITIES OFFICIAL</span>
                </>
             )}
          </div>
        </div>
        
        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-[0.2em] mb-1 block">OFFICIAL USERNAME</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300">
                  <i className="fas fa-id-card-clip"></i>
                </div>
                <input
                  type="text"
                  required
                  className="w-full pl-14 pr-6 py-5 border-2 border-slate-50 bg-slate-50 rounded-2xl focus:outline-none focus:border-pramukh-navy focus:bg-white transition-all font-black text-slate-800 shadow-inner italic uppercase"
                  placeholder="ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-[0.2em] mb-1 block">ACCESS KEY</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-14 pr-6 py-5 border-2 border-slate-50 bg-slate-50 rounded-2xl focus:outline-none focus:border-pramukh-navy focus:bg-white transition-all font-black text-slate-800 shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border-2 border-red-100 animate-pulse">
              <i className="fas fa-lock mr-2"></i> {error}
            </div>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-6 px-4 border border-transparent text-sm font-black rounded-[2rem] text-white bg-pramukh-navy hover:brightness-125 focus:outline-none shadow-[0_15px_40px_-10px_rgba(11,50,81,0.6)] disabled:opacity-50 transition-all uppercase tracking-[0.4em] italic"
            >
              {loading ? 'AUTHENTICATING...' : 'SECURE SIGN IN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
