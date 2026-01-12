
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Match, Ball } from '../../types';
import { databaseService } from '../../services/api';

const ScorerDashboard: React.FC = () => {
  const { isScorer } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Local state for the "This Over" visualization
  const [currentOverBalls, setCurrentOverBalls] = useState<string[]>([]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const m = await databaseService.getMatches();
      setMatches(m);
      setIsOffline(databaseService.isOffline);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isScorer) fetchMatches();
  }, [isScorer]);

  const handleScore = async (run: number, isWicket: boolean = false, extraType: string | null = null) => {
    if (!activeMatch) return;
    
    // Visual feedback for the "This Over" tracker
    let ballLabel = run.toString();
    if (isWicket) ballLabel = 'W';
    else if (extraType === 'wide') ballLabel = 'wd';
    else if (extraType === 'no-ball') ballLabel = 'nb';
    else if (run === 0) ballLabel = '•';

    setCurrentOverBalls(prev => [...prev, ballLabel]);

    try {
      const updatedMatch = await databaseService.updateMatchScore(activeMatch.id, {
        run,
        isWicket,
        extraType,
        timestamp: new Date().toISOString()
      });
      setActiveMatch(updatedMatch);
      setIsOffline(databaseService.isOffline);
    } catch (e) {
      console.error("Score Update Failed", e);
    }
  };

  if (!isScorer) return <div className="p-8 text-center text-red-600 font-bold font-din uppercase tracking-widest">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-40 font-din">
      {/* Interface Header */}
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center space-x-4">
            <div className="bg-pramukh-red w-3 h-10 rounded-full shadow-lg"></div>
            <h1 className="text-3xl font-black text-pramukh-navy uppercase tracking-tighter italic leading-none">SCORING CONSOLE</h1>
         </div>
         <div className="flex items-center space-x-3">
           {isOffline && (
             <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-amber-200">Local Mode</span>
           )}
           <button onClick={() => setActiveMatch(null)} className="text-slate-400 hover:text-pramukh-navy text-xs font-black uppercase tracking-widest italic transition-all">
             <i className="fas fa-sign-out-alt mr-2"></i> Exit Match
           </button>
         </div>
      </div>

      {!activeMatch ? (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border-t-[10px] border-pramukh-navy">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">CHOOSE MATCH TO SCORE</h2>
          <div className="space-y-4">
             {loading ? (
               <div className="text-center py-10 animate-pulse text-slate-300 font-black italic">LOADING FIXTURES...</div>
             ) : matches.length === 0 ? (
               <div className="text-center py-10 text-slate-300 font-black italic uppercase border-2 border-dashed border-slate-200 rounded-3xl">No matches currently assigned</div>
             ) : matches.map(m => (
               <div key={m.id} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-pramukh-red cursor-pointer flex justify-between items-center transition-all group" onClick={() => setActiveMatch(m)}>
                  <div className="flex items-center space-x-6">
                    <div className="bg-pramukh-navy w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white italic border-2 border-white/10">{m.teamA.shortName}</div>
                    <div className="font-black text-xl text-slate-800 uppercase italic leading-none">{m.teamA.name} <span className="text-pramukh-red text-xs mx-2">VS</span> {m.teamB.name}</div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 group-hover:text-pramukh-red transition-all"></i>
               </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Live Score & Player Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* SCORE CARD */}
            <div className="bg-pramukh-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-[16px] border-pramukh-red">
               <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><i className="fas fa-baseball-ball text-9xl"></i></div>
               <div className="relative z-10">
                 <div className="flex items-center space-x-3 mb-6">
                    <span className="bg-pramukh-red px-3 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-widest">CURRENT INNINGS</span>
                    <h2 className="text-xl font-black uppercase italic text-white/80">
                      {activeMatch.innings[activeMatch.currentInnings-1]?.battingTeamId === activeMatch.teamA.id ? activeMatch.teamA.name : activeMatch.teamB.name}
                    </h2>
                 </div>
                 <div className="flex items-end space-x-6">
                    <div className="text-9xl font-black italic tracking-tighter leading-none">
                       {activeMatch.innings[activeMatch.currentInnings-1]?.runs || 0}
                       <span className="text-pramukh-red mx-1">/</span>
                       {activeMatch.innings[activeMatch.currentInnings-1]?.wickets || 0}
                    </div>
                    <div className="pb-2">
                       <div className="text-4xl font-black text-slate-400 italic leading-none">
                         {activeMatch.innings[activeMatch.currentInnings-1]?.overs || 0}.{activeMatch.innings[activeMatch.currentInnings-1]?.balls || 0}
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-1">OVERS COMPLETED</div>
                    </div>
                 </div>
               </div>
            </div>

            {/* PLAYER STATUS (Striker/Bowler) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">BATSMEN ON FIELD</h3>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border-l-4 border-pramukh-red">
                        <span className="font-black uppercase italic text-slate-800">Amit Patel <span className="text-pramukh-red ml-1">*</span></span>
                        <span className="font-black text-slate-900">24 <span className="text-slate-400 text-xs font-bold">(18)</span></span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl">
                        <span className="font-black uppercase italic text-slate-500">Rahul Sharma</span>
                        <span className="font-black text-slate-400">12 <span className="text-slate-300 text-xs font-bold">(10)</span></span>
                     </div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CURRENT BOWLER</h3>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                     <div>
                        <div className="font-black uppercase italic text-slate-800">S. Varma</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest italic">Fast Medium</div>
                     </div>
                     <div className="text-right">
                        <div className="font-black text-pramukh-navy text-lg">1/18</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">2.2 OVERS</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* THIS OVER TRACKER */}
            <div className="bg-slate-100 p-6 rounded-[2rem] border-2 border-slate-200">
               <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">THIS OVER TRACKER</h3>
                  <span className="text-[10px] font-black text-pramukh-red uppercase italic">In Progress</span>
               </div>
               <div className="flex space-x-3">
                  {currentOverBalls.length === 0 && <div className="text-slate-300 font-black italic uppercase text-xs">Waiting for first ball...</div>}
                  {currentOverBalls.map((b, i) => (
                    <div key={i} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-md border-2 ${
                      b === 'W' ? 'bg-pramukh-red text-white border-white/20' : 
                      b === '4' || b === '6' ? 'bg-pramukh-navy text-white border-white/20' : 
                      'bg-white text-slate-800 border-slate-200'
                    }`}>
                      {b}
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* RIGHT: ACTION CONTROLS */}
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3, 4, 6].map(runs => (
                  <button key={runs} onClick={() => handleScore(runs)} className="bg-white hover:bg-slate-50 text-pramukh-navy font-black py-10 rounded-[2rem] shadow-xl border-2 border-slate-100 transition-all active:scale-95 flex flex-col items-center group relative overflow-hidden">
                    <span className="text-6xl italic leading-none z-10">{runs}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 z-10 opacity-60 group-hover:opacity-100 transition-opacity">RUNS</span>
                    <div className="absolute inset-0 bg-slate-50 translate-y-full group-active:translate-y-0 transition-transform"></div>
                  </button>
                ))}
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleScore(1, false, 'wide')} className="bg-slate-100 hover:bg-pramukh-navy hover:text-white text-pramukh-navy font-black py-6 rounded-3xl shadow-lg border-2 border-transparent transition-all italic text-2xl uppercase tracking-tighter">
                   WIDE <div className="text-[10px] font-bold opacity-50">1 RUN</div>
                </button>
                <button onClick={() => handleScore(1, false, 'no-ball')} className="bg-slate-100 hover:bg-pramukh-navy hover:text-white text-pramukh-navy font-black py-6 rounded-3xl shadow-lg border-2 border-transparent transition-all italic text-2xl uppercase tracking-tighter">
                   NO BALL <div className="text-[10px] font-bold opacity-50">1 RUN</div>
                </button>
             </div>

             <button onClick={() => handleScore(0, true)} className="w-full bg-pramukh-red text-white font-black py-10 rounded-[2.5rem] shadow-2xl shadow-red-500/40 text-4xl transition-all active:scale-95 italic border-4 border-white/20 relative overflow-hidden group">
                OUT
                <div className="text-[10px] font-black uppercase tracking-[0.5em] mt-2 opacity-60">WICKET DISMISSAL</div>
                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rotate-12"></div>
             </button>

             <button 
                onClick={() => setCurrentOverBalls(prev => prev.slice(0, -1))}
                className="w-full bg-slate-100 text-slate-400 hover:text-slate-800 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest italic transition-all border-2 border-dashed border-slate-200"
              >
               <i className="fas fa-undo-alt mr-2"></i> Undo Last Ball
             </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ScorerDashboard;
