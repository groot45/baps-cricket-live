
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../../types';
import { databaseService } from '../../services/api';

const AdminDashboard: React.FC = () =&gt; {
  const { isAdmin } = useAuth();
  const { config, updateConfig } = useTournament();
  const [activeTab, setActiveTab] = useState&lt;'matches' | 'teams' | 'players' | 'staff' | 'settings' | 'database'&gt;('matches');
  const [teams, setTeams] = useState&lt;Team[]&gt;([]);
  const [players, setPlayers] = useState&lt;Player[]&gt;([]);
  const [matches, setMatches] = useState&lt;Match[]&gt;([]);
  const [users, setUsers] = useState&lt;any[]&gt;([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'Offline' });

  const [tempConfig, setTempConfig] = useState&lt;TournamentConfig&gt;(config);
  const [mongoAppId, setMongoAppId] = useState(localStorage.getItem('realm_app_id') || '');

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const [editingUser, setEditingUser] = useState&lt;any&gt;(null);
  const [newTeam, setNewTeam] = useState({ name: '', shortName: '', logoUrl: '' });
  const [newMatch, setNewMatch] = useState({ teamAId: '', teamBId: '', venue: 'Indoor Arena 1', date: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.SCORER });

  const fetchData = async () =&gt; {
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
        connected: databaseService.isAtlasConnected, 
        mode: databaseService.isAtlasConnected ? 'Atlas Cloud (Live)' : 'Local Storage Only' 
      });
    } catch (err) {
      console.error("Critical Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() =&gt; {
    if (isAdmin) {
      databaseService.initRealm().then(() =&gt; fetchData());
    }
  }, [isAdmin]);

  useEffect(() =&gt; {
    setTempConfig(config);
  }, [config]);

  const handleConnectMongo = async () =&gt; {
    if (!mongoAppId) {
        alert("Please enter a valid App ID first.");
        return;
    }
    setLoading(true);
    await databaseService.initRealm(mongoAppId);
    await fetchData();
    setLoading(false);
    if (databaseService.isAtlasConnected) {
        alert("Success! Connected to MongoDB Atlas Cloud.");
    } else {
        alert("Connection failed. Check your App ID and ensure 'Allow Anonymous Authentication' is enabled in your MongoDB App Service dashboard.");
    }
  };

  const handleCreateTeam = async () =&gt; {
    if (!newTeam.name || !newTeam.shortName) return;
    await databaseService.createTeam(newTeam);
    setShowTeamModal(false);
    setNewTeam({ name: '', shortName: '', logoUrl: '' });
    fetchData();
  };

  const handleCreateUser = async () =&gt; {
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

  const handleSaveSettings = async () =&gt; {
    await updateConfig(tempConfig);
    alert("Branding Settings Updated Successfully!");
  };

  const handleCreateMatch = async () =&gt; {
    const teamA = teams.find(t =&gt; t.id === newMatch.teamAId);
    const teamB = teams.find(t =&gt; t.id === newMatch.teamBId);
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

  if (!isAdmin) return &lt;div className="p-8 text-center text-red-600 font-black font-din uppercase tracking-widest"&gt;Access Denied&lt;/div&gt;;

  return (
    &lt;div className="max-w-7xl mx-auto px-4 py-12 font-din"&gt;
      &lt;div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border-l-[12px] border-pramukh-navy relative overflow-hidden"&gt;
        &lt;div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"&gt;
           &lt;i className="fas fa-database text-8xl text-pramukh-navy"&gt;&lt;/i&gt;
        &lt;/div&gt;
        &lt;div className="relative z-10 text-center md:text-left"&gt;
          &lt;div className="flex items-center justify-center md:justify-start space-x-3 mb-2"&gt;
             &lt;h1 className="text-4xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none"&gt;ADMIN CONTROL&lt;/h1&gt;
             &lt;span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${dbStatus.connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}&gt;
               {dbStatus.mode}
             &lt;/span&gt;
          &lt;/div&gt;
          &lt;p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] italic"&gt;{config.name}&lt;/p&gt;
        &lt;/div&gt;
        &lt;div className="flex gap-3 relative z-10"&gt;
          &lt;button onClick={() =&gt; setShowUserModal(true)} className="bg-pramukh-navy hover:brightness-125 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all uppercase text-xs tracking-widest italic border-2 border-white/10"&gt;Add Staff&lt;/button&gt;
          &lt;button onClick={() =&gt; setShowMatchModal(true)} className="bg-pramukh-red hover:brightness-110 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all uppercase text-xs tracking-widest italic border-2 border-white/10"&gt;New Match&lt;/button&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="flex space-x-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full"&gt;
        {(['matches', 'teams', 'players', 'staff', 'settings', 'database'] as const).map((tab) =&gt; (
          &lt;button key={tab} onClick={() =&gt; setActiveTab(tab)} className={`px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${activeTab === tab ? 'bg-pramukh-navy text-white shadow-lg italic scale-105' : 'text-slate-400 hover:text-slate-600'}`}&gt;
            {tab}
          &lt;/button&gt;
        ))}
      &lt;/div&gt;

      &lt;div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[400px]"&gt;
        {loading ? (
          &lt;div className="flex justify-center items-center h-64"&gt;&lt;div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pramukh-navy"&gt;&lt;/div&gt;&lt;/div&gt;
        ) : (
          &lt;&gt;
            {activeTab === 'matches' && (
              &lt;div className="overflow-x-auto"&gt;
                &lt;table className="w-full text-left"&gt;
                  &lt;thead&gt;
                    &lt;tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em]"&gt;&lt;th className="px-8 py-5"&gt;Matchup&lt;/th&gt;&lt;th className="px-8 py-5"&gt;Schedule&lt;/th&gt;&lt;th className="px-8 py-5"&gt;Venue&lt;/th&gt;&lt;th className="px-8 py-5"&gt;Status&lt;/th&gt;&lt;th className="px-8 py-5 text-right"&gt;Action&lt;/th&gt;&lt;/tr&gt;
                  &lt;/thead&gt;
                  &lt;tbody className="divide-y divide-slate-50"&gt;
                    {matches.map(m =&gt; (
                      &lt;tr key={m.id} className="hover:bg-slate-50/50 transition-colors"&gt;
                        &lt;td className="px-8 py-6"&gt;
                           &lt;div className="flex items-center space-x-3"&gt;
                              &lt;span className="font-black text-lg text-slate-800 italic uppercase"&gt;{m.teamA.shortName} &lt;span className="text-pramukh-red text-xs mx-1"&gt;vs&lt;/span&gt; {m.teamB.shortName}&lt;/span&gt;
                           &lt;/div&gt;
                        &lt;/td&gt;
                        &lt;td className="px-8 py-6 text-sm font-black text-slate-500 uppercase"&gt;{new Date(m.startTime).toLocaleDateString()}&lt;/td&gt;
                        &lt;td className="px-8 py-6 text-sm font-black text-slate-500 uppercase italic"&gt;{m.venue}&lt;/td&gt;
                        &lt;td className="px-8 py-6 font-black uppercase italic text-xs tracking-widest text-slate-400"&gt;{m.status}&lt;/td&gt;
                        &lt;td className="px-8 py-6 text-right"&gt;&lt;button className="text-slate-300 hover:text-pramukh-navy"&gt;&lt;i className="fas fa-edit"&gt;&lt;/i&gt;&lt;/button&gt;&lt;/td&gt;
                      &lt;/tr&gt;
                    ))}
                  &lt;/tbody&gt;
                &lt;/table&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'database' && (
              &lt;div className="p-12 space-y-12"&gt;
                 &lt;div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 text-center"&gt;
                    &lt;div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-pramukh-navy border-4 border-slate-50"&gt;
                       &lt;i className={`fas fa-cloud-bolt text-3xl ${dbStatus.connected ? 'text-green-500' : 'text-slate-300'}`}&gt;&lt;/i&gt;
                    &lt;/div&gt;
                    &lt;h3 className="text-3xl font-black text-pramukh-navy uppercase italic mb-2 tracking-tighter"&gt;Vercel ↔ Atlas Cluster: &lt;span className="text-pramukh-red"&gt;nktsar9&lt;/span&gt;&lt;/h3&gt;
                    &lt;p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-10 max-w-md mx-auto"&gt;The app is currently in {dbStatus.mode}. Enter your MongoDB App ID below to enable cloud syncing.&lt;/p&gt;
                    
                    &lt;div className="max-w-md mx-auto space-y-4"&gt;
                       &lt;input 
                         type="text" 
                         className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-center text-xl tracking-widest focus:border-pramukh-navy outline-none shadow-inner" 
                         placeholder="Paste App ID (e.g. pc-live-abcde)" 
                         value={mongoAppId}
                         onChange={(e) =&gt; setMongoAppId(e.target.value)}
                       /&gt;
                       &lt;button onClick={handleConnectMongo} className="w-full bg-pramukh-navy text-white font-black py-5 rounded-2xl uppercase italic tracking-widest shadow-xl hover:brightness-125 transition-all"&gt;
                         Test & Connect Atlas
                       &lt;/button&gt;
                    &lt;/div&gt;
                 &lt;/div&gt;

                 &lt;div className="grid grid-cols-1 lg:grid-cols-2 gap-8"&gt;
                    &lt;div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm"&gt;
                       &lt;h4 className="text-lg font-black text-pramukh-navy uppercase italic mb-6"&gt;Setup in 3 Minutes&lt;/h4&gt;
                       &lt;ol className="space-y-4 text-sm font-bold text-slate-500 list-decimal pl-6"&gt;
                          &lt;li&gt;Login to MongoDB Atlas and find your cluster `nktsar9`.&lt;/li&gt;
                          &lt;li&gt;Click the App Services tab at the top of the Atlas page.&lt;/li&gt;
                          &lt;li&gt;Click Create App (choose "Build from Scratch").&lt;/li&gt;
                          &lt;li&gt;Copy the App ID (found at the top left of the dashboard).&lt;/li&gt;
                          &lt;li&gt;{"In your App Service: Go to Authentication &gt; Enable Allow Anonymous Login."}&lt;/li&gt;
                          &lt;li&gt;{"In your App Service: Go to Data Access &gt; Rules &gt; Link your nktsar9 cluster and enable Read/Write."}&lt;/li&gt;
                       &lt;/ol&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-pramukh-navy p-10 rounded-[2.5rem] shadow-xl text-white"&gt;
                       &lt;h4 className="text-lg font-black uppercase italic mb-6"&gt;Vercel Deployment Sync&lt;/h4&gt;
                       &lt;p className="text-sm opacity-80 mb-4 italic leading-relaxed"&gt;
                         {"To make this permanent for all users on Vercel, go to your Vercel Project Settings &gt; Environment Variables and add:"}
                       &lt;/p&gt;
                       &lt;div className="bg-white/10 p-5 rounded-xl font-mono text-xs mb-6 flex justify-between items-center group cursor-pointer border border-white/20" onClick={() =&gt; {
                          navigator.clipboard.writeText(`VITE_MONGODB_APP_ID=${mongoAppId || 'your-app-id'}`);
                          alert("Variable copied! Paste this in Vercel.");
                       }}&gt;
                          &lt;span className="truncate"&gt;VITE_MONGODB_APP_ID = &lt;span className="text-pramukh-red font-black"&gt;{mongoAppId || 'PASTE_ID_ABOVE'}&lt;/span&gt;&lt;/span&gt;
                          &lt;i className="fas fa-copy opacity-0 group-hover:opacity-100 transition-opacity ml-4"&gt;&lt;/i&gt;
                       &lt;/div&gt;
                                  <p className="text-[10px] uppercase font-black tracking-widest opacity-40">
  <strong>Note:</strong> Vercel builds take ~1 min to update after you save environment variables.
</p>
                    &lt;/div&gt;
                 &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'settings' && (
              &lt;div className="p-12 space-y-16"&gt;
                &lt;section&gt;
                    &lt;h3 className="text-2xl font-black text-pramukh-navy uppercase italic mb-8 border-b-4 border-pramukh-red pb-4 w-fit"&gt;TOURNAMENT BRANDING&lt;/h3&gt;
                    &lt;div className="grid grid-cols-1 lg:grid-cols-2 gap-12"&gt;
                    &lt;div className="space-y-6"&gt;
                        &lt;div className="space-y-1"&gt;
                            &lt;label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"&gt;Full Tournament Name&lt;/label&gt;
                            &lt;input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={tempConfig.name} onChange={e =&gt; setTempConfig({...tempConfig, name: e.target.value})} /&gt;
                        &lt;/div&gt;
                        &lt;div className="grid grid-cols-2 gap-4"&gt;
                            &lt;div className="space-y-1"&gt;
                                &lt;label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"&gt;Short Title (Navbar)&lt;/label&gt;
                                &lt;input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={tempConfig.shortName} onChange={e =&gt; setTempConfig({...tempConfig, shortName: e.target.value})} /&gt;
                            &lt;/div&gt;
                            &lt;div className="space-y-1"&gt;
                                &lt;label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"&gt;Year&lt;/label&gt;
                                &lt;input type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={tempConfig.year} onChange={e =&gt; setTempConfig({...tempConfig, year: parseInt(e.target.value)})} /&gt;
                            &lt;/div&gt;
                        &lt;/div&gt;
                        &lt;div className="space-y-1"&gt;
                            &lt;label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"&gt;Tournament Logo (URL)&lt;/label&gt;
                            &lt;input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={tempConfig.logoUrl} onChange={e =&gt; setTempConfig({...tempConfig, logoUrl: e.target.value})} /&gt;
                        &lt;/div&gt;
                        &lt;button onClick={handleSaveSettings} className="bg-pramukh-navy text-white font-black px-10 py-5 rounded-2xl uppercase italic tracking-widest shadow-xl hover:brightness-125 transition-all w-full lg:w-fit"&gt;Save Tournament Brand&lt;/button&gt;
                    &lt;/div&gt;
                    
                    &lt;div className="bg-slate-50 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center border-4 border-dashed border-slate-200"&gt;
                        &lt;div className="bg-white p-6 rounded-[2rem] shadow-xl mb-6 w-32 h-32 flex items-center justify-center overflow-hidden border-2 border-pramukh-red/10"&gt;
                            {tempConfig.logoUrl ? &lt;img src={tempConfig.logoUrl} className="w-full h-full object-contain" /&gt; : &lt;i className="fas fa-trophy text-5xl text-pramukh-navy"&gt;&lt;/i&gt;}
                        &lt;/div&gt;
                        &lt;h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter"&gt;{tempConfig.name}&lt;/h4&gt;
                    &lt;/div&gt;
                    &lt;/div&gt;
                &lt;/section&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'staff' && (
              &lt;div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"&gt;
                {users.map(u =&gt; (
                  &lt;div key={u.id} className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between group hover:border-pramukh-navy transition-all shadow-sm"&gt;
                    &lt;div className="flex items-center space-x-4"&gt;
                      &lt;div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white italic shadow-lg ${u.role === UserRole.ADMIN ? 'bg-pramukh-red' : 'bg-pramukh-navy'}`}&gt;
                        &lt;i className={`fas ${u.role === UserRole.ADMIN ? 'fa-crown' : 'fa-clipboard-user'}`}&gt;&lt;/i&gt;
                      &lt;/div&gt;
                      &lt;div&gt;
                        &lt;div className="font-black text-slate-800 uppercase italic leading-none text-lg"&gt;{u.username}&lt;/div&gt;
                        &lt;div className="text-[10px] text-slate-400 font-black tracking-widest mt-1 uppercase italic"&gt;{u.role}&lt;/div&gt;
                      &lt;/div&gt;
                    &lt;/div&gt;
                    &lt;button onClick={() =&gt; { setEditingUser(u); setNewUser({ username: u.username, password: '', role: u.role }); setShowUserModal(true); }} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-300 hover:text-pramukh-navy hover:shadow-md transition-all border border-slate-100 flex items-center justify-center"&gt;
                       &lt;i className="fas fa-edit"&gt;&lt;/i&gt;
                    &lt;/button&gt;
                  &lt;/div&gt;
                ))}
              &lt;/div&gt;
            )}
          &lt;/&gt;
        )}
      &lt;/div&gt;

      {showUserModal && (
        &lt;div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]"&gt;
          &lt;div className="bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl border-b-[16px] border-pramukh-red"&gt;
            &lt;h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center"&gt;{editingUser ? 'UPDATE ACCOUNT' : 'CREATE STAFF'}&lt;/h2&gt;
            &lt;div className="space-y-5"&gt;
              &lt;input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" placeholder="Username" value={newUser.username} onChange={e =&gt; setNewUser({...newUser, username: e.target.value})} /&gt;
              &lt;input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black italic" value={newUser.password} onChange={e =&gt; setNewUser({...newUser, password: e.target.value})} /&gt;
              &lt;select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={newUser.role} onChange={e =&gt; setNewUser({...newUser, role: e.target.value as UserRole})}&gt;
                 &lt;option value={UserRole.SCORER}&gt;Scorer&lt;/option&gt;
                 &lt;option value={UserRole.ADMIN}&gt;Admin&lt;/option&gt;
              &lt;/select&gt;
              &lt;div className="flex gap-4 pt-4"&gt;
                &lt;button onClick={handleCreateUser} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg"&gt;{editingUser ? 'Update' : 'Save'}&lt;/button&gt;
                &lt;button onClick={() =&gt; setShowUserModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic"&gt;Cancel&lt;/button&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}

      {showMatchModal && (
        &lt;div className="fixed inset-0 bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]"&gt;
          &lt;div className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-2xl border-b-[16px] border-pramukh-red"&gt;
            &lt;h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8 text-center"&gt;NEW FIXTURE&lt;/h2&gt;
            &lt;div className="space-y-6"&gt;
               &lt;select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={newMatch.teamAId} onChange={e =&gt; setNewMatch({...newMatch, teamAId: e.target.value})}&gt;
                 &lt;option value=""&gt;Select Team A&lt;/option&gt;
                 {teams.map(t =&gt; &lt;option key={t.id} value={t.id}&gt;{t.name}&lt;/option&gt;)}
               &lt;/select&gt;
               &lt;select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" value={newMatch.teamBId} onChange={e =&gt; setNewMatch({...newMatch, teamBId: e.target.value})}&gt;
                 &lt;option value=""&gt;Select Team B&lt;/option&gt;
                 {teams.map(t =&gt; &lt;option key={t.id} value={t.id}&gt;{t.name}&lt;/option&gt;)}
               &lt;/select&gt;
               &lt;input type="datetime-local" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase italic" onChange={e =&gt; setNewMatch({...newMatch, date: e.target.value})} /&gt;
               &lt;div className="flex gap-4"&gt;
                &lt;button onClick={handleCreateMatch} className="flex-1 bg-pramukh-navy text-white font-black py-4 rounded-xl uppercase italic shadow-lg"&gt;Confirm&lt;/button&gt;
                &lt;button onClick={() =&gt; setShowMatchModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-xl uppercase italic"&gt;Cancel&lt;/button&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}
    &lt;/div&gt;
  );
};

export default AdminDashboard;
