/**
 * Generate H2H round-robin schedule for the default league (2–12 teams).
 *
 * Usage: node --env-file=.env.local scripts/init-h2h-schedule.js
 */
async function main() {
  const { createH2HSchedule } = await import('../lib/h2hLeague.js');

  try {
    const result = await createH2HSchedule();
    const { rounds, matchups, teamCount, plan } = result;
    console.log(
      `H2H schedule OK — ${teamCount} teams, ${rounds} rounds, ${matchups} matchups` +
        (plan ? ` (${plan.matchupsPerRound} per round).` : '.')
    );
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

main();
