import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Function to determine if a link is active
  const isActive = (path) => {
  return router.pathname === path
    ? 'text-navy-600 font-bold bg-navy-200'
    : 'text-navy-600 hover:text-navy-800';
};
  
  // Check if current page is login page
  const isLoginPage = router.pathname === '/login';
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Close menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsMenuOpen(false);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
  
  // Modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Show modal instead of immediate logout
  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    setShowLogoutModal(true);
  };

  // Confirm logout
  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await import('../lib/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  // Delete account and logout
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Get JWT from localStorage/session (Supabase client)
      const { supabase } = await import('../lib/supabaseClient');
      const session = supabase.auth.getSession && (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error('No session token found');

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete account');
      }
      // After deletion, sign out
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      alert('Error deleting account: ' + (error.message || error));
    } finally {
      setDeletingAccount(false);
      setShowLogoutModal(false);
    }
  };


  
  // Handle navigation with menu closing
  const handleNavigation = (path) => {
    setIsMenuOpen(false);
    router.push(path);
  };
  
  return (
    <>
      <nav className="w-full bg-navy-100 shadow-lg h-[2.8rem] flex items-center justify-between px-5 z-[999] sticky top-0 border-b-2 border-[#FFD700]">
        <div className="w-20 h-[2rem] relative">
          <Image
            src="/images/logo.png"
            alt="VS logo"
            layout="fill"
            objectFit="contain"
          />
        </div>
        
        <div className="flex items-center text-navy-600">
          {!isLoginPage && (
            <div className="hidden md:flex items-center space-x-6 mr-6">
              <Link href="/matches">
  <span className={`${isActive('/matches')} ml-2 px-4 py-1 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}>
    Matches
  </span>
</Link>
              <Link href="/leaderboard">
  <span className={`${isActive('/leaderboard')} ml-2 px-4 py-1 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}>
    Leaderboard
  </span>
</Link>
              <Link href="/rules">
  <span className={`${isActive('/rules')} ml-2 px-4 py-1 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}>
    Rules
  </span>
</Link>
              <span 
  className="ml-4 px-4 py-1 text-navy-600 font-semibold hover:text-navy-400 transition-colors duration-200 cursor-pointer"
  onClick={handleLogoutClick}
>
  Logout
</span>
            </div>
          )}
          
          {/* Mobile menu button - Only show on non-login pages and on mobile */}
          {!isLoginPage && (
            <button 
              className="md:hidden mr-4 text-navy-600 focus:outline-none"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </nav>
      
      {/* Mobile dropdown menu */}
      {!isLoginPage && isMenuOpen && (
        <div className="md:hidden fixed top-[2.8rem] left-0 right-0 bg-white z-[998] shadow-md">
          <div className="flex flex-col py-2">
            <span 
  className={`${isActive('/matches')} block my-1 mx-3 px-4 py-2 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}
  onClick={() => handleNavigation('/matches')}
>
  Matches
</span>
            <span 
  className={`${isActive('/leaderboard')} block my-1 mx-3 px-4 py-2 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}
  onClick={() => handleNavigation('/leaderboard')}
>
  Leaderboard
</span>
            <span 
  className={`${isActive('/rules')} block my-1 mx-3 px-4 py-2 rounded-full bg-[#FFD700] text-navy-600 font-bold shadow-md hover:bg-navy-400 hover:text-white transition-all duration-200 cursor-pointer border-2 border-navy-600`}
  onClick={() => handleNavigation('/rules')}
>
  Rules
</span>

            <span 
  className="block px-5 py-2 text-navy-300 font-semibold hover:text-navy-400 transition-colors duration-200 cursor-pointer"
  onClick={handleLogoutClick}
>
  Logout
</span>
          </div>
        </div>
      )}
    {/* Logout/Delete Modal */}
    {showLogoutModal && (
      <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center">
        <div className="bg-navy-100/80 backdrop-blur-md rounded-lg shadow-xl p-8 w-full max-w-xs flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4 text-navy-700">Account Options</h2>
          <p className="mb-6 text-navy-600">Do you want to log out or delete your account?</p>
          <button
            className="w-full mb-3 py-2 px-4 bg-navy-400 hover:bg-navy-600 text-white font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            onClick={handleLogout}
            disabled={deletingAccount}
          >
            Log out
          </button>
          <button
            className="w-full py-2 px-4 bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? 'Deleting...' : 'Delete Account'}
          </button>
          <button
            className="mt-4 text-navy-400 hover:text-navy-700 underline"
            onClick={() => setShowLogoutModal(false)}
            disabled={deletingAccount}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </>
  );
}
