import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function Matches() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [yesterdayFixtures, setYesterdayFixtures] = useState([]);
  const [todayFixtures, setTodayFixtures] = useState([]);
  const [tomorrowFixtures, setTomorrowFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Fetch fixtures from our proxy API
  useEffect(() => {
    if (checkingAuth) return;
    async function fetchFixtures() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch('/api/fixtures');
        const data = await res.json();
        const fixtures = data.data || [];
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const formatDate = (date) => date.toISOString().slice(0, 10);

        const yFixtures = fixtures.filter(fixture => 
          new Date(fixture.starting_at).toISOString().slice(0, 10) === formatDate(yesterday)
        );
        const tFixtures = fixtures.filter(fixture => 
          new Date(fixture.starting_at).toISOString().slice(0, 10) === formatDate(today)
        );
        const tmFixtures = fixtures.filter(fixture => 
          new Date(fixture.starting_at).toISOString().slice(0, 10) === formatDate(tomorrow)
        );

        // Sort fixtures by start time ascending
        yFixtures.sort((a,b) => new Date(a.starting_at) - new Date(b.starting_at));
        tFixtures.sort((a,b) => new Date(a.starting_at) - new Date(b.starting_at));
        tmFixtures.sort((a,b) => new Date(a.starting_at) - new Date(b.starting_at));
        setYesterdayFixtures(yFixtures);
        setTodayFixtures(tFixtures);
        setTomorrowFixtures(tmFixtures);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFixtures();
  }, [checkingAuth]);

  if (checkingAuth) return null;

  // Helper for rendering static fixture cards (yesterday and tomorrow)
  const renderStaticFixtureCard = (fixture) => (
    <div
      key={fixture.id}
      className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-5 transform hover:scale-[1.005] transition-transform border border-navy-200/20 mb-6"
    >
      <h2 className="text-xs font-semibold mb-3 text-navy-100 text-shadow-sm text-navy-200">
        {fixture.round || "Fixture"}
      </h2>
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="font-bold text-base text-white font-medium">
            {fixture.localteam.name}
          </p>
          <div className="mt-3 bg-navy-800/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg">
            <img
              src={fixture.localteam.image_path}
              alt={fixture.localteam.name}
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm text-navy-200 font-medium">vs</p>
          {/* <p className="font-sm text-white mt-2">
            {new Date(fixture.starting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p> */}
        </div>
        <div className="text-center">
          <p className="font-bold text-base text-white font-medium">
            {fixture.visitorteam.name}
          </p>
          <div className="mt-3 bg-navy-800/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg">
            <img
              src={fixture.visitorteam.image_path}
              alt={fixture.visitorteam.name}
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>
      </div>
      {fixture.note && (
        <p className="text-navy-200 mt-3 font-medium text-sm text-center">{fixture.note}</p>
      )}
    </div>
  );

  // TodayMatchCard: Handles interactive player selection for today's fixtures
  function TodayMatchCard({ fixture }) {
    const [userSelection, setUserSelection] = useState(null);
    const [loadingSelection, setLoadingSelection] = useState(true);
    const [errorSelection, setErrorSelection] = useState("");
    const [localSquad, setLocalSquad] = useState([]);
    const [visitorSquad, setVisitorSquad] = useState([]);
    const [localSelected, setLocalSelected] = useState([]);
    const [visitorSelected, setVisitorSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [squadLoaded, setSquadLoaded] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLocked, setIsLocked] = useState(new Date() >= new Date(fixture.starting_at));
    const [overrideEnabled, setOverrideEnabled] = useState(false);
    const [summary, setSummary] = useState('');
    const [summaryStatusType, setSummaryStatusType] = useState('default');
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [errorSummary, setErrorSummary] = useState('');
    const [showFullSummary, setShowFullSummary] = useState(false);

    // Helper function for dynamic AI summary heading
    const getAISummaryHeading = (statusType) => {
      switch (statusType) {
        case 'live':
          return 'AI Live Match Pulse';
        case 'finished':
          return 'AI Match Report';
        case 'starting_soon_or_delayed':
          return 'AI Match Update';
        case 'upcoming':
          return 'AI Match Preview';
        default:
          return '';
      }
    };

    // Fetch current user from Supabase client
    useEffect(() => {
      async function fetchUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user || null);

        // Make isLocked reactive
        const checkLockStatus = () => {
          const currentlyLocked = new Date() >= new Date(fixture.starting_at);
          if (currentlyLocked !== isLockedRef.current) {
            setIsLocked(currentlyLocked);
            isLockedRef.current = currentlyLocked; // Keep ref in sync
          }
        };

        const isLockedRef = { current: new Date() >= new Date(fixture.starting_at) }; // Use a ref to avoid stale closure in interval
        setIsLocked(isLockedRef.current); // Initial set

        const intervalId = setInterval(checkLockStatus, 30000); // Check every 30 seconds
        return () => clearInterval(intervalId);
      }
      fetchUser();
    }, [fixture.starting_at]); // Dependency on fixture.starting_at

    // Check if user already submitted selection for this fixture
    useEffect(() => {
      async function checkUserSelection() {
        if (!currentUser) return;
        try {
          const res = await fetch(`/api/player-selections?user_id=${currentUser.id}&fixture_id=${fixture.id}`);
          if (!res.ok) throw new Error('Error fetching selection');
          const { selection } = await res.json();
          if (selection) setUserSelection(selection);
        } catch (err) {
          setErrorSelection(err.message);
        } finally {
          setLoadingSelection(false);
        }
      }
      checkUserSelection();
    }, [currentUser, fixture.id]);

    // timer to lock at start
    useEffect(() => {
      const now = new Date();
      const startTime = new Date(fixture.starting_at);
      if (now < startTime) {
        const delay = startTime.getTime() - now.getTime();
        const timer = setTimeout(() => setIsLocked(true), delay);
        return () => clearTimeout(timer);
      }
    }, [fixture.starting_at]);

    // fetch manual override status and poll every 1 min
    useEffect(() => {
      async function fetchOverride() {
        try {
          // Fetch the latest lock override status from Supabase
          const { data, error } = await supabase
            .from('selection_lock_override')
            .select('enabled')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
          if (error) throw error;
          if (data && typeof data.enabled === 'boolean') {
            setOverrideEnabled(data.enabled);
          }
        } catch (e) {
          console.error('Error fetching lock override status:', e);
        }
      }
      fetchOverride();
      const interval = setInterval(fetchOverride, 60000);
      return () => clearInterval(interval);
    }, []);

    // Fetch squad info using our proxy /api/squad
    useEffect(() => {
      async function fetchSquads() {
        if (!currentUser) return;  // Wait for currentUser to load
        if (userSelection) return; // Already selected
        try {
          const localRes = await fetch(
            `/api/squad?team_id=${fixture.localteam.id}&season_id=${fixture.season_id}`
          );
          if (!localRes.ok) throw new Error('Failed to fetch local team squad');
          const localData = await localRes.json();
          const ls = localData.data?.squad || [];
          setLocalSquad(ls);

          const visitorRes = await fetch(
            `/api/squad?team_id=${fixture.visitorteam.id}&season_id=${fixture.season_id}`
          );
          if (!visitorRes.ok) throw new Error('Failed to fetch visitor team squad');
          const visitorData = await visitorRes.json();
          const vs = visitorData.data?.squad || [];
          setVisitorSquad(vs);
        } catch (err) {
          console.error("Error fetching squads:", err);
          setErrorSelection(err.message);
        } finally {
          setLoadingSelection(false);
          setSquadLoaded(true);
        }
      }
      fetchSquads();
    }, [currentUser, userSelection, fixture]);

    // Fetch AI summary
    useEffect(() => {
      async function fetchAISummary() {
        setLoadingSummary(true);
        setErrorSummary(null);
        fetch(`/api/ai-summary?fixture_id=${fixture.id}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            setSummary(data.summary || 'No summary available.');
            setSummaryStatusType(data.match_status_type || 'upcoming'); // Set status type from API
            setLoadingSummary(false);
          })
          .catch(err => {
            console.error("Failed to load AI summary:", err);
            setErrorSummary(err.message);
            setSummary('Failed to load summary.');
            setSummaryStatusType('upcoming'); // Default on error
            setLoadingSummary(false);
          });
      }
      fetchAISummary();
    }, [fixture.id]);

    // Select player objects
    const handleSelectPlayer = async (team, player) => {
      // refresh override status
      let oe = overrideEnabled;

      if (!oe && isLocked) {
        alert('Match has already started. Selections are closed.');
        return;
      }
      if (team === "local") {
        // Check if player is already selected (for deselection)
        if (localSelected.find(p => p.id === player.id)) {
          // Remove player if already selected (deselect)
          setLocalSelected(prev => prev.filter(p => p.id !== player.id));
        } else if (localSelected.length < 4) {
          // Add player if not at max selection
          setLocalSelected(prev => [...prev, player]);
        }
      } else {
        // Check if player is already selected (for deselection)
        if (visitorSelected.find(p => p.id === player.id)) {
          // Remove player if already selected (deselect)
          setVisitorSelected(prev => prev.filter(p => p.id !== player.id));
        } else if (visitorSelected.length < 4) {
          // Add player if not at max selection
          setVisitorSelected(prev => [...prev, player]);
        }
      }
    };

    // Submit stores ids and names
    const handleSubmitSelection = async () => {
      // refresh override status
      let oe = overrideEnabled;
      try {
        // Fetch the latest selection lock override status from Supabase
        const { data, error } = await supabase
          .from('selection_lock_override')
          .select('enabled')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        if (error) throw error;
        if (data && typeof data.enabled === 'boolean') {
          oe = data.enabled;
          setOverrideEnabled(data.enabled);
        }
      } catch (e) {
        console.error('Error fetching lock override status:', e);
      }

      if (!oe && isLocked) {
        alert('Match has already started. Selections are closed.');
        return;
      }
      if (localSelected.length !== 4 || visitorSelected.length !== 4) {
        alert("Please select exactly 4 players from each team.");
        return;
      }
      setSubmitting(true);
      try {
        // Get current user from state (already fetched)
        const user = currentUser;
        if (!user) {
          alert("User not authenticated.");
          setSubmitting(false);
          return;
        }
        
        // Extract player IDs and names as arrays for Supabase storage
        // Convert IDs to integers to ensure proper data type
        const teamAIds = localSelected.map(p => parseInt(p.id, 10));
        const teamANames = localSelected.map(p => p.fullname);
        const teamBIds = visitorSelected.map(p => parseInt(p.id, 10));
        const teamBNames = visitorSelected.map(p => p.fullname);

        console.log('Submitting player selection:', {
          fixture_id: fixture.id,
          team_a_ids: teamAIds,
          team_b_ids: teamBIds
        });

        const response = await fetch('/api/submit-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            fixture_id: parseInt(fixture.id, 10),
            fixture_starting_at: fixture.starting_at,
            team_a_ids: teamAIds,
            team_a_names: teamANames,
            team_b_ids: teamBIds,
            team_b_names: teamBNames
          })
        });
        const result = await response.json();
        if (!response.ok) {
          alert(result.message || 'Error saving selections.');
        } else {
          alert('Selection submitted successfully!');
          setUserSelection(result.data);
          console.log('Selection saved:', result.data);
        }
      } catch (err) {
        console.error('Error in submission:', err);
        alert('Error saving your selections. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    if (loadingSelection) return <div className="p-4 text-white"><p>Loading selection...</p></div>;
    if (userSelection) {
      // Get player image paths from the squad data if available
      const getPlayerImagePath = (playerName, teamType) => {
        const squad = teamType === 'local' ? localSquad : visitorSquad;
        const player = squad.find(p => p.fullname === playerName);
        return player?.image_path || '/images/player-placeholder.jpg';
      };
      
      return (
        <div className="p-2 text-white">
          <div className="mb-4 p-4 bg-black/40 backdrop-blur-md rounded-3xl border border-navy-500/20">
            <div className="flex items-center justify-between mb-3 p-2">
              <div className="text-center">
                <p className="font-bold text-base text-white">{fixture.localteam.name}</p>
                <img src={fixture.localteam.image_path} alt={fixture.localteam.name} className="w-10 h-10 object-contain mx-auto" />
              </div>
              <p className="text-white/70 font-semibold">vs</p>
              <div className="text-center">
                <p className="font-bold text-base text-white">{fixture.visitorteam.name}</p>
                <img src={fixture.visitorteam.image_path} alt={fixture.visitorteam.name} className="w-10 h-10 object-contain mx-auto" />
              </div>
            </div>
            <h4 className="font-semibold text-white mb-2">{getAISummaryHeading(summaryStatusType)}</h4>
            {loadingSummary ? <p className="text-white/70">Generating AI summary...</p> : errorSummary ? <p className="text-red-500">Error: {errorSummary}</p> : (
              <>
                <div className={`text-white/90 break-words ${!showFullSummary ? 'max-h-28 overflow-hidden' : ''}`} dangerouslySetInnerHTML={{ __html: summary }} />
                <button onClick={() => setShowFullSummary(prev => !prev)} className="text-blue-500 mt-2">
                  {showFullSummary ? 'Collapse full summary' : 'Show full summary'}
                </button>
              </>
            )}
          </div>
          <h4 className="text-lg font-semibold mb-4 text-shadow-sm">Your Selections</h4>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-3xl border border-navy-500/20 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Local Team Selection */}
              <div>
                <h4 className="font-semibold text-[#FFD700] mb-2">{fixture.localteam.name}</h4>
                <div className="flex flex-col space-y-2">
                  {userSelection.team_a_names?.map((playerName, index) => (
                    <div key={index} className="flex items-center bg-navy-500/30 rounded-3xl p-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-navy-200/80 mr-3">
                        <img
                          src={getPlayerImagePath(playerName, 'local')} 
                          alt={playerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {e.target.src = '/images/player-placeholder.jpg'}}
                        />
                      </div>
                      <span className="font-medium text-sm">{playerName}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visitor Team Selection */}
              <div>
                <h4 className="font-semibold text-[#FFD700] mb-2">{fixture.visitorteam.name}</h4>
                <div className="flex flex-col space-y-2">
                  {userSelection.team_b_names?.map((playerName, index) => (
                    <div key={index} className="flex items-center bg-navy-500/30 rounded-3xl p-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-navy-200/80 mr-3">
                        <img 
                          src={getPlayerImagePath(playerName, 'visitor')} 
                          alt={playerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {e.target.src = '/images/player-placeholder.jpg'}}
                        />
                      </div>
                      <span className="font-medium">{playerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <p className="italic text-navy-200 text-center font-medium">Your selections are locked for this match.</p>
        </div>
      );
    }
    if (!squadLoaded) return <div className="p-4 text-white"><p>Loading squads...</p></div>;

    const isSelectionAllowed = (!isLocked || overrideEnabled);
    return (
      <div className="p-2 text-white">
        <div className="mb-4 p-4 bg-black/40 backdrop-blur-md rounded-3xl border border-navy-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <p className="font-bold text-base text-white">{fixture.localteam.name}</p>
              <img src={fixture.localteam.image_path} alt={fixture.localteam.name} className="w-10 h-10 object-contain mx-auto" />
            </div>
            <p className="text-white/70 font-semibold">vs</p>
            <div className="text-center">
              <p className="font-bold text-base text-white">{fixture.visitorteam.name}</p>
              <img src={fixture.visitorteam.image_path} alt={fixture.visitorteam.name} className="w-10 h-10 object-contain mx-auto" />
            </div>
          </div>
          <h4 className="font-semibold text-white mb-2">{getAISummaryHeading(summaryStatusType)}</h4>
          {loadingSummary ? <p className="text-white/70">Generating AI summary...</p> : errorSummary ? <p className="text-red-500">Error: {errorSummary}</p> : (
            <>
              <div className={`text-white/90 break-words ${!showFullSummary ? 'max-h-28 overflow-hidden' : ''}`} dangerouslySetInnerHTML={{ __html: summary }} />
              <button onClick={() => setShowFullSummary(prev => !prev)} className="text-blue-500 mt-2">
                {showFullSummary ? 'Collapse full summary' : 'Show full summary'}
              </button>
            </>
          )}
        </div>
        {isSelectionAllowed && <h4 className="text-lg font-semibold mb-4 text-shadow-sm">Select Players for {fixture.round}</h4>}
        
        {/* Local Team Section */}
        <div className="mb-4 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
          <SquadSelector 
            teamName={fixture.localteam.name}
            squad={localSquad}
            selectedPlayers={localSelected}
            onSelectPlayer={(player) => handleSelectPlayer('local', player)}
            isSelectionAllowed={isSelectionAllowed}
          />
        </div>
        
        {/* Visitor Team Section */}
        <div className="mb-4 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
          <SquadSelector 
            teamName={fixture.visitorteam.name}
            squad={visitorSquad}
            selectedPlayers={visitorSelected}
            onSelectPlayer={(player) => handleSelectPlayer('visitor', player)}
            isSelectionAllowed={isSelectionAllowed}
          />
        </div>
        
        {/* Selection Summary */}
        <div className="mb-4 p-4 bg-black/40 backdrop-blur-sm rounded-3xl border border-navy-500/20">
          <h4 className="font-semibold text-[#FFD700] mb-2 text-shadow-sm">Your Selections</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/80 mb-1 font-medium">{fixture.localteam.name}</p>
              {localSelected.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {localSelected.map(player => (
                    <span key={player.id} className="inline-flex items-center bg-navy-500/50 px-2 py-1 rounded-full text-xs">
                      <img src={player.image_path} alt={player.fullname} className="w-5 h-5 mr-1 rounded-full object-cover" />
                      <span className="font-medium">{player.fullname}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-xs font-medium">No players selected</p>
              )}
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1 font-medium">{fixture.visitorteam.name}</p>
              {visitorSelected.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {visitorSelected.map(player => (
                    <span key={player.id} className="inline-flex items-center bg-navy-500/50 px-2 py-1 rounded-full text-xs">
                      <img src={player.image_path} alt={player.fullname} className="w-5 h-5 mr-1 rounded-full object-cover" />
                      <span className="font-medium">{player.fullname}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-xs font-medium">No players selected</p>
              )}
            </div>
          </div>
        </div>
        
        {isSelectionAllowed && <button
          onClick={handleSubmitSelection}
          disabled={submitting || (!overrideEnabled && isLocked) || localSelected.length !== 4 || visitorSelected.length !== 4}
          className={`mt-4 w-full py-3 rounded-3xl transform hover:scale-[1.005] transition-all shadow-lg ${
            localSelected.length === 4 && visitorSelected.length === 4 && (overrideEnabled || !isLocked)
               ? 'bg-gradient-to-r from-navy-600 to-navy-700 text-white hover:from-navy-700 hover:to-navy-800'
               : 'bg-gray-500/50 text-white/70 cursor-not-allowed'
           }`}
        >
          {submitting ? 'Submitting...' : `Submit Selection (${localSelected.length + visitorSelected.length}/8)`}
        </button>}
        {!isSelectionAllowed && (
          <div className="mt-4 p-3 bg-yellow-800/30 text-yellow-300 border border-yellow-700 rounded-3xl text-center">
            <p className="font-semibold">Player selection is locked as the match has started.</p>
            {overrideEnabled && <p className="text-sm text-yellow-200 mt-1">Override active: You can make selections.</p>}
            {/* {!overrideEnabled && <p className="text-sm text-yellow-200 mt-1">Selections will unlock if an admin override is activated.</p>} */}
          </div>
        )}
      </div>
    );
  }

  // SquadSelector component for expandable team sections
  function SquadSelector({
    teamName, squad, selectedPlayers, onSelectPlayer, isSelectionAllowed
  }) {

    const [isExpanded, setIsExpanded] = useState(false); 
    
    return (
      <div className="bg-navy-800/50 p-3 rounded-lg">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex justify-between items-center text-left text-white font-semibold py-2 px-1 rounded hover:bg-navy-700/70 transition-colors"
        >
          <div className="flex items-center">
            <span className="font-semibold text-shadow-sm">{teamName}</span>
            {isSelectionAllowed && <span className="ml-2 text-sm text-white/70 font-medium">
              {selectedPlayers.length}/4 selected
            </span>}
          </div>
          <div className="flex items-center">
            {/* Mini previews of selected players in collapsed header - keep if desired, or simplify */} 
            {!isExpanded && selectedPlayers.slice(0, 4).map(player => (
              <img key={player.id} src={player.image_path} alt={player.fullname} className="w-5 h-5 rounded-full -ml-1 border-2 border-navy-800/50 object-cover" />
            ))}
            <span className={`ml-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/80"><path d="M13.0448 5.30836C12.9188 5.18236 12.742 5.11098 12.5588 5.11098C12.3755 5.11098 12.1988 5.18236 12.0728 5.30836L7.99976 9.3749L3.92676 5.30836C3.79956 5.18306 3.62256 5.11211 3.43976 5.1127C3.25696 5.11329 3.08056 5.18524 2.95476 5.31136C2.82896 5.43748 2.75919 5.61381 2.75919 5.79661C2.75919 5.97941 2.82896 6.15574 2.95476 6.28186L7.52076 10.8479C7.58338 10.9103 7.65706 10.9604 7.73816 10.9962C7.81926 11.032 7.90646 11.0529 7.99476 11.0579C8.08306 11.063 8.17206 11.0526 8.25656 11.0272C8.34106 11.0018 8.41956 10.962 8.48876 10.9099L13.0528 6.28186C13.1788 6.15586 13.2498 5.97904 13.2498 5.79586C13.2498 5.61267 13.1788 5.43586 13.0528 5.30986L13.0448 5.30836Z" fill="currentColor"/></svg>
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="mt-3 flex flex-wrap gap-2 items-center py-2">
            {squad.length > 0 ? squad.map(player => {
              const playerIsSelected = selectedPlayers.find(p => p.id === player.id);
              const teamIsFull = selectedPlayers.length >= 4;

              // Determine if the button should be functionally disabled
              const buttonShouldBeDisabled = 
                (!isSelectionAllowed && !playerIsSelected) || // Can't select new if locked and not already selected
                (isSelectionAllowed && teamIsFull && !playerIsSelected); // Can't select new if team full & selection allowed & not selected

              let buttonClasses = "px-2.5 py-1.5 rounded-full text-xs transition-all flex items-center focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow ";
              
              if (playerIsSelected) {
                buttonClasses += "bg-gradient-to-r from-green-500 to-emerald-600 text-white ring-green-300 scale-105 font-medium ";
              } else {
                buttonClasses += "bg-navy-600/70 text-navy-100 hover:bg-navy-500/80 ring-navy-500/60 ";
              }

              if (!isSelectionAllowed && !playerIsSelected) {
                buttonClasses += "opacity-40 cursor-not-allowed ";
              } else if (isSelectionAllowed && teamIsFull && !playerIsSelected) {
                buttonClasses += "opacity-50 cursor-not-allowed ";
              } else if (!isSelectionAllowed && playerIsSelected) { // Locked but selected, make it non-interactive for deselection
                buttonClasses += "cursor-default ";
              }

              return (
                <button
                  key={player.id}
                  onClick={() => {
                    if (isSelectionAllowed) {
                      onSelectPlayer(player);
                    }
                  }}
                  disabled={buttonShouldBeDisabled || (!isSelectionAllowed && playerIsSelected) }
                  className={buttonClasses}
                  title={player.fullname}
                >
                  <img 
                    src={player.image_path} 
                    alt={player.fullname} 
                    className="w-5 h-5 rounded-full mr-1.5 object-cover border border-white/10"
                  />
                  <span className="truncate max-w-[100px]">{player.fullname}</span>
                </button>
              );
            }) : <p className="text-white/70 text-xs px-1">Squad not available for this team.</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative font-sans">
      <div className="max-h-[60vh]">
        <img
          src="/images/game-banner.png"
          alt="Game banner"
          className="w-full object-cover"
        />
      </div>

      {/* Main Content with bg1 background */}
      <div 
        className="w-full relative min-h-screen" 
        style={{
          backgroundImage: 'url(/images/green-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <main className="relative z-10 container mx-auto px-2 py-4">
          <section className="grid grid-cols-1 md:grid-cols-[1fr_3fr_1fr] gap-2 mb-4">
              {/* Yesterday's Fixtures */}
              <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-3 transform hover:scale-[1.005] transition-transform border border-burgundy-200/20">
                <h2 className="text-lg font-semibold my-2 mx-3 text-burgundy-100 text-shadow-sm">Yesterday's Fixtures</h2>
                {yesterdayFixtures.length > 0 
                  ? yesterdayFixtures.map(fixture => renderStaticFixtureCard(fixture))
                  : <p className="text-white font-medium">No fixtures found for yesterday.</p>
                }
              </div>

            {/* Today's Fixtures - Full Width */}
            <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-2 transform hover:scale-[1.005] transition-transform">
              <h2 className="text-xl font-semibold text-navy-100 my-2 mx-3 text-shadow-sm">Today's Fixtures</h2>
              {todayFixtures.length > 0 
                ? todayFixtures.map(fixture => (
                    <TodayMatchCard key={fixture.id} fixture={fixture}/>
                  ))
                : <p className="text-white font-medium">No fixtures found for today.</p>
              }
            </div>

            {/* Tomorrow's Fixtures */}
            <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-3 transform hover:scale-[1.005] transition-transform border border-burgundy-200/20">
                <h2 className="text-lg font-semibold my-2 mx-3 text-burgundy-100 text-shadow-sm">Tomorrow's Fixtures</h2>
                {tomorrowFixtures.length > 0 
                  ? tomorrowFixtures.map(fixture => renderStaticFixtureCard(fixture))
                  : <p className="text-white font-medium">No fixtures found for tomorrow.</p>
                }
              </div>
          </section>

          {/* Selection & Scoring Section */}
          <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-6 mb-8 text-white">
            <h2 className="text-xl font-semibold mb-4 text-shadow-sm">Selection & Scoring</h2>
            <p className="mb-2">Select 4 players from each team (8 total) per match:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Batting: 30 points for 30 runs, 60 points for half-century (50 runs), 150 points for century (100 runs), 5 points for each six hit</li>
              <li>Bowling: 30 points per wicket taken</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
