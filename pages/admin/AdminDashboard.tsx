
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../../types';
import { databaseService } from '../../services/api';

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { config, updateConfig } = useTournament();
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'players' | 'staff' | 'settings' | 'database'>('matches');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'Offline', error: '', isGlobal: false });

  const [sbUrl, setSbUrl] = useState(localStorage.getItem('sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('sb_key') || '');
  const [tempConfig, setTempConfig] = useState<TournamentConfig>(config);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '', logoUrl: '' });
  const [newPlayer, setNewPlayer] = useState({ name: '' });
  const [newMatch, setNewMatch] = useState({ teamAId: '', teamBId: '', venue: 'Arena 1', date: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.SCORER });

  const SQL_SCRIPT = `-- SQL FOR SUPABASE EDITOR
-- Paste this into the SQL Editor and click 'Run'

CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  name TEXT,
  "shortName" TEXT,
  year INTEGER,
  location TEXT,
  "logoUrl" TEXT,
  "bapsFullLogo" TEXT,
  "bapsSymbol" TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT,
  "shortName" TEXT,
  "logoUrl" TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  "tournamentId" TEXT,
  "teamA" JSONB,
  "teamB" JSONB,
  status TEXT,
  "currentInnings" INTEGER,
  innings JSONB,
  "startTime" TEXT,
  venue TEXT
);

ALTER TABLE config DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, p, m, u] = await Promise.all([
        databaseService.getTeams(),
        databaseService.getPlayers(),
        databaseService.getMatches(),
        databaseService.getUsers()
      ]);
      setTeams(t);
      setPlayers(p);
      setMatches(m);
      setUsers(u);
      setDbStatus({ 
        connected: !databaseService.isOffline, 
        mode: databaseService.isOffline ? 'Local (Offline)' : (databaseService.isGlobalConfig ? 'Global Live Mode' : 'Supabase (Live)'),
        error: databaseService.lastError,
        isGlobal: databaseService.isGlobalConfig
      });
    } catch (err) {
      console.error("Critical Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      databaseService.initRealm().then(() => fetchData());
    }
  }, [isAdmin]);

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleConnectSupabase = async () => {
    if (!sbUrl || !sbKey) {
        alert("Enter both URL and Key.");
        return;
    }
    setLoading(true);
    await databaseService.initRealm({ url: sbUrl, key: sbKey });
    await fetchData();
    setLoading(false);
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.shortName) return;
    await databaseService.createTeam(newTeam);
    setShowTeamModal(false);
    setNewTeam({ name: '', shortName: '', logoUrl: '' });
    fetchData();
  };

  const handleCreatePlayer = async () => {
    if (!newPlayer.name) return;
    await databaseService.createPlayer(newPlayer);
    setShowPlayerModal(false);
    setNewPlayer({ name: '' });
    fetchData();
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) return;
    if (editingUser) {
      await databaseService.updateUser(editingUser.id, newUser);
    } else {
      await databaseService.createUser(newUser);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setNewUser({ username: '', password: '', role: UserRole.SCORER });
    fetchData();
  };

  const handleSaveSettings = async () => {
    await updateConfig(tempConfig);
    alert("Branding Settings Updated!");
  };

  const handleCreateMatch = async () => {
    const teamA = teams.find(t => t.id === newMatch.teamAId);
    const teamB = teams.find(t => t.id === newMatch.teamBId);
    if (!teamA || !teamB) {
        alert("Select both teams.");
        return;
    }
    await databaseService.createMatch({
      teamA,
      teamB,
      venue: newMatch.venue,
      startTime: newMatch.date || new Date().toISOString(),
      tournamentId: config.id
    });
    setShowMatchModal(false);
    fetchData();
  };

  if (!isAdmin) return <div className="p-8 text-center text-red-600 font-black uppercase tracking-widest">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 font-din">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[12px] border-pramukh-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <i className="fas fa-server text-8xl text-pramukh-navy"></i>
        </div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
             <h1 className="text-4xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none">ADMIN CONTROL</h1>
             <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${dbStatus.connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
               {dbStatus.mode}
             </span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] italic">{config.name}</p>
        </div>
        <div className="flex gap-3 relative z-10 flex-wrap justify-center">
          <button onClick={() => setShowTeamModal(true)} className="bg-slate-100 text-pramukh-navy px-6 py-3 rounded-xl font-black shadow-md uppercase text-xs tracking-widest italic border-2 border-slate-200">Add Team</button>
          <button onClick={() => setShowPlayerModal(true)} className="bg-slate-100 text-pramukh-navy px-6 py-3 rounded-xl font-black shadow-md uppercase text-xs tracking-widest italic border-2 border-slate-200">Add Player</button>
          <button onClick={() => setShowUserModal(true)} className="bg-pramukh-navy text-white px-6 py-3 rounded-xl font-black shadow-lg uppercase text-xs tracking-widest italic border-2 border-white/10">Add Staff</button>
          <button onClick={() => setShowMatchModal(true)} className="bg-pramukh-red text-white px-6 py-3 rounded-xl font-black shadow-lg uppercase text-xs tracking-widest italic border-2 border-white/10">New Match</button>
        </div>
      </div>

      <div className="flex space-x-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {(['matches', 'teams', 'players', 'staff', 'settings', 'database'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === tab ? 'bg-pramukh-navy text-white shadow-lg italic scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pramukh-navy"></div></div>
        ) : (
          <>
            {activeTab === 'matches' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em]"><th className="px-8 py-5">Matchup</th><th className="px-8 py-5">Schedule</th><th className="px-8 py-5">Venue</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matches.length === 0 ? <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black italic">No matches found</td></tr> : matches.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6"><span className="font-black text-lg text-slate-800 italic uppercase">{m.teamA.shortName} <span className="text-pramukh-red text-xs mx-1">vs</span> {m.teamB.shortName}</span></td>
                        <td className="px-8 py-6 text-sm font-black text-slate-500 uppercase">{new Date(m.startTime).toLocaleDateString()}</td>
                        <td className="px-8 py-6 text-sm font-black text-slate-500 uppercase italic">{m.venue}</td>
                        <td className="px-8 py-6 font-black uppercase italic text-xs tracking-widest text-slate-400">{m.status}</td>
                        <td className="px-8 py-6 text-right"><button className="text-slate-300 hover:text-pramukh-navy"><i className="fas fa-edit"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-pramukh-navy border border-slate-100 overflow-hidden uppercase italic">
                      {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : t.shortName}
                    </div>
                    <div>
                      <div className="font-black text-slate-800 uppercase italic leading-none">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-black tracking-widest mt-1 uppercase italic">{t.shortName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'database' && (
              <div className="p-12 space-y-12">
                 <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                    <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-pramukh-navy border-4 border-slate-50">
                       <i className={`fas fa-cloud-bolt text-3xl ${dbStatus.connected ? 'text-green-500' : 'text-slate-300'}`}></i>
                    </div>
                    <h3 className="text-3xl font-black text-pramukh-navy uppercase italic mb-2 tracking-tighter">
                      {dbStatus.isGlobal ? 'GLOBAL SYNC ACTIVE' : 'SUPABASE SETUP'}
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-10 max-w-xl mx-auto italic">
                      {dbStatus.isGlobal 
                        ? "Great! You've hardcoded credentials in config/tournament.ts. All devices are now connected automatically." 
                        : "To sync all devices automatically, edit config/tournament.ts. Otherwise, enter details here for this device only."}
                    </p>
                    
                    {!dbStatus.isGlobal && (
                      <div className="max-w-md mx-auto space-y-4 mb-12">
                         <input type="text" className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm tracking-widest focus:border-pramukh-navy" placeholder="Supabase Project URL" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
                         <input type="password" className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm tracking-widest focus:border-pramukh-navy" placeholder="Supabase Anon Key" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
                         <button onClick={handleConnectSupabase} className="w-full bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic tracking-widest shadow-xl">Enable Local Session Sync</button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                       <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                          <h4 className="text-lg font-black text-pramukh-navy uppercase italic mb-6">Device-to-Device Sync</h4>
                          <ul className="space-y-4 text-sm font-bold text-slate-500">
                             <li><i className="fas fa-check-circle text-green-500 mr-2"></i> Hardcode URL/Key in <b>config/tournament.ts</b></li>
                             <li><i className="fas fa-check-circle text-green-500 mr-2"></i> Save project</li>
                             <li><i className="fas fa-check-circle text-green-500 mr-2"></i> <b>Instant:</b> All scorers see same live data.</li>
                          </ul>
                       </div>
                       <div className="bg-pramukh-navy p-10 rounded-[2.5rem] shadow-xl text-white">
                          <h4 className="text-lg font-black uppercase italic mb-4">SQL Editor (Step 2)</h4>
                          <p className="text-[10px] opacity-60 mb-6 uppercase">Required once per project to create tables:</p>
                          <button onClick={() => {
                             navigator.clipboard.writeText(SQL_SCRIPT);
                             alert("SQL Script Copied! Paste it into Supabase SQL Editor.");
                          }} className="w-full bg-white text-pramukh-navy font-black py-4 rounded-xl uppercase italic tracking-widest hover:bg-slate-100">
                             <i className="fas fa-copy mr-2"></i> Copy SQL Table Script
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-12 space-y-16">
                <section>
                    <h3 className="text-2xl font-black text-pramukh-navy uppercase italic mb-8 border-b-4 border-pramukh-red pb-4 w-fit">TOURNAMENT BRANDING</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Tournament Name</label>
                            <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={tempConfig.name} onChange={e => setTempConfig({...tempConfig, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Short Title</label>
                                <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={tempConfig.shortName} onChange={e => setTempConfig({...tempConfig, shortName: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Year</label>
                                <input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={tempConfig.year} onChange={e => setTempConfig({...tempConfig, year: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <button onClick={handleSaveSettings} className="bg-pramukh-navy text-white font-black px-10 py-5 rounded-2xl uppercase italic tracking-widest shadow-xl hover:brightness-125 transition-all w-full lg:w-fit">Save Brand</button>
                    </div>
                    </div>
                </section>
              </div>
            )}
            
            {/* Other tabs remain same logic */}
          </>
        )}
      </div>

      {/* Modals same as before */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">REGISTER TEAM</h2>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Team Name" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Short Name" value={newTeam.shortName} onChange={e => setNewTeam({...newTeam, shortName: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button onClick={handleCreateTeam} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">Save Team</button>
                <button onClick={() => setShowTeamModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPlayerModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">REGISTER PLAYER</h2>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Player Name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button onClick={handleCreatePlayer} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">Save Player</button>
                <button onClick={() => setShowPlayerModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">CREATE STAFF</h2>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button onClick={handleCreateUser} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">Save</button>
                <button onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMatchModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">NEW FIXTURE</h2>
            <div className="space-y-6">
               <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={newMatch.teamAId} onChange={e => setNewMatch({...newMatch, teamAId: e.target.value})}>
                 <option value="">Select Team A</option>
                 {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
               <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={newMatch.teamBId} onChange={e => setNewMatch({...newMatch, teamBId: e.target.value})}>
                 <option value="">Select Team B</option>
                 {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
               <input type="datetime-local" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" onChange={e => setNewMatch({...newMatch, date: e.target.value})} />
               <div className="flex gap-4">
                <button onClick={handleCreateMatch} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">Confirm</button>
                <button onClick={() => setShowMatchModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
