import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LogoutButton.module.css';

const LogoutButton = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Chuyển hướng về trang login sau khi logout
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className={styles.logoutButton}
    >
      Logout
    </button>
  );
};

export default LogoutButton; 