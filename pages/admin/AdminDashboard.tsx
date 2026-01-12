
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { Match, Team, Player, User, UserRole, TournamentConfig, BattingStyle, BowlingStyle, PlayerRole } from '../../types';
import { databaseService } from '../../services/api';

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { config, updateConfig } = useTournament();
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'players' | 'staff' | 'settings' | 'database'>('matches');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'Offline', error: '', isGlobal: false });

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sbUrl, setSbUrl] = useState(localStorage.getItem('sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('sb_key') || '');
  const [tempConfig, setTempConfig] = useState<TournamentConfig>(config);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [newTeam, setNewTeam] = useState({ name: '', shortName: '', logoUrl: '' });
  const [newPlayer, setNewPlayer] = useState({ 
    name: '', 
    teamId: '', 
    battingStyle: 'Right Hand' as BattingStyle, 
    bowlingStyle: 'Right Arm Fast' as BowlingStyle,
    role: 'Batsman' as PlayerRole 
  });
  const [newMatch, setNewMatch] = useState({ teamAId: '', teamBId: '', venue: 'Arena 1', date: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.SCORER });

  const MIGRATION_SCRIPT = `-- SUPABASE MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor to ensure all columns exist!

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, name TEXT, "shortName" TEXT, year INTEGER, location TEXT, "logoUrl" TEXT, "bapsFullLogo" TEXT, "bapsSymbol" TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT, "shortName" TEXT, "logoUrl" TEXT);
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT, "teamId" TEXT, "battingStyle" TEXT, "bowlingStyle" TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, "tournamentId" TEXT, "teamA" JSONB, "teamB" JSONB, status TEXT, "currentInnings" INTEGER, innings JSONB, "startTime" TEXT, venue TEXT, "maxOvers" INTEGER, "winnerId" TEXT, "resultSummary" TEXT);

-- 2. Ensure missing columns exist (Safe execution)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='battingStyle') THEN
        ALTER TABLE players ADD COLUMN "battingStyle" TEXT DEFAULT 'Right Hand';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='bowlingStyle') THEN
        ALTER TABLE players ADD COLUMN "bowlingStyle" TEXT DEFAULT 'None';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='maxOvers') THEN
        ALTER TABLE matches ADD COLUMN "maxOvers" INTEGER DEFAULT 20;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='winnerId') THEN
        ALTER TABLE matches ADD COLUMN "winnerId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='resultSummary') THEN
        ALTER TABLE matches ADD COLUMN "resultSummary" TEXT;
    END IF;
END $$;

-- 3. Disable RLS for public access (Admin only app)
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
      
      // Safety Check: Never overwrite local data with NOTHING unless explicitly empty
      if (t.length > 0 || teams.length === 0) setTeams(t);
      if (p.length > 0 || players.length === 0) setPlayers(p);
      if (m.length > 0 || matches.length === 0) setMatches(m);
      if (u.length > 0 || users.length === 0) setUsers(u);
      
      // Update selected team if it was set
      if (selectedTeam) {
        const updated = t.find(team => team.id === selectedTeam.id);
        if (updated) setSelectedTeam(updated);
      }

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

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.shortName) return;
    try {
      const created = await databaseService.createTeam(newTeam);
      setTeams(prev => [...prev, created]);
      setShowTeamModal(false);
      setNewTeam({ name: '', shortName: '', logoUrl: '' });
    } catch (e) {
      alert("Failed to create team");
    }
  };

  const handleCreatePlayer = async () => {
    if (!newPlayer.name || !newPlayer.teamId) { 
      alert("Error: Player name and team assignment are required."); 
      return; 
    }
    
    try {
      setLoading(true);
      const created = await databaseService.createPlayer(newPlayer);
      setPlayers(prev => [...prev, created]);
      setShowPlayerModal(false);
      
      const currentTid = newPlayer.teamId;
      setNewPlayer({ 
        name: '', 
        teamId: currentTid, 
        battingStyle: 'Right Hand', 
        bowlingStyle: 'Right Arm Fast', 
        role: 'Batsman' 
      });
    } catch (e) {
      console.error(e);
      alert("Failed to add player. App continuing in local mode.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async () => {
    const teamA = teams.find(t => t.id === newMatch.teamAId);
    const teamB = teams.find(t => t.id === newMatch.teamBId);
    if (!teamA || !teamB) { alert("Select both teams."); return; }
    
    try {
      const created = await databaseService.createMatch({ 
        teamA, 
        teamB, 
        venue: newMatch.venue, 
        startTime: newMatch.date || new Date().toISOString(), 
        tournamentId: config.id 
      });
      setMatches(prev => [...prev, created]);
      setShowMatchModal(false);
    } catch (e) {
      alert("Failed to create match");
    }
  };

  const handleConnectSupabase = async () => {
    if (!sbUrl || !sbKey) { alert("Enter both URL and Key."); return; }
    setLoading(true);
    await databaseService.initRealm({ url: sbUrl, key: sbKey });
    await fetchData();
    setLoading(false);
  };

  if (!isAdmin) return <div className="p-8 text-center text-red-600 font-black uppercase tracking-widest">Access Denied</div>;

  const rosterPlayers = players.filter(p => p.teamId === selectedTeam?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 font-din text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[12px] border-pramukh-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-pramukh-navy">
           <i className="fas fa-server text-8xl"></i>
        </div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
             <h1 className="text-4xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none">ADMIN CONTROL</h1>
             <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${dbStatus.connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'}`}>
               {dbStatus.mode}
             </span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] italic">{config.name}</p>
        </div>
        <div className="flex gap-3 relative z-10 flex-wrap justify-center">
          <button onClick={() => { setActiveTab('teams'); setShowTeamModal(true); }} className="bg-slate-100 text-pramukh-navy px-6 py-3 rounded-xl font-black shadow-md uppercase text-xs tracking-widest italic border-2 border-slate-200">New Team</button>
          <button onClick={() => { setActiveTab('staff'); setShowUserModal(true); }} className="bg-pramukh-navy text-white px-6 py-3 rounded-xl font-black shadow-lg uppercase text-xs tracking-widest italic border-2 border-white/10">Add Staff</button>
          <button onClick={() => { setActiveTab('matches'); setShowMatchModal(true); }} className="bg-pramukh-red text-white px-6 py-3 rounded-xl font-black shadow-lg uppercase text-xs tracking-widest italic border-2 border-white/10">New Match</button>
        </div>
      </div>

      <div className="flex space-x-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {(['matches', 'teams', 'players', 'staff', 'settings', 'database'] as const).map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedTeam(null); }} className={`px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === tab ? 'bg-pramukh-navy text-white shadow-lg italic scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab}
          </button>
        ))}
        <button onClick={fetchData} className="px-4 py-3 rounded-xl text-pramukh-red hover:bg-red-50 transition-colors" title="Force Refresh Sync">
          <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[500px]">
        {loading && teams.length === 0 ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pramukh-navy"></div></div>
        ) : (
          <>
            {activeTab === 'matches' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em]"><th className="px-8 py-5">Matchup</th><th className="px-8 py-5">Schedule</th><th className="px-8 py-5">Venue</th><th className="px-8 py-5 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matches.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black italic">No matches scheduled</td></tr> : matches.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-8 py-6"><span className="font-black text-lg text-slate-800 italic uppercase">{m.teamA.shortName} <span className="text-pramukh-red text-xs mx-1">vs</span> {m.teamB.shortName}</span></td>
                        <td className="px-8 py-6 text-sm font-black text-slate-500 uppercase">{new Date(m.startTime).toLocaleDateString()}</td>
                        <td className="px-8 py-6 text-sm font-black text-slate-500 uppercase italic">{m.venue}</td>
                        <td className="px-8 py-6 text-right"><button className="text-slate-300 hover:text-pramukh-navy"><i className="fas fa-edit"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'teams' && !selectedTeam && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(t => (
                  <div key={t.id} onClick={() => setSelectedTeam(t)} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex items-center space-x-4 shadow-sm cursor-pointer hover:border-pramukh-red transition-all group">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-pramukh-navy border border-slate-100 shadow-inner overflow-hidden uppercase italic">
                      {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : t.shortName}
                    </div>
                    <div className="flex-grow">
                      <div className="font-black text-slate-800 uppercase italic leading-none group-hover:text-pramukh-red">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-black tracking-widest mt-1 uppercase italic">{t.shortName} • {players.filter(p => p.teamId === t.id).length} Players</div>
                    </div>
                    <i className="fas fa-arrow-right text-slate-200 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'teams' && selectedTeam && (
              <div className="p-10">
                <button onClick={() => setSelectedTeam(null)} className="mb-8 text-pramukh-navy font-black text-xs uppercase italic tracking-widest hover:text-pramukh-red transition-colors">
                   <i className="fas fa-arrow-left mr-2"></i> Back to Teams
                </button>
                <div className="flex flex-col lg:flex-row gap-10">
                   <div className="lg:w-1/3 space-y-8">
                      <div className="bg-slate-50 p-10 rounded-[3rem] text-center border-2 border-slate-100">
                         <div className="w-32 h-32 bg-white rounded-[2rem] mx-auto mb-6 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center font-black text-3xl text-pramukh-navy">
                            {selectedTeam.logoUrl ? <img src={selectedTeam.logoUrl} className="w-full h-full object-cover" /> : selectedTeam.shortName}
                         </div>
                         <h2 className="text-3xl font-black text-pramukh-navy uppercase italic tracking-tighter mb-2">{selectedTeam.name}</h2>
                         <div className="space-y-4 mt-6">
                            <button onClick={() => { 
                              setNewPlayer({ ...newPlayer, teamId: selectedTeam.id }); 
                              setShowPlayerModal(true); 
                            }} className="w-full bg-pramukh-red text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest italic shadow-lg active:scale-95 transition-transform">Add Player to Squad</button>
                         </div>
                      </div>
                   </div>
                   <div className="lg:w-2/3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 italic">TEAM ROSTER ({rosterPlayers.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {rosterPlayers.length === 0 ? <div className="col-span-full p-20 text-center text-slate-300 font-black italic border-2 border-dashed border-slate-100 rounded-[2rem]">Squad is empty</div> : rosterPlayers.map(p => (
                           <div key={p.id} className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                              <div><div className="font-black uppercase italic text-slate-800">{p.name}</div><div className="flex space-x-2 mt-1"><span className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-black uppercase tracking-widest">{p.role}</span></div></div>
                              <i className="fas fa-user-circle text-slate-200 text-xl"></i>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="p-12 space-y-12">
                 <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                    <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-pramukh-navy border-4 border-slate-50"><i className={`fas fa-cloud-bolt text-3xl ${dbStatus.connected ? 'text-green-500' : 'text-slate-300'}`}></i></div>
                    <h3 className="text-3xl font-black text-pramukh-navy uppercase italic mb-2 tracking-tighter">SUPABASE SCHEMA MANAGER</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-10 max-w-xl mx-auto italic leading-relaxed">
                      If you see errors like "Column not found", run this script in your Supabase SQL Editor to synchronize the schema.
                    </p>
                    <div className="bg-pramukh-navy p-10 rounded-[2.5rem] shadow-xl text-white text-left max-w-2xl mx-auto">
                       <h4 className="text-lg font-black uppercase italic mb-4">Migration Script</h4>
                       <div className="bg-black/20 p-4 rounded-xl mb-6 max-h-48 overflow-y-auto text-[10px] font-mono whitespace-pre opacity-70 border border-white/10">
                          {MIGRATION_SCRIPT}
                       </div>
                       <button onClick={() => { navigator.clipboard.writeText(MIGRATION_SCRIPT); alert("Migration Script Copied!"); }} className="w-full bg-white text-pramukh-navy font-black py-4 rounded-xl uppercase italic tracking-widest hover:bg-slate-100 transition-colors"><i className="fas fa-copy mr-2"></i> Copy Migration SQL</button>
                    </div>
                 </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MATCH MODAL */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">NEW FIXTURE</h2>
            <div className="space-y-6">
               <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" value={newMatch.teamAId} onChange={e => setNewMatch({...newMatch, teamAId: e.target.value})}><option value="">Select Team A</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
               <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" value={newMatch.teamBId} onChange={e => setNewMatch({...newMatch, teamBId: e.target.value})}><option value="">Select Team B</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
               <input type="datetime-local" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" onChange={e => setNewMatch({...newMatch, date: e.target.value})} />
               <div className="flex gap-4"><button onClick={handleCreateMatch} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg active:scale-95 transition-transform">Confirm</button><button onClick={() => setShowMatchModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic active:scale-95 transition-transform">Cancel</button></div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER MODAL */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-2 text-center">ADD TO SQUAD</h2>
            <p className="text-center text-[10px] font-black text-pramukh-red uppercase tracking-widest mb-8 italic">ASSIGNING TO: {teams.find(t => t.id === newPlayer.teamId)?.name}</p>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" placeholder="Full Name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Role</label><select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy outline-none" value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value as PlayerRole})}><option value="Batsman">Batsman</option><option value="Bowler">Bowler</option><option value="All-Rounder">All-Rounder</option><option value="Wicket Keeper">Wicket Keeper</option></select></div>
                 <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Batting</label><select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy outline-none" value={newPlayer.battingStyle} onChange={e => setNewPlayer({...newPlayer, battingStyle: e.target.value as BattingStyle})}><option value="Right Hand">Right Hand</option><option value="Left Hand">Left Hand</option></select></div>
              </div>
              <div className="flex gap-4 pt-4"><button onClick={handleCreatePlayer} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg active:scale-95 transition-transform">Confirm Add</button><button onClick={() => setShowPlayerModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic active:scale-95 transition-transform">Cancel</button></div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">REGISTER TEAM</h2>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" placeholder="Team Name" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic focus:border-pramukh-navy focus:bg-white outline-none" placeholder="Short Name" value={newTeam.shortName} onChange={e => setNewTeam({...newTeam, shortName: e.target.value})} />
              <div className="flex gap-4 pt-4"><button onClick={handleCreateTeam} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg active:scale-95 transition-transform">Save Team</button><button onClick={() => setShowTeamModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic active:scale-95 transition-transform">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
