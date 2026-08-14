import Head from 'next/head';

export default function Rules() {
  return (
    <>
      <Head>
        <title>Rules | Fantasy Cricket</title>
        <meta name="description" content="Rules and scoring system for Fantasy Cricket" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen relative">
        <div
          className="relative min-h-screen"
          style={{
            backgroundImage: 'url(/images/green-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <main className="relative z-10 container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-xl p-8 border border-navy-200/20">
                <h1 className="text-4xl font-bold text-[#FFD700] mb-8 text-center text-shadow-sm">
                  Rules & Scoring
                </h1>

                <div className="mb-12">
                  <h2 className="text-[#FFD700] text-2xl font-bold mb-6 inline-block bg-black/50 px-6 py-2 rounded-lg text-shadow-sm">
                    Getting Started
                  </h2>
                  <ul className="space-y-4 text-white">
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Jump in before each match and select your players for both teams.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">Selections cannot be done once the match starts.</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Pick <b>4 players from each team</b> (8 total) — batsmen, bowlers, or all-rounders.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Once you are happy with your picks, submit to lock them in.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">After submission, your choices are final for that match.</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-12">
                  <h2 className="text-[#FFD700] text-2xl font-bold mb-6 inline-block bg-black/50 px-6 py-2 rounded-lg text-shadow-sm">
                    Scoring System
                  </h2>
                  <ul className="space-y-4 text-white">
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Earn points based on your selected players&apos; batting and bowling performances.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Batting: <b>30 points</b> for 30 runs, <b>60 points</b> for 50 runs,{' '}
                        <b>150 points</b> for 100 runs. 5 points per six.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Bowling: <b>30 points</b> for each wicket taken by your selected players.
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-[#FFD700] text-xl">•</span>
                      <span className="font-medium">
                        Track your score after the match on the Leaderboard.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="max-w-4xl mx-auto mt-8">
              <div className="text-center text-[#FFD700] text-base italic bg-black/50 rounded-lg px-6 py-4 shadow-md border border-[#FFD700]/30">
                Note: Additional scoring rules and features will be introduced soon! Stay tuned for updates.
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
