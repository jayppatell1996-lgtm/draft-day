import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function Matches() {
  const router = useRouter();
  const [yesterdayFixtures, setYesterdayFixtures] = useState([]);
  const [todayFixtures, setTodayFixtures] = useState([]);
  const [tomorrowFixtures, setTomorrowFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch fixtures from our proxy API
  useEffect(() => {
    async function fetchFixtures() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch('/api/fixtures');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.details || data.error || 'Failed to load fixtures');
        }
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
  }, []);

  // Helper for rendering static fixture cards (yesterday and tomorrow)
  const renderStaticFixtureCard = (fixture) => (
    <div key={fixture.id} className="surface-card mb-4 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {fixture.round || 'Fixture'}
      </p>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-100">{fixture.localteam.name}</p>
          <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-surface-950">
            <img
              src={fixture.localteam.image_path}
              alt={fixture.localteam.name}
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">vs</p>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-100">{fixture.visitorteam.name}</p>
          <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-surface-950">
            <img
              src={fixture.visitorteam.image_path}
              alt={fixture.visitorteam.name}
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>
      </div>
      {fixture.note && <p className="text-center text-sm text-zinc-400">{fixture.note}</p>}
    </div>
  );

  // TodayMatchCard: Handles interactive player selection for today's fixtures
  function TodayMatchCard({ fixture }) {
    const { data: session } = useSession();
    const currentUser = session?.user ? { id: session.user.id } : null;
    const [userSelection, setUserSelection] = useState(null);
    const [loadingSelection, setLoadingSelection] = useState(true);
    const [errorSelection, setErrorSelection] = useState("");
    const [localSquad, setLocalSquad] = useState([]);
    const [visitorSquad, setVisitorSquad] = useState([]);
    const [localSelected, setLocalSelected] = useState([]);
    const [visitorSelected, setVisitorSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [squadLoaded, setSquadLoaded] = useState(false);
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

    // Keep lock status in sync with fixture start time
    useEffect(() => {
      const checkLockStatus = () => {
        const currentlyLocked = new Date() >= new Date(fixture.starting_at);
        setIsLocked(currentlyLocked);
      };

      checkLockStatus();
      const intervalId = setInterval(checkLockStatus, 30000);
      return () => clearInterval(intervalId);
    }, [fixture.starting_at]);

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

    if (loadingSelection) return <div className="p-4 text-sm text-zinc-400">Loading selection…</div>;
    if (userSelection) {
      // Get player image paths from the squad data if available
      const getPlayerImagePath = (playerName, teamType) => {
        const squad = teamType === 'local' ? localSquad : visitorSquad;
        const player = squad.find(p => p.fullname === playerName);
        return player?.image_path || '/images/player-placeholder.jpg';
      };
      
      return (
        <div className="mb-6 border-b border-white/10 pb-6 text-zinc-100">
          <div className="mb-4 p-4 rounded-xl border border-white/10 bg-surface-900/80">
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
                <button onClick={() => setShowFullSummary(prev => !prev)} className="mt-2 text-sm text-accent-400 hover:text-accent-300">
                  {showFullSummary ? 'Collapse full summary' : 'Show full summary'}
                </button>
              </>
            )}
          </div>
          <h4 className="mb-4 text-lg font-semibold text-white">Your Selections</h4>
          
          <div className="rounded-xl border border-white/10 bg-surface-900/80 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Local Team Selection */}
              <div>
                <h4 className="font-semibold text-accent-400 mb-2">{fixture.localteam.name}</h4>
                <div className="flex flex-col space-y-2">
                  {userSelection.team_a_names?.map((playerName, index) => (
                    <div key={index} className="flex items-center rounded-lg border border-white/10 bg-surface-950 p-2">
                      <div className="mr-3 h-10 w-10 overflow-hidden rounded-full border border-white/10">
                        <img
                          src={getPlayerImagePath(playerName, 'local')} 
                          alt={playerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {e.target.src = '/images/player-placeholder.jpg'}}
                        />
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{playerName}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visitor Team Selection */}
              <div>
                <h4 className="font-semibold text-accent-400 mb-2">{fixture.visitorteam.name}</h4>
                <div className="flex flex-col space-y-2">
                  {userSelection.team_b_names?.map((playerName, index) => (
                    <div key={index} className="flex items-center rounded-lg border border-white/10 bg-surface-950 p-2">
                      <div className="mr-3 h-10 w-10 overflow-hidden rounded-full border border-white/10">
                        <img 
                          src={getPlayerImagePath(playerName, 'visitor')} 
                          alt={playerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {e.target.src = '/images/player-placeholder.jpg'}}
                        />
                      </div>
                      <span className="font-medium text-zinc-200">{playerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm italic text-zinc-500">Your selections are locked for this match.</p>
        </div>
      );
    }
    if (!squadLoaded) return <div className="p-4 text-sm text-zinc-400">Loading squads…</div>;

    const isSelectionAllowed = (!isLocked || overrideEnabled);
    return (
      <div className="mb-6 border-b border-white/10 pb-6 text-zinc-100">
        <div className="mb-4 p-4 rounded-xl border border-white/10 bg-surface-900/80">
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
              <button onClick={() => setShowFullSummary(prev => !prev)} className="mt-2 text-sm text-accent-400 hover:text-accent-300">
                {showFullSummary ? 'Collapse full summary' : 'Show full summary'}
              </button>
            </>
          )}
        </div>
        {isSelectionAllowed && <h4 className="mb-4 text-lg font-semibold text-white">Select Players for {fixture.round}</h4>}
        
        {/* Local Team Section */}
        <div className="rounded-xl border border-white/10 bg-surface-900/80 overflow-hidden">
          <SquadSelector 
            teamName={fixture.localteam.name}
            squad={localSquad}
            selectedPlayers={localSelected}
            onSelectPlayer={(player) => handleSelectPlayer('local', player)}
            isSelectionAllowed={isSelectionAllowed}
          />
        </div>
        
        {/* Visitor Team Section */}
        <div className="rounded-xl border border-white/10 bg-surface-900/80 overflow-hidden">
          <SquadSelector 
            teamName={fixture.visitorteam.name}
            squad={visitorSquad}
            selectedPlayers={visitorSelected}
            onSelectPlayer={(player) => handleSelectPlayer('visitor', player)}
            isSelectionAllowed={isSelectionAllowed}
          />
        </div>
        
        {/* Selection Summary */}
        <div className="mb-4 p-4 rounded-xl border border-white/10 bg-surface-900/80">
          <h4 className="mb-2 font-semibold text-accent-400">Your Selections</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/80 mb-1 font-medium">{fixture.localteam.name}</p>
              {localSelected.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {localSelected.map(player => (
                    <span key={player.id} className="inline-flex items-center rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-1 text-xs text-accent-200">
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
                    <span key={player.id} className="inline-flex items-center rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-1 text-xs text-accent-200">
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
          className={`btn-primary mt-4 w-full ${
            localSelected.length === 4 && visitorSelected.length === 4 && (overrideEnabled || !isLocked)
              ? ''
              : 'cursor-not-allowed opacity-50'
          }`}
        >
          {submitting ? 'Submitting...' : `Submit Selection (${localSelected.length + visitorSelected.length}/8)`}
        </button>}
        {!isSelectionAllowed && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            <p className="font-semibold">Player selection is locked as the match has started.</p>
            {overrideEnabled && <p className="mt-1 text-xs text-amber-300/80">Override active: selections unlocked.</p>}
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
      <div className="rounded-lg border border-white/10 bg-surface-950 p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-zinc-100 transition-colors hover:bg-white/5"
        >
          <div className="flex items-center">
            <span className="font-semibold">{teamName}</span>
            {isSelectionAllowed && <span className="ml-2 text-sm text-white/70 font-medium">
              {selectedPlayers.length}/4 selected
            </span>}
          </div>
          <div className="flex items-center">
            {/* Mini previews of selected players in collapsed header - keep if desired, or simplify */} 
            {!isExpanded && selectedPlayers.slice(0, 4).map(player => (
              <img key={player.id} src={player.image_path} alt={player.fullname} className="-ml-1 h-5 w-5 rounded-full border border-white/20 object-cover" />
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

              let buttonClasses = 'flex items-center rounded-full px-2.5 py-1.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/20 ';
              
              if (playerIsSelected) {
                buttonClasses += 'border border-accent-500/40 bg-accent-500/15 text-accent-300 ';
              } else {
                buttonClasses += 'border border-white/10 bg-surface-800 text-zinc-300 hover:bg-surface-700 ';
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-500" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
            <div className="surface-card p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Yesterday</h2>
              {yesterdayFixtures.length > 0
                ? yesterdayFixtures.map((fixture) => renderStaticFixtureCard(fixture))
                : <p className="text-sm text-zinc-500">No fixtures yesterday.</p>}
            </div>

            <div className="surface-card p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent-400">Today</h2>
              {todayFixtures.length > 0
                ? todayFixtures.map((fixture) => <TodayMatchCard key={fixture.id} fixture={fixture} />)
                : <p className="text-sm text-zinc-500">No fixtures today.</p>}
            </div>

            <div className="surface-card p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Tomorrow</h2>
              {tomorrowFixtures.length > 0
                ? tomorrowFixtures.map((fixture) => renderStaticFixtureCard(fixture))
                : <p className="text-sm text-zinc-500">No fixtures tomorrow.</p>}
            </div>
          </section>

          <div className="surface-card p-6">
            <h2 className="text-lg font-semibold text-white">Selection & scoring</h2>
            <p className="mt-2 text-sm text-zinc-400">Select 4 players from each team (8 total) per match.</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>Batting: 30 pts for 30 runs, 60 for 50, 150 for 100, 5 per six.</li>
              <li>Bowling: 30 pts per wicket.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
