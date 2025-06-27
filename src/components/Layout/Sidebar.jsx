import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsVisible(!isVisible);
  };

  const navigationItems = [
    {
      section: 'Overview',
      items: [
        { path: '/dashboard/analytics', icon: '📈', text: 'Analytics', roles: ['admin'] },
      ]
    },    {
      section: 'Flight Management',
      items: [
        { path: '/dashboard/flights', icon: '✈️', text: 'All Flights', roles: ['staff', 'admin'] },
        { path: '/dashboard/routes', icon: '🗺️', text: 'Routes', roles: ['staff', 'admin'] },
        { path: '/dashboard/schedules', icon: '🗓️', text: 'Schedules', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'Booking Management',
      items: [
        { path: '/dashboard/bookings', icon: '📋', text: 'All Bookings', roles: ['staff', 'admin'] },
        { path: '/dashboard/passengers', icon: '👥', text: 'Passengers', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'Management',
      items: [
        { path: '/dashboard/vouchers', icon: '🎟️', text: 'Vouchers', roles: ['staff', 'admin'] },
        { path: '/dashboard/aircraft', icon: '✈️', text: 'Aircraft', roles: ['staff', 'admin'] },
        { path: '/dashboard/refunds', icon: '💰', text: 'Refund Requests', roles: ['staff', 'admin'] },
      ]
    },
    {
      section: 'System',
      items: [
        { path: '/dashboard/users', icon: '👤', text: 'Users', roles: ['admin'] },
        { path: '/dashboard/reports', icon: '📄', text: 'Reports', roles: ['admin'] },
        { path: '/dashboard/settings', icon: '⚙️', text: 'Settings', roles: ['admin'] },
      ]
    }
  ];
  const hasAccess = (roles) => {
    if (!user?.role) return false;

    if (roles.includes('admin') && isAdmin()) return true;
    if (roles.includes('staff') && (isStaff() || isAdmin())) return true;

    return roles.includes(user.role);
  };

  return (
    <>
      <button className={styles.mobileToggle} onClick={toggleSidebar}>
        ☰
      </button>

      <aside className={`${styles.sidebar} ${isVisible ? styles.visible : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link to="/dashboard" className={styles.logoContainer}>
            <span className={styles.logoIcon}>✈️</span>
            <div>
              <div className={styles.logoText}>Boeing Airways</div>
              <div className={styles.subtitle}>Admin Panel</div>
            </div>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {navigationItems.map((section, index) => (
            <div key={index} className={styles.navSection}>
              <div className={styles.sectionTitle}>{section.section}</div>
              <ul className={styles.navList}>
                {section.items
                  .filter(item => hasAccess(item.roles))
                  .map((item, itemIndex) => (
                    <li key={itemIndex} className={styles.navItem}>
                      <Link
                        to={item.path}
                        className={`${styles.navLink} ${location.pathname === item.path ? styles.active : ''
                          }`}
                        onClick={() => setIsVisible(false)}
                      >
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navText}>{item.text}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
