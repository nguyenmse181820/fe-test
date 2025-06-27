import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { flights, bookings } from '../../data/mockData';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = {
    totalFlights: flights.length,
    totalBookings: bookings.length,
    activeUsers: 1250,
    revenue: 45280
  };

  const recentActivities = [
    {
      id: 1,
      icon: '✈️',
      text: 'New flight FL006 added to SGN-NRT route',
      time: '2 hours ago',
      color: '#3b82f6'
    },
    {
      id: 2,
      icon: '📋',
      text: 'Booking BOEING003 confirmed for John Doe',
      time: '4 hours ago',
      color: '#10b981'
    },
    {
      id: 3,
      icon: '👤',
      text: 'New user registration: jane.smith@email.com',
      time: '6 hours ago',
      color: '#8b5cf6'
    },
    {
      id: 4,
      icon: '💰',
      text: 'Payment processed for booking BOEING001',
      time: '8 hours ago',
      color: '#f59e0b'
    }
  ];

  return (
    <div className={styles.dashboard}>
      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.blue}`}>✈️</div>
          </div>
          <div className={styles.statValue}>{stats.totalFlights}</div>
          <div className={styles.statLabel}>Total Flights</div>
          <div className={`${styles.statChange} ${styles.positive}`}>
            +12% from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.green}`}>📋</div>
          </div>
          <div className={styles.statValue}>{stats.totalBookings}</div>
          <div className={styles.statLabel}>Total Bookings</div>
          <div className={`${styles.statChange} ${styles.positive}`}>
            +8% from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.purple}`}>👥</div>
          </div>
          <div className={styles.statValue}>{stats.activeUsers.toLocaleString()}</div>
          <div className={styles.statLabel}>Active Users</div>
          <div className={`${styles.statChange} ${styles.positive}`}>
            +15% from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.orange}`}>💰</div>
          </div>
          <div className={styles.statValue}>${stats.revenue.toLocaleString()}</div>
          <div className={styles.statLabel}>Monthly Revenue</div>
          <div className={`${styles.statChange} ${styles.positive}`}>
            +22% from last month
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Booking Trends</h3>
          <div className={styles.chartPlaceholder}>
            📊 Booking trends chart would be displayed here
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Popular Routes</h3>
          <div className={styles.chartPlaceholder}>
            🗺️ Popular routes chart would be displayed here
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <h3 className={styles.activityTitle}>Recent Activity</h3>
        <ul className={styles.activityList}>
          {recentActivities.map(activity => (
            <li key={activity.id} className={styles.activityItem}>
              <div 
                className={styles.activityIcon}
                style={{ backgroundColor: activity.color }}
              >
                {activity.icon}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityText}>{activity.text}</div>
                <div className={styles.activityTime}>{activity.time}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
          Quick Actions
        </h3>
        <div className={styles.quickActions}>
          <Link to="/dashboard/flights/add" className={styles.actionBtn}>
            <span className={styles.actionIcon}>➕</span>
            Add New Flight
          </Link>
          <Link to="/dashboard/bookings" className={styles.actionBtn}>
            <span className={styles.actionIcon}>📋</span>
            View All Bookings
          </Link>
          <Link to="/dashboard/users" className={styles.actionBtn}>
            <span className={styles.actionIcon}>👤</span>
            Manage Users
          </Link>
          <Link to="/dashboard/aircraft" className={styles.actionBtn}>
            <span className={styles.actionIcon}>✈️</span>
            Manage Aircraft
          </Link>
          <Link to="/dashboard/routes" className={styles.actionBtn}>
            <span className={styles.actionIcon}>🗺️</span>
            Manage Routes
          </Link>
          <Link to="/dashboard/reports" className={styles.actionBtn}>
            <span className={styles.actionIcon}>📄</span>
            Generate Reports
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
