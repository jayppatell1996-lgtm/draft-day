// Dummy endpoint to provide match data

export default async function handler(req, res) {
    if (req.method === 'GET') {
      const dummyData = {
        teamA: {
          name: 'Team A',
          players: [
            { id: 1, name: 'Player A1' },
            { id: 2, name: 'Player A2' },
            { id: 3, name: 'Player A3' }
          ]
        },
        teamB: {
          name: 'Team B',
          players: [
            { id: 4, name: 'Player B1' },
            { id: 5, name: 'Player B2' },
            { id: 6, name: 'Player B3' }
          ]
        }
      };
      res.status(200).json(dummyData);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
}