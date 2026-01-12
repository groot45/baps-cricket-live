
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Match, Inning } from '../types';
import { useTournament } from '../context/TournamentContext';
import { databaseService } from '../services/api';
import { BAPS_ASSETS } from '../config/tournament';

const LiveScores: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const { config } = useTournament();

  const fetchMatches = async () => {
    try {
      const data = await databaseService.getMatches();
      setMatches(data);
    } catch (error) {
      console.error("Failed to fetch matches", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 5000); // 5 second refresh for live tracking
    return () => clearInterval(interval);
  }, []);

  if (loading && matches.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pramukh-navy border-t-pramukh-red"></div>
      </div>
    );
  }

  const getHeaderLogo = () => {
    if (config.logoUrl && !imgError) {
      return <img src={config.logoUrl} className="w-full h-full object-contain p-4" alt="Logo" onError={() => setImgError(true)} />;
    }
    return (
      <div className="bg-white w-full h-full rounded-[2.5rem] flex flex-col items-center justify-center p-8 shadow-inner">
         <img src={BAPS_ASSETS.FULL_LOGO} className="w-full h-1/2 object-contain mb-4" alt="BAPS Charities" />
         <div className="h-0.5 w-12 bg-pramukh-red rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 font-din">
      <header className="text-center py-20 bg-pramukh-navy text-white relative overflow-hidden border-b-[16px] border-pramukh-red shadow-2xl">
        <div className="relative z-10 px-4 flex flex-col items-center">
          <div className="bg-white p-6 rounded-[3rem] shadow-2xl mb-8 transform -rotate-1 border-4 border-pramukh-red/30 w-48 h-48 flex items-center justify-center overflow-hidden">
             {getHeaderLogo()}
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-none text-white drop-shadow-2xl">{config.name}</h1>
          <div className="mt-8 bg-white/10 backdrop-blur-md px-10 py-3 rounded-2xl border border-white/20">
            <p className="text-white font-black tracking-[0.3em] uppercase text-sm italic">LIVE TOURNAMENT DASHBOARD</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12 px-4 max-w-7xl mx-auto -mt-10 relative z-20">
        {matches.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center shadow-xl border-2 border-slate-100 italic font-black text-slate-300 uppercase tracking-widest">No Matches Scheduled Yet</div>
        ) : matches.map((match) => {
          const inning = match.innings[match.currentInnings - 1];
          const striker = inning?.batsmenStats?.find(b => b.playerId === inning.strikerId);
          const nonStriker = inning?.batsmenStats?.find(b => b.playerId === inning.nonStrikerId);
          const bowler = inning?.bowlerStats?.find(b => b.playerId === inning.currentBowlerId);

          return (
            <div key={match.id} className={`bg-white rounded-[3.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.2)] overflow-hidden border-4 ${match.status === 'LIVE' ? 'border-pramukh-red' : 'border-white'}`}>
              <div className="p-8 md:p-14">
                {/* MATCH HEADER */}
                <div className="flex justify-between items-center mb-10 pb-8 border-b-2 border-slate-50">
                  <div className="flex items-center space-x-4">
                     <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${match.status === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                       {match.status}
                     </span>
                     <span className="text-slate-400 font-black uppercase text-xs tracking-widest italic">{match.venue}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-pramukh-navy font-black text-xs uppercase tracking-widest italic">{new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* MAIN SCOREBOARD */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  {/* TEAMS AND MAIN TOTAL */}
                  <div className="lg:col-span-7 flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-6">
                         <div className="w-24 h-24 bg-pramukh-navy rounded-[2rem] flex items-center justify-center font-black text-white text-4xl shadow-xl border-4 border-white transform -rotate-3 overflow-hidden">
                           {match.teamA.shortName}
                         </div>
                         <h2 className="text-5xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter">{match.teamA.name}</h2>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-center py-4">
                      <div className="bg-pramukh-red h-0.5 flex-grow opacity-10"></div>
                      <div className="mx-6 px-8 py-2 rounded-full border-2 border-pramukh-red/20 text-pramukh-red font-black text-xs italic tracking-[0.5em]">VS</div>
                      <div className="bg-pramukh-red h-0.5 flex-grow opacity-10"></div>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-6">
                         <div className="w-24 h-24 bg-slate-200 rounded-[2rem] flex items-center justify-center font-black text-slate-500 text-4xl shadow-inner border-4 border-white transform rotate-3 overflow-hidden">
                           {match.teamB.shortName}
                         </div>
                         <h2 className="text-5xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter">{match.teamB.name}</h2>
                       </div>
                    </div>
                  </div>

                  {/* BIG TOTAL BOX */}
                  <div className="lg:col-span-5 bg-pramukh-navy rounded-[3rem] p-10 text-white shadow-2xl border-b-[16px] border-pramukh-red relative overflow-hidden">
                     <div className="relative z-10">
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2 italic">LIVE MATCH TOTAL</div>
                        <div className="text-9xl font-black italic tracking-tighter leading-none mb-4">
                           {inning?.runs || 0}<span className="text-pramukh-red mx-1">/</span>{inning?.wickets || 0}
                        </div>
                        <div className="flex items-end justify-between">
                           <div>
                              <div className="text-4xl font-black text-slate-400 italic leading-none">{inning?.overs || 0}.{inning?.balls || 0}</div>
                              <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mt-1">OVERS COMPLETED</div>
                           </div>
                           <div className="text-right">
                              <div className="text-sm font-black text-pramukh-red uppercase italic tracking-widest">Target: 145</div>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                {/* PROJECTOR PLAYER BOARD (Only visible if LIVE) */}
                {match.status === 'LIVE' && (
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* BATSMEN BOARD */}
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center">
                           <i className="fas fa-baseball-bat-ball mr-2 text-pramukh-red"></i> BATSMEN AT CREASE
                        </h4>
                        <div className="space-y-4">
                           <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${striker ? 'bg-white border-pramukh-navy shadow-md scale-105' : 'bg-transparent border-dashed border-slate-200 opacity-40'}`}>
                              <span className="font-black uppercase italic text-lg">{striker ? `${striker.name} *` : 'SELECT STRIKER'}</span>
                              <div className="text-right">
                                 <div className="text-2xl font-black text-pramukh-navy italic leading-none">{striker?.runs || 0}</div>
                                 <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">({striker?.balls || 0} Balls)</div>
                              </div>
                           </div>
                           <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${nonStriker ? 'bg-white border-slate-200' : 'bg-transparent border-dashed border-slate-200 opacity-40'}`}>
                              <span className="font-black uppercase italic text-lg opacity-60">{nonStriker ? nonStriker.name : 'SELECT NON-STRIKER'}</span>
                              <div className="text-right">
                                 <div className="text-xl font-black text-slate-400 italic leading-none">{nonStriker?.runs || 0}</div>
                                 <div className="text-[10px] font-bold text-slate-300 uppercase mt-1">({nonStriker?.balls || 0} Balls)</div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* BOWLING BOARD */}
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center">
                           <i className="fas fa-bullseye mr-2 text-pramukh-red"></i> LIVE BOWLER figures
                        </h4>
                        <div className={`flex justify-between items-center p-8 rounded-[2rem] border-2 h-[132px] transition-all ${bowler ? 'bg-white border-pramukh-navy shadow-lg' : 'bg-transparent border-dashed border-slate-200 opacity-40'}`}>
                           <div>
                              <div className="font-black uppercase italic text-2xl text-pramukh-navy">{bowler ? bowler.name : 'ASSIGN BOWLER'}</div>
                              <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest italic">Current Spell</div>
                           </div>
                           <div className="text-right">
                              <div className="text-5xl font-black text-pramukh-red italic leading-none">{bowler?.wickets || 0}<span className="text-slate-300 mx-1">/</span>{bowler?.runs || 0}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">{bowler?.overs || 0}.{bowler?.balls || 0} OVERS</div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveScores;
