import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../LogoutButton';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, isAuthenticated, isStaffOrAdmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleItemClick = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>✈️</span>
          <span className={styles.logoText}>Boeing Airways</span>
        </Link>

        <div className={styles.nav}>
          <ul className={styles.navLinks}>
            <li>
              <Link to="/" className={styles.navLink}>Home</Link>
            </li>
            <li>
              <Link to="/flights" className={styles.navLink}>Flights</Link>
            </li>
            {isAuthenticated() && (
              <>
              <li>
                <Link to="/booking-overview" className={styles.navLink}>My Bookings</Link>
              </li>
              </>
            )}
            <li>
              <Link to="/about" className={styles.navLink}>About</Link>
            </li>
            <li>
              <Link to="/contact" className={styles.navLink}>Contact</Link>
            </li>
          </ul>

          <div className={styles.authButtons}>
            {isAuthenticated() ? (
              <div className={styles.userInfo} ref={dropdownRef}>
                <div className={styles.userDropdown}>
                  <div className={styles.userAvatar} onClick={toggleDropdown}>
                    {user.email.charAt(0).toUpperCase()}
                    <span className={styles.dropdownIcon}>▼</span>
                  </div>
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <Link
                        to="/check-in-history"
                        className={styles.dropdownItem}
                        onClick={handleItemClick}
                      >
                        Check-in List
                      </Link>
                      <Link
                        to="/my-refund-requests"
                        className={styles.dropdownItem}
                        onClick={handleItemClick}
                      >
                        My Refund Requests
                      </Link>
                    </div>
                  )}
                </div>
                <span className={styles.userName}>{user.name}</span>
                <LogoutButton />
              </div>
            ) : (
              <>
                <Link to="/login" className={`${styles.button} ${styles.loginBtn}`}>
                  Login
                </Link>
                <Link to="/register" className={`${styles.button} ${styles.registerBtn}`}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;