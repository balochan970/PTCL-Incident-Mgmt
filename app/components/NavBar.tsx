"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Helper function to verify authentication
const verifyAuthentication = (): boolean => {
  const auth = localStorage.getItem('auth');
  const authCookie = document.cookie.includes('auth=');
  
  if (!auth || !authCookie) return false;
  
  try {
    const authData = JSON.parse(auth);
    const now = new Date().getTime();
    const timestamp = authData.timestamp || 0;
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (
      authData.isAuthenticated && 
      authData.username && 
      authData.role &&
      (now - timestamp <= expiryTime)
    );
  } catch {
    return false;
  }
};

export default function NavBar({ topOffset = '0px' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = verifyAuthentication();
      setIsAuthenticated(isAuth);
      
      if (!isAuth) {
        // Clear auth data and redirect to login
        localStorage.removeItem('auth');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
        router.replace('/login');
      }
    };

    checkAuth();
    
    // Check authentication status periodically
    const interval = setInterval(checkAuth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [router]);

  const isActive = (path: string) => pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="nav-container" style={{ top: topOffset }}>
      <div className="nav-content">
        <Link 
          href="/single-fault"
          className={`nav-link ${isActive('/single-fault') ? 'active' : ''}`}
        >
          Single Fault
        </Link>
        <Link 
          href="/multiple-faults"
          className={`nav-link ${isActive('/multiple-faults') ? 'active' : ''}`}
        >
          Multiple Faults
        </Link>
        <Link 
          href="/gpon-faults"
          className={`nav-link ${isActive('/gpon-faults') ? 'active' : ''}`}
        >
          GPON Faults
        </Link>
        <Link 
          href="/reports"
          className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
        >
          Reports
        </Link>
        <Link 
          href="/gpon-reports"
          className={`nav-link ${isActive('/gpon-reports') ? 'active' : ''}`}
        >
          GPON Reports
        </Link>
        <Link 
          href="/active-faults?source=navbar"
          className={`nav-link ${isActive('/active-faults') ? 'active' : ''}`}
        >
          Active Faults
        </Link>
        <Link 
          href="/knowledgebase"
          className={`nav-link ${isActive('/knowledgebase') ? 'active' : ''}`}
        >
          KnowledgeBase
        </Link>
      </div>

      <style jsx>{`
        .nav-container {
          background: linear-gradient(to bottom, #FFF8E8 0%, #F5ECD6 100%);
          border-bottom: 2px solid #D4C9A8;
          position: fixed;
          width: 100%;
          z-index: 1000;
          height: 40px;
          min-height: 40px;
          box-shadow: 0 2px 4px rgba(74, 70, 55, 0.1);
        }

        .nav-content {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 0 2rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nav-content::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          padding: 0.35rem 1.25rem;
          border-radius: 6px;
          color: #2D2B22;
          font-size: 0.9rem;
          font-weight: 900;
          text-decoration: none;
          transition: all 0.25s ease-in-out;
          white-space: nowrap;
          line-height: 1.5;
          border: 2px solid transparent;
          position: relative;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: #C1A882;
          transform: scaleX(0);
          transition: transform 0.25s ease-in-out;
        }

        .nav-link:hover {
          color: #A0522D;
          background: rgba(193, 168, 130, 0.1);
          border-color: #C1A882;
          transform: translateY(-2px);
        }

        .nav-link:hover::after {
          transform: scaleX(1);
        }

        .nav-link.active {
          background: #A0522D;
          color: #FFF8E8;
          border-color: #8B4513;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.3);
          font-weight: 900;
          transform: translateY(0);
        }

        .nav-link.active::after {
          display: none;
        }

        .nav-link.active:hover {
          background: #8B4513;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
        }

        @media (max-width: 1024px) {
          .nav-content {
            justify-content: flex-start;
            padding: 0 1rem;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .nav-container {
            height: 36px;
            min-height: 36px;
          }

          .nav-content {
            padding: 0 0.75rem;
            gap: 1rem;
          }

          .nav-link {
            padding: 0.25rem 1rem;
            font-size: 0.8rem;
            font-weight: 900;
          }
        }
      `}</style>
    </nav>
  );
}