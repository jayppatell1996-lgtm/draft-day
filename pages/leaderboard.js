import Leaderboard from '../components/Leaderboard';
// import Navbar from '../components/Navbar';
import Image from 'next/image';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Section 1: Navbar */}
      {/* <Navbar /> */}
      
      {/* Section 2: Scoreboard Banner */}
      <div className="relative w-full h-[200px] md:h-[300px]">
        <Image
          src="/images/leaderboard-banner.png"
          alt="Scoreboard Banner"
          layout="fill"
          objectFit="cover"
          objectPosition="center"
          priority
        />
      </div>
      
      {/* Section 3: Leaderboard with Purple Gradient Background */}
      <div 
        className="flex-grow relative" 
        style={{
          background: 'linear-gradient(135deg, #14213d 0%, #25406a 50%, #4a6b93 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Content */}
        <div className="relative z-10">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}