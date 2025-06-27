import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Overview of your flight management system' };
      case '/dashboard/flights':
        return { title: 'Flight Management', subtitle: 'Manage all flights and schedules' };
      case '/dashboard/bookings':
        return { title: 'Booking Management', subtitle: 'View and manage all bookings' };
      case '/dashboard/users':
        return { title: 'User Management', subtitle: 'Manage system users and permissions' };
      case '/dashboard/analytics':
        return { title: 'Analytics', subtitle: 'View system analytics and reports' };
      case '/dashboard/vouchers':
        return { title: 'Voucher Management', subtitle: 'Create and manage promotional vouchers' };
      case '/dashboard/aircraft':
        return { title: 'Aircraft Management', subtitle: 'Management Aircraft' };
      default:
        return { title: 'Dashboard', subtitle: 'Admin Panel' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.pageSubtitle}>{subtitle}</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
