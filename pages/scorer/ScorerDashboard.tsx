
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Match, Player, Inning } from '../../types';
import { databaseService } from '../../services/api';

const ScorerDashboard: React.FC = () => {
  const { isScorer } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showPlayerModal, setShowPlayerModal] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);

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
        alert("Assign Batsmen and Bowler first!");
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

  const handleEndInning = async () => {
    if (!activeMatch) return;
    if (activeMatch.currentInnings === 1) {
      const updated = await databaseService.switchInnings(activeMatch.id);
      setActiveMatch(updated);
      setShowEndModal(false);
    } else {
      const inn1 = activeMatch.innings[0].runs;
      const inn2 = activeMatch.innings[1].runs;
      let winnerId = "";
      let summary = "";
      
      const teamAName = activeMatch.teamA.name;
      const teamBName = activeMatch.teamB.name;
      const batting1Id = activeMatch.innings[0].battingTeamId;
      const batting2Id = activeMatch.innings[1].battingTeamId;
      
      const batting1Name = batting1Id === activeMatch.teamA.id ? teamAName : teamBName;
      const batting2Name = batting2Id === activeMatch.teamA.id ? teamAName : teamBName;

      if (inn1 > inn2) {
        winnerId = batting1Id;
        summary = `${batting1Name} won by ${inn1 - inn2} runs`;
      } else if (inn2 > inn1) {
        winnerId = batting2Id;
        summary = `${batting2Name} won by ${10 - activeMatch.innings[1].wickets} wickets`;
      } else {
        winnerId = "TIE";
        summary = "Match Tied";
      }

      const updated = await databaseService.completeMatch(activeMatch.id, winnerId, summary);
      setActiveMatch(updated);
      setShowEndModal(false);
    }
  };

  if (!isScorer) return <div className="p-8 text-center text-red-600 font-black uppercase tracking-widest font-din">Access Denied</div>;

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

  const target = activeMatch?.currentInnings === 2 ? (activeMatch.innings[0].runs + 1) : null;
  const runsNeeded = target !== null && currentInning ? (target - currentInning.runs) : null;
  const totalBalls = activeMatch ? activeMatch.maxOvers * 6 : 0;
  const currentBalls = currentInning ? (currentInning.overs * 6 + currentInning.balls) : 0;
  const ballsRemaining = totalBalls - currentBalls;

  return (
    <div className="bg-slate-50 min-h-screen font-din flex flex-col">
      {!activeMatch ? (
        <div className="max-w-7xl mx-auto px-4 py-12 w-full">
          <h1 className="text-3xl font-black text-pramukh-navy uppercase italic mb-8">SELECT MATCH TO SCORE</h1>
          <div className="space-y-4">
             {loading ? <div className="text-center py-20 animate-pulse font-black italic">SEARCHING CLOUD...</div> : matches.filter(m => m.status !== 'COMPLETED').map(m => (
               <div key={m.id} className="p-8 bg-white rounded-3xl border-2 border-slate-100 shadow-xl flex justify-between items-center group cursor-pointer hover:border-pramukh-red" onClick={() => setActiveMatch(m)}>
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                       <span className={`px-3 py-0.5 rounded text-[9px] font-black uppercase ${m.status === 'LIVE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>{m.status}</span>
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{m.venue}</span>
                    </div>
                    <div className="text-2xl font-black text-pramukh-navy uppercase italic">{m.teamA.shortName} <span className="text-pramukh-red mx-1">VS</span> {m.teamB.shortName}</div>
                  </div>
                  <i className="fas fa-play text-slate-200 group-hover:text-pramukh-red transition-colors text-2xl"></i>
               </div>
             ))}
             {matches.filter(m => m.status === 'COMPLETED').length > 0 && (
               <div className="mt-12 opacity-50">
                 <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">COMPLETED MATCHES</h2>
                 {matches.filter(m => m.status === 'COMPLETED').map(m => (
                   <div key={m.id} className="p-4 bg-white rounded-xl mb-2 flex justify-between items-center border border-slate-100 grayscale">
                      <span className="font-bold text-slate-500 uppercase italic">{m.teamA.shortName} vs {m.teamB.shortName}</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase italic">{m.resultSummary}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-grow relative pb-[320px]">
          {/* STICKY TOP SCOREBAR */}
          <div className="sticky top-0 z-50 bg-pramukh-navy text-white px-6 py-4 flex justify-between items-center shadow-2xl border-b-2 border-pramukh-red">
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white/30 leading-none mb-1">SCORE</span>
                <div className="text-3xl font-black italic leading-none">
                   {currentInning?.runs || 0}<span className="text-pramukh-red">/</span>{currentInning?.wickets || 0}
                </div>
             </div>
             <div className="text-center">
                <div className="text-lg font-black italic leading-none">{currentInning?.overs || 0}.{currentInning?.balls || 0}</div>
                <div className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">OVERS</div>
             </div>
             <div className="flex flex-col items-end">
                {target ? (
                  <>
                    <span className="text-[9px] font-black uppercase text-white/30 leading-none mb-1">TARGET</span>
                    <div className="text-xl font-black text-pramukh-red italic leading-none">{target}</div>
                  </>
                ) : (
                  <button onClick={() => setShowEndModal(true)} className="bg-pramukh-red px-3 py-2 rounded-xl text-[9px] font-black uppercase italic shadow-lg">END INN</button>
                )}
             </div>
          </div>

          <div className="flex-grow px-4 py-6 space-y-6">
             {/* TARGET STATUS BAR */}
             {target && runsNeeded !== null && (
               <div className="bg-pramukh-navy/5 border-2 border-pramukh-navy/10 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">RUNS NEEDED</span>
                     <span className="text-2xl font-black text-pramukh-navy italic">{runsNeeded > 0 ? runsNeeded : 'WON'}</span>
                  </div>
                  <div className="text-right">
                     <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">BALLS LEFT</span>
                     <span className="text-2xl font-black text-pramukh-navy italic">{ballsRemaining}</span>
                  </div>
               </div>
             )}

             {/* PLAYER CONTROL CARDS */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                   <button onClick={() => setShowPlayerModal('striker')} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${currentInning?.strikerId ? 'bg-white border-pramukh-navy shadow-lg ring-4 ring-pramukh-navy/5' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                      <span className="text-[9px] font-black text-slate-400 block uppercase mb-1">STRIKER *</span>
                      <span className="font-black text-sm uppercase italic truncate block text-pramukh-navy">
                         {players.find(p => p.id === currentInning?.strikerId)?.name || 'ASSIGN'}
                      </span>
                      {currentInning?.strikerId && (
                         <div className="mt-2 text-[10px] font-black text-slate-400 uppercase italic">
                           {currentInning.batsmenStats.find(s => s.playerId === currentInning.strikerId)?.runs || 0} runs
                         </div>
                      )}
                   </button>
                   <button onClick={() => setShowPlayerModal('nonStriker')} className={`w-full text-left p-4 rounded-2xl border-2 ${currentInning?.nonStrikerId ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                      <span className="text-[9px] font-black text-slate-400 block uppercase mb-1">NON-STRIKER</span>
                      <span className="font-black text-sm uppercase italic text-slate-400 truncate block">
                         {players.find(p => p.id === currentInning?.nonStrikerId)?.name || 'ASSIGN'}
                      </span>
                   </button>
                </div>

                <div className="flex flex-col">
                   <button onClick={() => setShowPlayerModal('bowler')} className={`w-full flex-grow text-center p-4 rounded-2xl border-2 flex flex-col justify-center items-center ${currentInning?.currentBowlerId ? 'bg-white border-pramukh-red shadow-lg' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                      <span className="text-[9px] font-black text-slate-400 block uppercase mb-2">BOWLER</span>
                      <span className="font-black text-sm uppercase italic text-pramukh-navy leading-none mb-2">
                         {players.find(p => p.id === currentInning?.currentBowlerId)?.name || 'ASSIGN'}
                      </span>
                      {currentInning?.currentBowlerId && (
                         <div className="text-[10px] font-black text-pramukh-red uppercase italic">
                           {currentInning.bowlerStats.find(s => s.playerId === currentInning.currentBowlerId)?.wickets || 0} - {currentInning.bowlerStats.find(s => s.playerId === currentInning.currentBowlerId)?.runs || 0}
                         </div>
                      )}
                   </button>
                </div>
             </div>

             {/* ACTIONS ROW */}
             <div className="flex gap-4">
                <button onClick={() => {
                  const temp = activeMatch.innings[activeMatch.currentInnings-1].strikerId;
                  const temp2 = activeMatch.innings[activeMatch.currentInnings-1].nonStrikerId;
                  databaseService.updateActivePlayers(activeMatch.id, { strikerId: temp2, nonStrikerId: temp }).then(setActiveMatch);
                }} className="flex-1 bg-white border-2 border-slate-100 p-4 rounded-2xl font-black uppercase text-[10px] italic shadow-sm active:scale-95 transition-all flex items-center justify-center">
                   <i className="fas fa-arrows-rotate mr-2 text-pramukh-red"></i> SWAP STRIKE
                </button>
                <button onClick={() => setActiveMatch(null)} className="flex-1 bg-white border-2 border-slate-100 p-4 rounded-2xl font-black uppercase text-[10px] italic shadow-sm active:scale-95 transition-all flex items-center justify-center">
                   <i className="fas fa-list mr-2 text-slate-400"></i> CHANGE MATCH
                </button>
             </div>

             {target && <button onClick={() => setShowEndModal(true)} className="w-full bg-pramukh-navy text-white p-5 rounded-2xl font-black uppercase italic shadow-xl">FINISH MATCH</button>}
          </div>

          {/* MASSIVE ACTION PAD - FIXED AT BOTTOM */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-100 p-4 grid grid-cols-4 gap-2 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-40">
             {[0, 1, 2, 3, 4, 6].map(runs => (
               <button key={runs} onClick={() => handleScore(runs)} className="bg-slate-50 hover:bg-pramukh-navy hover:text-white h-20 rounded-2xl font-black text-3xl italic border-2 border-slate-100 active:scale-90 transition-all flex items-center justify-center">
                  {runs}
               </button>
             ))}
             <button onClick={() => handleScore(0, false, 'wide')} className="bg-amber-50 text-amber-600 h-20 rounded-2xl font-black text-xs uppercase border-2 border-amber-200 active:scale-90 flex items-center justify-center">WD +1</button>
             <button onClick={() => handleScore(0, false, 'no-ball')} className="bg-amber-50 text-amber-600 h-20 rounded-2xl font-black text-xs uppercase border-2 border-amber-200 active:scale-90 flex items-center justify-center">NB +1</button>
             <button onClick={() => handleScore(0, true)} className="col-span-4 bg-pramukh-red text-white h-24 rounded-3xl font-black text-4xl italic shadow-xl active:scale-95 border-b-[12px] border-red-800 flex items-center justify-center">
                WICKET
             </button>
          </div>
        </div>
      )}

      {/* PLAYER ASSIGN MODAL */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-[100] bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 max-h-[70vh] flex flex-col shadow-2xl border-b-[16px] border-pramukh-red">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-pramukh-navy uppercase italic">SELECT {showPlayerModal}</h2>
                 <button onClick={() => setShowPlayerModal(null)} className="text-slate-300 text-3xl"><i className="fas fa-times"></i></button>
              </div>
              <div className="overflow-y-auto space-y-2 no-scrollbar">
                 {eligiblePlayers.length === 0 ? (
                    <div className="p-10 text-center text-slate-300 font-black italic">No players available</div>
                 ) : eligiblePlayers.map(p => (
                   <button key={p.id} onClick={() => assignPlayer(p.id)} className="w-full text-left p-6 rounded-2xl bg-slate-50 hover:bg-pramukh-navy hover:text-white transition-all font-black uppercase italic text-sm border-2 border-transparent hover:border-white shadow-sm flex justify-between items-center">
                      {p.name}
                      <span className="text-[10px] opacity-40">{p.role}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* END INNING / MATCH MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 z-[100] bg-pramukh-navy/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] p-12 text-center max-w-md shadow-2xl border-b-[16px] border-pramukh-navy">
              <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                 <i className="fas fa-flag-checkered text-4xl text-pramukh-red"></i>
              </div>
              <h2 className="text-3xl font-black text-pramukh-navy uppercase italic mb-4">
                 {activeMatch?.currentInnings === 1 ? 'END FIRST INNING?' : 'FINISH MATCH?'}
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-10 leading-relaxed italic">
                 Confirming this will lock current scores and {activeMatch?.currentInnings === 1 ? 'calculate target' : 'declare result'}.
              </p>
              <div className="flex gap-4">
                 <button onClick={handleEndInning} className="flex-1 bg-pramukh-navy text-white font-black py-5 rounded-2xl uppercase italic shadow-xl active:scale-95">CONFIRM</button>
                 <button onClick={() => setShowEndModal(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-5 rounded-2xl uppercase italic active:scale-95">CANCEL</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ScorerDashboard;
