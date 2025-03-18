"use client";
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../styles/globals.css';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication on component mount
    const auth = localStorage.getItem('auth');
    const authCookie = document.cookie.includes('auth=');
    
    if (!auth || !authCookie) {
      // Clear any partial auth data
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
      return;
    }

    try {
      const authData = JSON.parse(auth);
      if (!authData.isAuthenticated || !authData.username || !authData.role) {
        localStorage.removeItem('auth');
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
        sessionStorage.setItem('fromProtected', 'true');
        router.replace('/login');
        return;
      }
      
      // Check for session expiry (24 hours)
      const now = new Date().getTime();
      const timestamp = authData.timestamp || 0;
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (now - timestamp > expiryTime) {
        // Session expired
        handleLogout();
        return;
      }
    } catch (error) {
      localStorage.removeItem('auth');
      document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
      sessionStorage.setItem('fromProtected', 'true');
      router.replace('/login');
    }
  }, []);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('auth');
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0; domain=' + window.location.hostname;
    sessionStorage.clear();
    router.replace('/login');
  };

  return (
    <div className="home-container">
      <div className="static-background">
        <div className="gradient-overlay"></div>
      </div>

      <div className="content-wrapper">
        <div className="header-section">
          <button onClick={handleLogout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
          <div className="department-name">ROC KTR-2</div>
          <h1>Incident Management System</h1>
        </div>

        <div className="cards-container">
          <Link href="/single-fault" className="card">
            <div className="card-content">
              <div className="card-icon">📝</div>
              <h2>Single Fault</h2>
            </div>
          </Link>

          <Link href="/multiple-faults" className="card">
            <div className="card-content">
              <div className="card-icon">📊</div>
              <h2>Multiple Faults</h2>
            </div>
          </Link>

          <Link href="/gpon-faults" className="card">
            <div className="card-content">
              <div className="card-icon">🔌</div>
              <h2>GPON Faults</h2>
            </div>
          </Link>

          <Link href="/reports" className="card">
            <div className="card-content">
              <div className="card-icon">📈</div>
              <h2>Reports</h2>
            </div>
          </Link>

          <Link href="/gpon-reports" className="card">
            <div className="card-content">
              <div className="card-icon">📊</div>
              <h2>GPON Reports</h2>
            </div>
          </Link>

          <Link href="/active-faults?source=navbar" className="card">
            <div className="card-content">
              <div className="card-icon">🔔</div>
              <h2>Active Faults</h2>
            </div>
          </Link>

          <Link href="/fault-locations" className="card">
            <div className="card-content">
              <div className="card-icon">🗺️</div>
              <h2>Fault Locations</h2>
            </div>
          </Link>

          <Link href="/knowledgebase" className="card">
            <div className="card-content">
              <div className="card-icon">📚</div>
              <h2>Database</h2>
            </div>
          </Link>

          <Link href="/knowledgebase-hub" className="card">
            <div className="card-content">
              <div className="card-icon">📖</div>
              <h2>Knowledge Base</h2>
            </div>
          </Link>
        </div>

        <div className="powered-by">
          <span className="powered-text">Powered By</span>
          <div className="contact-info">
            <p>taimoor2</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .static-background {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .gradient-overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at top left, rgba(79, 70, 229, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.1) 0%, transparent 50%);
        }

        .content-wrapper {
          width: 100%;
          max-width: 1200px;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .header-section {
          text-align: center;
          margin-bottom: 3rem;
          width: 100%;
          position: relative;
        }

        .department-name {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .logout-btn {
          position: absolute;
          top: 0;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.25rem;
          border-radius: 0.75rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .logout-icon {
          font-size: 1.25rem;
        }

        h1 {
          font-size: 2rem;
          color: white;
          margin: 0;
          font-weight: 600;
          opacity: 0.9;
        }

        .cards-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 1rem;
          overflow: hidden;
          text-decoration: none;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
          background: white;
        }

        .card-content {
          padding: 1.5rem;
          text-align: center;
        }

        .card-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        h2 {
          color: #1e293b;
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .powered-by {
          margin-top: 3rem;
          position: relative;
          display: inline-block;
        }

        .powered-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .powered-text:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .contact-info {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 0.5rem;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .powered-by:hover .contact-info {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-5px);
        }

        .contact-info p {
          color: rgba(255, 255, 255, 0.9);
          margin: 0.25rem 0;
          font-size: 0.875rem;
          text-align: center;
        }

        @media (max-width: 1024px) {
          .cards-container {
            grid-template-columns: repeat(2, 1fr);
            max-width: 700px;
          }
        }

        @media (max-width: 768px) {
          .department-name {
            font-size: 2rem;
            margin-top: 3rem;
          }

          .logout-btn {
            position: absolute;
            top: 0;
            right: 50%;
            transform: translateX(50%);
            width: 200px;
          }

          h1 {
            font-size: 1.75rem;
            margin-top: 1rem;
          }
        }

        @media (max-width: 640px) {
          .home-container {
            padding: 1rem;
          }

          .cards-container {
            grid-template-columns: 1fr;
            max-width: 400px;
          }

          .card-content {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
} 