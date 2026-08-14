import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Pagination from './Pagination';
import Image from 'next/image';
import { useRouter } from 'next/router';
import DatePickerCalendar from './DatePickerCalendar';

const ITEMS_PER_PAGE = 20;

export default function Leaderboard() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  // helper to compute week start (UTC Sunday)
  const computeWeekStart = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const lastSun = new Date(now);
    lastSun.setUTCDate(now.getUTCDate() - day);
    lastSun.setUTCHours(0, 0, 0, 0);
    return lastSun.toISOString().slice(0,10);
  };

  // format week range label (Monday – Sunday)
  const formatWeekLabel = ws => {
    const [year, month, day] = ws.split('-').map(Number);
    const sunday = new Date(Date.UTC(year, month - 1, day));
    const monday = new Date(sunday);
    monday.setUTCDate(sunday.getUTCDate() + 1);
    const sundayEnd = new Date(sunday);
    sundayEnd.setUTCDate(sunday.getUTCDate() + 7);
    const options = { day: 'numeric', month: 'long' };
    return `${monday.toLocaleDateString(undefined, options)} - ${sundayEnd.toLocaleDateString(undefined, options)}`;
  };

  const [activeTab, setActiveTab] = useState('daily');
  const [leagueData, setLeagueData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(computeWeekStart());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [weekOptions, setWeekOptions] = useState([]);
  const [dateOptions, setDateOptions] = useState([]);

  // Pagination state
  const [leaguePage, setLeaguePage] = useState(1);
  const [weeklyPage, setWeeklyPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);

  // Check authentication on mount
  useEffect(() => {
    let mounted = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!session && mounted) {
          router.replace('/login');
        }
        setCheckingAuth(false);
      } else if (event === 'SIGNED_OUT' && mounted) {
        router.replace('/login');
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  // initial load: league leaderboard and week options
  useEffect(() => {
    if (checkingAuth) return;
    async function fetchInitialData() {
      setLoading(true);
      try {
        const res = await fetch('/api/leaderboard');
        const { weekOptions, dateOptions, league } = await res.json();
        setWeekOptions(weekOptions || []);
        setDateOptions(dateOptions || []);
        setSelectedDate(dateOptions?.[0] || new Date().toISOString().slice(0,10));
        setLeagueData(league || []);
      } catch (e) {
        setWeekOptions([]);
        setDateOptions([]);
        setLeagueData([]);
      }
      setLoading(false);
    }
    fetchInitialData();
  }, [checkingAuth]);

  // fetch weekly leaderboard when selectedWeek changes
  useEffect(() => {
    if (checkingAuth) return;
    async function fetchWeeklyData() {
      setWeeklyLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?week_start=${encodeURIComponent(selectedWeek)}`);
        const { weekly } = await res.json();
        setWeeklyData(weekly || []);
      } catch (e) {
        setWeeklyData([]);
      }
      setWeeklyLoading(false);
    }
    fetchWeeklyData();
  }, [selectedWeek, checkingAuth]);

  // fetch daily leaderboard when selectedDate changes
  useEffect(() => {
    if (checkingAuth) return;
    async function fetchDailyData() {
      setDailyLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?date=${encodeURIComponent(selectedDate)}`);
        const { daily } = await res.json();
        setDailyData(daily || []);
      } catch {
        setDailyData([]);
      }
      setDailyLoading(false);
    }
    fetchDailyData();
  }, [selectedDate, checkingAuth]);

  if (checkingAuth) return null;

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-white text-lg font-medium">Loading leaderboards...</p>
      </div>
    );
  }

  // Calculate pages and slices
  const filteredLeagueData = leagueData.filter(item => 
    item.user_name.toLowerCase().includes(nameFilter.toLowerCase())
  );
  
  const filteredWeeklyData = weeklyData.filter(item => 
    item.user_name.toLowerCase().includes(nameFilter.toLowerCase())
  );
  
  const filteredDailyData = dailyData.filter(item => 
    item.user_name.toLowerCase().includes(nameFilter.toLowerCase())
  );
  
  const leagueTotalPages = Math.ceil((filteredLeagueData?.length ?? 0) / ITEMS_PER_PAGE);
  const weeklyTotalPages = Math.ceil((filteredWeeklyData?.length ?? 0) / ITEMS_PER_PAGE);
  const dailyTotalPages = Math.ceil((filteredDailyData?.length ?? 0) / ITEMS_PER_PAGE);

  const leagueSlice = filteredLeagueData.slice(
    (leaguePage - 1) * ITEMS_PER_PAGE,
    leaguePage * ITEMS_PER_PAGE
  );
  const weeklySlice = filteredWeeklyData.slice(
    (weeklyPage - 1) * ITEMS_PER_PAGE,
    weeklyPage * ITEMS_PER_PAGE
  );
  const dailySlice = filteredDailyData.slice(
    (dailyPage - 1) * ITEMS_PER_PAGE,
    dailyPage * ITEMS_PER_PAGE
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center">
        {/* Centered and wider leaderboard section */}
        <div className="order-1 max-w-4xl w-full lg:order-2">
          {/* Tabs */}
          <div className="bg-navy-100 backdrop-blur-sm rounded-t-xl overflow-hidden">
            <div className="flex">
              <button
                className={`flex-1 py-4 font-semibold transition-colors duration-200 text-[11px] sm:text-base md:text-lg relative ${
                  activeTab === 'daily'
                    ? 'bg-navy-600 text-white font-bold shadow-[0_0_15px_rgba(0,0,139,0.7)]'
                    : 'bg-navy-400 text-white/50 hover:text-white hover:bg-navy-500'
                }`}
                onClick={() => setActiveTab('daily')}
              >
                DAILY LEADERBOARD
                {activeTab === 'daily' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FFD700]"></div>
                )}
              </button>
              <button
                className={`flex-1 py-4 font-semibold transition-colors duration-200 text-[11px] sm:text-base md:text-lg relative ${
                  activeTab === 'weekly'
                    ? 'bg-navy-600 text-white font-bold shadow-[0_0_15px_rgba(0,0,139,0.7)]'
                    : 'bg-navy-400 text-white/50 hover:text-white hover:bg-navy-500'
                }`}
                onClick={() => setActiveTab('weekly')}
              >
                WEEKLY LEADERBOARD
                {activeTab === 'weekly' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FFD700]"></div>
                )}
              </button>
              <button
                className={`flex-1 py-4 font-semibold transition-colors duration-200 text-[11px] sm:text-base md:text-lg relative ${
                  activeTab === 'league'
                    ? 'bg-navy-600 text-white font-bold shadow-[0_0_15px_rgba(0,0,139,0.7)]'
                    : 'bg-navy-400 text-white/50 hover:text-white hover:bg-navy-500'
                }`}
                onClick={() => setActiveTab('league')}
              >
                LEAGUE LEADERBOARD
                {activeTab === 'league' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FFD700]"></div>
                )}
              </button>
            </div>
          </div>

          {/* Filter Input */}
          <div className="bg-navy-500 backdrop-blur-sm p-4 border-t-0 border-x border-white/10">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
                  setLeaguePage(1); // Reset to first page when filtering
                  setWeeklyPage(1);
                  setDailyPage(1);
                }}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
              />
              {nameFilter && (
                <button
                  onClick={() => {
                    setNameFilter('');
                    setLeaguePage(1);
                    setWeeklyPage(1);
                    setDailyPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="bg-navy-500 backdrop-blur-sm rounded-b-xl p-6 border-t-0 border border-[#FFD700]/20">
            {activeTab === 'daily' && (
              <div>
                {/* Date selector */}
                <div className="mb-4 flex items-center gap-2">
                  <label htmlFor="dateSelect" className="text-white font-medium">Date:</label>
                  <DatePickerCalendar
                  
                    selected={selectedDate}
                    onChange={date => { setSelectedDate(date); setDailyPage(1); }}
                    enabledDates={dateOptions}
                    className="date-input"
                  />
                </div>
                <div className="relative">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#FFD700]/20">
                        <th className="px-4 py-3 text-center font-semibold text-lg text-white w-1/4">Points</th>
                        <th className="px-4 py-3 text-left font-semibold text-lg text-white w-3/4">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySlice.map(({ rank, user_name, daily_score }, index) => (
                        <tr 
                          key={rank} 
                          className="border-b border-white/10 hover:bg-white/5 transition-colors duration-150"
                        >
                          <td className="px-4 py-4">
                            <div className={`rounded-full h-12 w-12 flex items-center justify-center mx-auto ${index === 0 ? 'bg-[#DAA520]' : index === 1 ? 'bg-[#C0C0C0]' : index === 2 ? 'bg-[#CD7F32]' : 'bg-navy-400'}`}>
                              <span className={`font-bold text-lg ${index === 0 ? 'text-black' : index === 1 ? 'text-black' : index === 2 ? 'text-black' : 'text-white'}`}>{daily_score}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">
                            <div className="bg-white/[0.03] rounded-md px-3 py-1">{user_name}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dailyLoading && (
                    <div className="absolute inset-0 bg-navy-800 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <p className="text-white text-lg font-medium">Loading daily leaderboard...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <Pagination
                    currentPage={dailyPage}
                    totalPages={dailyTotalPages}
                    onPageChange={setDailyPage}
                  />
                </div>
              </div>
            )}
            {activeTab === 'weekly' && (
              <div>
                {/* Week selector inside Weekly Top Scorers */}
                <div className="mb-4 flex items-center gap-2">
                  <label htmlFor="weekSelect" className="text-white font-medium">Week:</label>
                  <select
                    id="weekSelect"
                    value={selectedWeek}
                    onChange={(e) => { setSelectedWeek(e.target.value); setWeeklyPage(1); }}
                    className="bg-navy-400 text-white py-2 px-3 rounded-lg ring-1 ring-white/10 focus:ring-white/50"
                  >
                    {weekOptions.map(ws => (
                      <option key={ws} value={ws} className="bg-navy-600">{formatWeekLabel(ws)}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#FFD700]/20">
                        <th className="px-4 py-3 text-center font-semibold text-lg text-white w-1/4">Points</th>
                        <th className="px-4 py-3 text-left font-semibold text-lg text-white w-3/4">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklySlice.map(({ rank, user_name, weekly_score }, index) => (
                        <tr 
                          key={rank} 
                          className="border-b border-white/10 hover:bg-white/5 transition-colors duration-150"
                        >
                          <td className="px-4 py-4">
                            <div className={`rounded-full h-12 w-12 flex items-center justify-center mx-auto ${index === 0 ? 'bg-[#DAA520]' : index === 1 ? 'bg-[#C0C0C0]' : index === 2 ? 'bg-[#CD7F32]' : 'bg-navy-400'}`}>
                              <span className={`font-bold text-lg ${index === 0 ? 'text-black' : index === 1 ? 'text-black' : index === 2 ? 'text-black' : 'text-white'}`}>{weekly_score}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">
                            <div className="bg-white/[0.03] rounded-md px-3 py-1">{user_name}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {weeklyLoading && (
                    <div className="absolute inset-0 bg-navy-800 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <p className="text-white text-lg font-medium">Loading weekly leaderboard...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <Pagination
                    currentPage={weeklyPage}
                    totalPages={weeklyTotalPages}
                    onPageChange={setWeeklyPage}
                  />
                </div>
              </div>
            )}
            {activeTab === 'league' && (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#FFD700]/20">
                      <th className="px-4 py-3 text-center font-semibold text-lg text-white w-1/4">Points</th>
                      <th className="px-4 py-3 text-left font-semibold text-lg text-white w-3/4">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueSlice.map(({ rank, user_name, total_score }, index) => (
                      <tr 
                        key={rank} 
                        className="border-b border-white/10 hover:bg-white/5 transition-colors duration-150"
                      >
                        <td className="px-4 py-4">
                          <div className={`rounded-full h-12 w-12 flex items-center justify-center mx-auto ${index === 0 ? 'bg-[#DAA520]' : index === 1 ? 'bg-[#C0C0C0]' : index === 2 ? 'bg-[#CD7F32]' : 'bg-navy-400'}`}>
                            <span className={`font-bold text-lg ${index === 0 ? 'text-black' : index === 1 ? 'text-black' : index === 2 ? 'text-black' : 'text-white'}`}>{total_score}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          <div className="bg-white/[0.03] rounded-md px-3 py-1">{user_name}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6">
                  <Pagination
                    currentPage={leaguePage}
                    totalPages={leagueTotalPages}
                    onPageChange={setLeaguePage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* flutter animation styling */}
      <style jsx>{`
        .ribbon {
          display: inline-block;
          position: relative;
          clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
          animation: flutter 3s ease-in-out infinite;
          filter: drop-shadow(0 -6px 6px rgba(255,255,255,0.7)) drop-shadow(0 6px 6px rgba(255,255,255,0.7));
        }
        @keyframes flutter { 0%,100% { transform: skewX(-5deg); } 50% { transform: skewX(5deg); } }
      `}</style>
    </div>
  );
}
