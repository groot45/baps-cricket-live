
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Match } from '../types';
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
      if (data.length === 0) {
        setMatches([
          {
            id: 'm-sample',
            tournamentId: config.id,
            teamA: { id: 't1', name: 'Regina Royals', shortName: 'RGR' },
            teamB: { id: 't2', name: 'Saskatoon Stars', shortName: 'SKT' },
            status: 'LIVE',
            currentInnings: 1,
            innings: [{ battingTeamId: 't1', bowlingTeamId: 't2', runs: 104, wickets: 2, overs: 12, balls: 3, oversHistory: [] }],
            startTime: new Date().toISOString(),
            venue: 'Arena 1'
          }
        ]);
      } else {
        setMatches(data);
      }
    } catch (error) {
      console.error("Failed to fetch matches", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 15000);
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
      return (
        <img 
          src={config.logoUrl} 
          className="w-full h-full object-contain p-4" 
          alt="Logo" 
          onError={() => setImgError(true)}
        />
      );
    }
    
    // Default BAPS Branded Header Centerpiece
    return (
      <div className="bg-white w-full h-full rounded-[2.5rem] flex flex-col items-center justify-center p-8 shadow-inner">
         <img 
            src={BAPS_ASSETS.FULL_LOGO} 
            className="w-full h-1/2 object-contain mb-4" 
            alt="BAPS Charities"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const next = (e.target as HTMLImageElement).nextElementSibling;
              if (next) next.classList.remove('hidden');
            }}
          />
          <div className="hidden flex flex-col items-center">
            <i className="fas fa-fire-alt text-6xl text-pramukh-navy mb-2"></i>
            <span className="text-xl font-black text-pramukh-navy italic uppercase">BAPS CHARITIES</span>
          </div>
          <div className="h-0.5 w-12 bg-pramukh-red rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="text-center py-24 bg-pramukh-navy text-white relative overflow-hidden border-b-[16px] border-pramukh-red shadow-2xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <i className="fas fa-fire-alt text-[40rem] absolute -left-20 -bottom-20 rotate-12 text-white"></i>
          <i className="fas fa-trophy text-[30rem] absolute -right-20 -top-20 -rotate-12"></i>
        </div>
        <div className="relative z-10 px-4 flex flex-col items-center">
          <div className="bg-white p-6 rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] mb-10 transform -rotate-2 border-4 border-pramukh-red/30 w-56 h-56 flex items-center justify-center overflow-hidden">
             {getHeaderLogo()}
          </div>
          <div className="flex items-center space-x-3 mb-4">
             <span className="h-px w-8 bg-pramukh-red"></span>
             <span className="text-pramukh-red font-black uppercase italic tracking-[0.5em] text-sm">BAPS CHARITIES PRESENTS</span>
             <span className="h-px w-8 bg-pramukh-red"></span>
          </div>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase italic font-din leading-none text-white drop-shadow-2xl">{config.name}</h1>
          <div className="mt-10 bg-white/10 backdrop-blur-md px-12 py-4 rounded-2xl border border-white/20">
            <p className="text-white font-black tracking-[0.3em] uppercase text-sm md:text-lg font-din italic">OFFICIAL LIVE MATCH CENTER</p>
          </div>
        </div>
      </header>

      {/* Match Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4 max-w-7xl mx-auto -mt-12 relative z-20">
        {matches.map((match) => (
          <Link key={match.id} to={`/match/${match.id}`} className="block group">
            <div className={`bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-500 group-hover:-translate-y-4 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative border-4 ${match.status === 'LIVE' ? 'border-pramukh-red ring-8 ring-pramukh-red/10' : 'border-white'}`}>
              {match.status === 'LIVE' && (
                <div className="absolute top-0 right-0 bg-pramukh-red text-white px-10 py-3 rounded-bl-[2rem] text-[11px] font-black uppercase tracking-[0.4em] z-10 animate-pulse font-din">
                  <i className="fas fa-satellite-dish mr-2 mb-0.5"></i> LIVE NOW
                </div>
              )}
              
              <div className="p-10 font-din">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Match Venue</span>
                    <span className="text-sm font-black text-slate-800 italic uppercase bg-slate-100 px-3 py-1 rounded-lg">{match.venue}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tournament Date</span>
                    <span className="text-sm font-black text-slate-800 italic uppercase">{new Date(match.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center p-8 rounded-[2rem] bg-slate-50 border-2 border-slate-100 shadow-inner group-hover:border-pramukh-navy transition-all duration-300">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-pramukh-navy rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-2xl transform -rotate-3 border-4 border-white overflow-hidden">
                        {match.teamA.logoUrl ? <img src={match.teamA.logoUrl} className="w-full h-full object-cover" /> : match.teamA.shortName}
                      </div>
                      <span className="font-black text-4xl text-slate-900 uppercase tracking-tighter italic">{match.teamA.name}</span>
                    </div>
                    {match.status !== 'UPCOMING' && (
                      <div className="text-5xl font-black text-pramukh-navy italic leading-none text-right">
                        {match.innings[0]?.runs}<span className="text-pramukh-red mx-0.5">/</span>{match.innings[0]?.wickets} 
                        <div className="text-xs font-bold text-slate-400 not-italic mt-2">({match.innings[0]?.overs}.{match.innings[0]?.balls} OV)</div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center -my-8 relative z-10">
                    <div className="bg-white p-2 rounded-full shadow-xl">
                       <div className="bg-pramukh-red text-white text-xs font-black px-12 py-3.5 rounded-full shadow-inner uppercase italic tracking-[0.3em] border-2 border-pramukh-red/20">VS</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-8 rounded-[2rem] bg-slate-50 border-2 border-slate-100 shadow-inner group-hover:border-pramukh-navy transition-all duration-300">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-500 text-3xl shadow-inner transform rotate-3 overflow-hidden border-4 border-white">
                        {match.teamB.logoUrl ? <img src={match.teamB.logoUrl} className="w-full h-full object-cover" /> : match.teamB.shortName}
                      </div>
                      <span className="font-black text-4xl text-slate-900 uppercase tracking-tighter italic">{match.teamB.name}</span>
                    </div>
                    {match.status === 'LIVE' && match.currentInnings === 2 && (
                       <div className="text-5xl font-black text-pramukh-navy italic leading-none text-right">
                        {match.innings[1]?.runs}<span className="text-pramukh-red mx-0.5">/</span>{match.innings[1]?.wickets} 
                        <div className="text-xs font-bold text-slate-400 not-italic mt-2">({match.innings[1]?.overs}.{match.innings[1]?.balls} OV)</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LiveScores;
