
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../../types';
import { databaseService } from '../../services/api';

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { config, updateConfig } = useTournament();
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'players' | 'staff' | 'settings'>('matches');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Tournament Settings State
  const [tempConfig, setTempConfig] = useState<TournamentConfig>(config);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '', logoUrl: '' });
  const [newMatch, setNewMatch] = useState({ teamAId: '', teamBId: '', venue: 'Indoor Arena 1', date: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.SCORER });

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
      setIsOffline(databaseService.isOffline);
    } catch (err) {
      console.error("Critical Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.shortName) return;
    await databaseService.createTeam(newTeam);
    setShowTeamModal(false);
    setNewTeam({ name: '', shortName: '', logoUrl: '' });
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

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setNewUser({ username: user.username, password: user.password || '', role: user.role });
    setShowUserModal(true);
  };

  const handleSaveSettings = async () => {
    await updateConfig(tempConfig);
    alert("Branding Settings Updated Successfully!");
  };

  const handleCreateMatch = async () => {
    const teamA = teams.find(t => t.id === newMatch.teamAId);
    const teamB = teams.find(t => t.id === newMatch.teamBId);
    if (!teamA || !teamB) return;

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

  if (!isAdmin) return <div className="p-8 text-center text-red-600 font-black font-din uppercase tracking-widest">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 font-din">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[12px] border-pramukh-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <i className="fas fa-shield-halved text-8xl text-pramukh-navy"></i>
        </div>
        <div className="relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
             <h1 className="text-4xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none">ADMIN CONTROL</h1>
             {isOffline ? (
               <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">Local Mode</span>
             ) : (
               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-200">MongoDB Online</span>
             )}
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] italic">{config.name}</p>
        </div>
        <div className="flex gap-3 relative z-10">
          <button onClick={() => { setEditingUser(null); setNewUser({ username: '', password: '', role: UserRole.SCORER }); setShowUserModal(true); }} className="bg-pramukh-navy hover:brightness-125 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all uppercase text-xs tracking-widest italic border-2 border-white/10">Add Scorer</button>
          <button onClick={() => setShowMatchModal(true)} className="bg-pramukh-red hover:brightness-110 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all uppercase text-xs tracking-widest italic border-2 border-white/10">New Match</button>
        </div>
      </div>

      <div className="flex space-x-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full">
        {(['matches', 'teams', 'players', 'staff', 'settings'] as const).map((tab) => (
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
                    {matches.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center space-x-3">
                              <span className="font-black text-lg text-slate-800 italic uppercase">{m.teamA.shortName} <span className="text-pramukh-red text-xs mx-1">vs</span> {m.teamB.shortName}</span>
                           </div>
                        </td>
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

            {activeTab === 'settings' && (
              <div className="p-12 space-y-16">
                {/* Tournament Specifics */}
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
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Short Title (Navbar)</label>
                                <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={tempConfig.shortName} onChange={e => setTempConfig({...tempConfig, shortName: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Year</label>
                                <input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={tempConfig.year} onChange={e => setTempConfig({...tempConfig, year: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tournament Logo (URL or Base64)</label>
                            <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={tempConfig.logoUrl} onChange={e => setTempConfig({...tempConfig, logoUrl: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center border-4 border-dashed border-slate-200">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-8">Event Preview</span>
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl mb-6 w-32 h-32 flex items-center justify-center overflow-hidden border-2 border-pramukh-red/10">
                            {tempConfig.logoUrl ? <img src={tempConfig.logoUrl} className="w-full h-full object-contain" /> : <i className="fas fa-trophy text-5xl text-pramukh-navy"></i>}
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">{tempConfig.name}</h4>
                    </div>
                    </div>
                </section>

                {/* Organization Assets (BAPS Charities Specific) */}
                <section>
                    <h3 className="text-2xl font-black text-pramukh-navy uppercase italic mb-8 border-b-4 border-pramukh-red pb-4 w-fit">ORGANIZATION BRANDING</h3>
                    <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest">Provide the exact logos for BAPS Charities here. You can paste image URLs or Base64 data.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">BAPS Full Logo (Horizontal)</label>
                                <textarea rows={3} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-[10px] break-all" placeholder="Paste Logo URL or Base64 Data" value={tempConfig.bapsFullLogo} onChange={e => setTempConfig({...tempConfig, bapsFullLogo: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">BAPS Flame Symbol</label>
                                <textarea rows={3} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-[10px] break-all" placeholder="Paste Symbol URL or Base64 Data" value={tempConfig.bapsSymbol} onChange={e => setTempConfig({...tempConfig, bapsSymbol: e.target.value})} />
                            </div>
                            <button onClick={handleSaveSettings} className="bg-pramukh-navy text-white font-black px-10 py-5 rounded-2xl uppercase italic tracking-widest shadow-xl hover:brightness-125 transition-all w-full lg:w-fit">Update System Branding</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="bg-pramukh-navy rounded-[2rem] p-6 flex flex-col items-center justify-center text-center shadow-lg">
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-4">Symbol Preview</span>
                                <div className="bg-white/10 p-4 rounded-xl w-24 h-24 flex items-center justify-center overflow-hidden">
                                    {tempConfig.bapsSymbol ? <img src={tempConfig.bapsSymbol} className="w-full h-full object-contain invert" /> : <i className="fas fa-fire-alt text-4xl text-white"></i>}
                                </div>
                             </div>
                             <div className="bg-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center shadow-lg">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Full Logo Preview</span>
                                <div className="w-full flex items-center justify-center h-24">
                                    {tempConfig.bapsFullLogo ? <img src={tempConfig.bapsFullLogo} className="w-full h-full object-contain" /> : <span className="text-xs font-black uppercase text-slate-300">No Logo</span>}
                                </div>
                             </div>
                        </div>
                    </div>
                </section>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                  <div key={u.id} className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between group hover:border-pramukh-navy transition-all shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white italic shadow-lg ${u.role === UserRole.ADMIN ? 'bg-pramukh-red' : 'bg-pramukh-navy'}`}>
                        <i className={`fas ${u.role === UserRole.ADMIN ? 'fa-crown' : 'fa-clipboard-user'}`}></i>
                      </div>
                      <div>
                        <div className="font-black text-slate-800 uppercase italic leading-none text-lg">{u.username}</div>
                        <div className="text-[10px] text-slate-400 font-black tracking-widest mt-1 uppercase italic">{u.role}</div>
                      </div>
                    </div>
                    <button onClick={() => handleEditUser(u)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-300 hover:text-pramukh-navy hover:shadow-md transition-all border border-slate-100 flex items-center justify-center">
                       <i className="fas fa-edit"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between group hover:border-pramukh-navy transition-all shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-pramukh-navy rounded-2xl flex items-center justify-center font-black text-white italic overflow-hidden border-2 border-white shadow-lg">
                        {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : t.shortName}
                      </div>
                      <div className="font-black text-slate-800 uppercase italic leading-none">{t.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'players' && (
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {players.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-xl border-2 border-slate-100 flex items-center space-x-3 shadow-sm italic font-black uppercase text-slate-700 text-sm">
                        <i className="fas fa-user-circle text-slate-300"></i>
                        <span>{p.name}</span>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User / Scorer Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">{editingUser ? 'UPDATE ACCOUNT' : 'CREATE SCORER'}</h2>
            <div className="space-y-5">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Username</label>
                 <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Unique ID" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Key (Password)</label>
                 <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" placeholder="Secret Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleCreateUser} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">{editingUser ? 'Apply' : 'Save'}</button>
                <button onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red">
            <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center">REGISTER TEAM</h2>
            <div className="space-y-5">
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Full Team Name" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
              <input type="text" maxLength={3} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Short (3 Chars)" value={newTeam.shortName} onChange={e => setNewTeam({...newTeam, shortName: e.target.value.toUpperCase()})} />
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" placeholder="Logo Image URL (Optional)" value={newTeam.logoUrl} onChange={e => setNewTeam({...newTeam, logoUrl: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button onClick={handleCreateTeam} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg">Save Team</button>
                <button onClick={() => setShowTeamModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic">Cancel</button>
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
