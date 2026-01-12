
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Match, Player } from '../../types';
import { databaseService } from '../../services/api';

const ScorerDashboard: React.FC = () => {
  const { isScorer } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showPlayerModal, setShowPlayerModal] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    const m = await databaseService.getMatches();
    const p = await databaseService.getPlayers();
    setMatches(m);
    setPlayers(p);
    setLoading(false);
  };

  useEffect(() => {
    if (isScorer) fetchMatches();
  }, [isScorer]);

  const handleScore = async (run: number, isWicket: boolean = false, extraType: string | null = null) => {
    if (!activeMatch) return;
    const inning = activeMatch.innings[activeMatch.currentInnings - 1];
    
    if (!inning.strikerId || !inning.nonStrikerId || !inning.currentBowlerId) {
        alert("Please assign both Batsmen and a Bowler first!");
        return;
    }

    try {
      const updatedMatch = await databaseService.updateMatchScore(activeMatch.id, { run, isWicket, extraType });
      setActiveMatch(updatedMatch);
    } catch (e) {
      console.error(e);
    }
  };

  const assignPlayer = async (playerId: string) => {
    if (!activeMatch || !showPlayerModal) return;
    const updates: any = {};
    if (showPlayerModal === 'striker') updates.strikerId = playerId;
    if (showPlayerModal === 'nonStriker') updates.nonStrikerId = playerId;
    if (showPlayerModal === 'bowler') updates.currentBowlerId = playerId;

    const updated = await databaseService.updateActivePlayers(activeMatch.id, updates);
    setActiveMatch(updated);
    setShowPlayerModal(null);
  };

  if (!isScorer) return <div className="p-8 text-center text-red-600 font-black uppercase tracking-widest font-din">Access Denied</div>;

  // Logic to filter players by team
  const currentInning = activeMatch?.innings[activeMatch.currentInnings - 1];
  const eligiblePlayers = players.filter(p => {
    if (!activeMatch || !showPlayerModal || !currentInning) return false;
    if (showPlayerModal === 'striker' || showPlayerModal === 'nonStriker') {
        return p.teamId === currentInning.battingTeamId;
    }
    if (showPlayerModal === 'bowler') {
        return p.teamId === currentInning.bowlingTeamId;
    }
    return false;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-40 font-din">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none">SCORING CONSOLE</h1>
         </div>
         <button onClick={() => setActiveMatch(null)} className="text-slate-400 hover:text-pramukh-navy text-xs font-black uppercase tracking-widest italic transition-all">
             <i className="fas fa-sign-out-alt mr-2"></i> Exit Match
         </button>
      </div>

      {!activeMatch ? (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border-t-[10px] border-pramukh-navy">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">AVAILABLE FIXTURES</h2>
          <div className="space-y-4">
             {loading ? <div className="text-center py-10 animate-pulse font-black italic">LOADING...</div> : matches.map(m => (
               <div key={m.id} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-pramukh-red cursor-pointer flex justify-between items-center transition-all group" onClick={() => setActiveMatch(m)}>
                  <div className="flex items-center space-x-6">
                    <div className="bg-pramukh-navy w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white italic">{m.teamA.shortName}</div>
                    <div className="font-black text-xl text-slate-800 uppercase italic">{m.teamA.name} <span className="text-pramukh-red text-xs mx-2">VS</span> {m.teamB.name}</div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 group-hover:text-pramukh-red"></i>
               </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            {/* LARGE SCORE READOUT */}
            <div className="bg-pramukh-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-[16px] border-pramukh-red">
               <div className="relative z-10">
                 <div className="text-9xl font-black italic tracking-tighter leading-none mb-4">
                    {activeMatch.innings[activeMatch.currentInnings-1]?.runs || 0}
                    <span className="text-pramukh-red mx-1">/</span>
                    {activeMatch.innings[activeMatch.currentInnings-1]?.wickets || 0}
                 </div>
                 <div className="text-3xl font-black text-slate-400 italic">
                    OVER {activeMatch.innings[activeMatch.currentInnings-1]?.overs || 0}.{activeMatch.innings[activeMatch.currentInnings-1]?.balls || 0}
                 </div>
               </div>
            </div>

            {/* PLAYER ASSIGNMENT CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">BATSMEN AT CREASE</h3>
                  <div className="space-y-4">
                     <button onClick={() => setShowPlayerModal('striker')} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${activeMatch.innings[activeMatch.currentInnings-1].strikerId ? 'bg-slate-50 border-pramukh-navy' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                        <div className="text-[9px] font-black uppercase text-slate-400 mb-1">STRIKER (ON STRIKE)</div>
                        <div className="font-black uppercase italic text-lg text-pramukh-navy">
                           {players.find(p => p.id === activeMatch.innings[activeMatch.currentInnings-1].strikerId)?.name || 'SELECT STRIKER'}
                        </div>
                     </button>
                     <button onClick={() => setShowPlayerModal('nonStriker')} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${activeMatch.innings[activeMatch.currentInnings-1].nonStrikerId ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                        <div className="text-[9px] font-black uppercase text-slate-400 mb-1">NON-STRIKER</div>
                        <div className="font-black uppercase italic text-lg text-slate-500">
                           {players.find(p => p.id === activeMatch.innings[activeMatch.currentInnings-1].nonStrikerId)?.name || 'SELECT NON-STRIKER'}
                        </div>
                     </button>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">CURRENT BOWLER</h3>
                  <button onClick={() => setShowPlayerModal('bowler')} className={`w-full text-left p-4 rounded-2xl border-2 h-[148px] flex flex-col justify-center transition-all ${activeMatch.innings[activeMatch.currentInnings-1].currentBowlerId ? 'bg-slate-50 border-pramukh-red shadow-inner' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                     <div className="text-[9px] font-black uppercase text-slate-400 mb-1">ACTIVE BOWLER</div>
                     <div className="font-black uppercase italic text-2xl text-pramukh-navy">
                        {players.find(p => p.id === activeMatch.innings[activeMatch.currentInnings-1].currentBowlerId)?.name || 'ASSIGN BOWLER'}
                     </div>
                  </button>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3, 4, 6].map(runs => (
                  <button key={runs} onClick={() => handleScore(runs)} className="bg-white hover:bg-slate-50 text-pramukh-navy font-black py-8 rounded-3xl shadow-xl border-2 border-slate-100 transition-all active:scale-95 flex flex-col items-center group">
                    <span className="text-5xl italic leading-none">{runs}</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-2 opacity-60">RUNS</span>
                  </button>
                ))}
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleScore(0, false, 'wide')} className="bg-slate-100 hover:bg-pramukh-navy hover:text-white text-pramukh-navy font-black py-6 rounded-3xl transition-all italic text-xl uppercase">WIDE</button>
                <button onClick={() => handleScore(0, false, 'no-ball')} className="bg-slate-100 hover:bg-pramukh-navy hover:text-white text-pramukh-navy font-black py-6 rounded-3xl transition-all italic text-xl uppercase">NO BALL</button>
             </div>

             <button onClick={() => handleScore(0, true)} className="w-full bg-pramukh-red text-white font-black py-10 rounded-[2.5rem] shadow-2xl text-4xl active:scale-95 italic border-4 border-white/20">OUT</button>
          </div>
        </div>
      )}

      {/* PLAYER SELECTION MODAL */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-[100] bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-black text-pramukh-navy uppercase italic">SELECT {showPlayerModal}</h2>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                       PICKING FROM {showPlayerModal === 'bowler' ? 'BOWLING' : 'BATTING'} SQUAD
                    </p>
                 </div>
                 <button onClick={() => setShowPlayerModal(null)} className="text-slate-300 hover:text-red-500 text-2xl"><i className="fas fa-times"></i></button>
              </div>
              <div className="overflow-y-auto space-y-2 pr-2">
                 {eligiblePlayers.length === 0 ? (
                    <div className="p-10 text-center font-black italic text-slate-300 uppercase">No players found in team roster</div>
                 ) : eligiblePlayers.map(p => (
                   <button key={p.id} onClick={() => assignPlayer(p.id)} className="w-full text-left p-5 rounded-2xl bg-slate-50 hover:bg-pramukh-navy hover:text-white transition-all border-2 border-slate-100 group">
                      <div className="flex justify-between items-center">
                         <div>
                            <div className="font-black uppercase italic text-lg">{p.name}</div>
                            <div className="text-[9px] font-black uppercase opacity-60 mt-1">{p.battingStyle} • {p.role}</div>
                         </div>
                         <i className="fas fa-plus-circle opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ScorerDashboard;
