import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  Plane,
  AlertTriangle
} from 'lucide-react';
import styles from './BookingOverviewStats.module.css';

const BookingOverviewStats = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    revenue: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    conversionRate: 0,
    averageBookingValue: 0,
    topRoutes: [],
    monthlyTrend: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Mock statistics data for demonstration
      setTimeout(() => {
        setStats({
          totalBookings: 1247,
          revenue: 28750000000,
          completedBookings: 892,
          pendingBookings: 145,
          cancelledBookings: 98,
          conversionRate: 78.5,
          averageBookingValue: 2300000,
          topRoutes: [
            { route: 'SGN → HAN', bookings: 324, revenue: 8100000000 },
            { route: 'HAN → SGN', bookings: 298, revenue: 7450000000 },
            { route: 'SGN → DAD', bookings: 186, revenue: 5580000000 },
            { route: 'HAN → DAD', bookings: 142, revenue: 4260000000 },
            { route: 'SGN → HUI', bookings: 97, revenue: 2910000000 }
          ],
          monthlyTrend: [
            { month: 'Jan', bookings: 98, revenue: 2450000000 },
            { month: 'Feb', bookings: 112, revenue: 2800000000 },
            { month: 'Mar', bookings: 156, revenue: 3900000000 },
            { month: 'Apr', bookings: 134, revenue: 3350000000 },
            { month: 'May', bookings: 167, revenue: 4175000000 },
            { month: 'Jun', bookings: 189, revenue: 4725000000 },
            { month: 'Jul', bookings: 201, revenue: 5025000000 },
            { month: 'Aug', bookings: 178, revenue: 4450000000 },
            { month: 'Sep', bookings: 145, revenue: 3625000000 },
            { month: 'Oct', bookings: 134, revenue: 3350000000 },
            { month: 'Nov', bookings: 156, revenue: 3900000000 },
            { month: 'Dec', bookings: 187, revenue: 4675000000 }
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setLoading(false);
    }
  };

  const formatPrice = (amount, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading booking statistics...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Booking Analytics Overview</h1>
          <p className={styles.subtitle}>Monitor booking performance and trends</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/bookings')}
          className={styles.viewAllButton}
        >
          <Users className={styles.buttonIcon} />
          View All Bookings
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#3b82f6' }}>
            <Users />
          </div>
          <div className={styles.metricContent}>
            <h3>{stats.totalBookings.toLocaleString()}</h3>
            <p>Total Bookings</p>
            <div className={styles.metricChange}>
              <TrendingUp className={styles.changeIcon} />
              <span>+12.5% vs last month</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#10b981' }}>
            <CreditCard />
          </div>
          <div className={styles.metricContent}>
            <h3>{formatPrice(stats.revenue)}</h3>
            <p>Total Revenue</p>
            <div className={styles.metricChange}>
              <TrendingUp className={styles.changeIcon} />
              <span>+18.2% vs last month</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#f59e0b' }}>
            <BarChart3 />
          </div>
          <div className={styles.metricContent}>
            <h3>{formatPrice(stats.averageBookingValue)}</h3>
            <p>Avg Booking Value</p>
            <div className={styles.metricChange}>
              <TrendingUp className={styles.changeIcon} />
              <span>+5.8% vs last month</span>
            </div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ backgroundColor: '#8b5cf6' }}>
            <PieChart />
          </div>
          <div className={styles.metricContent}>
            <h3>{stats.conversionRate}%</h3>
            <p>Conversion Rate</p>
            <div className={styles.metricChange}>
              <TrendingUp className={styles.changeIcon} />
              <span>+2.1% vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className={styles.statusSection}>
        <h2>Booking Status Breakdown</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <CheckCircle className={styles.statusIcon} style={{ color: '#10b981' }} />
            <div className={styles.statusContent}>
              <h3>{stats.completedBookings}</h3>
              <p>Completed</p>
              <div className={styles.statusPercent}>
                {((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <Clock className={styles.statusIcon} style={{ color: '#f59e0b' }} />
            <div className={styles.statusContent}>
              <h3>{stats.pendingBookings}</h3>
              <p>Pending Payment</p>
              <div className={styles.statusPercent}>
                {((stats.pendingBookings / stats.totalBookings) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <XCircle className={styles.statusIcon} style={{ color: '#ef4444' }} />
            <div className={styles.statusContent}>
              <h3>{stats.cancelledBookings}</h3>
              <p>Cancelled</p>
              <div className={styles.statusPercent}>
                {((stats.cancelledBookings / stats.totalBookings) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <AlertTriangle className={styles.statusIcon} style={{ color: '#f97316' }} />
            <div className={styles.statusContent}>
              <h3>{stats.totalBookings - stats.completedBookings - stats.pendingBookings - stats.cancelledBookings}</h3>
              <p>Other</p>
              <div className={styles.statusPercent}>
                {(((stats.totalBookings - stats.completedBookings - stats.pendingBookings - stats.cancelledBookings) / stats.totalBookings) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Routes */}
      <div className={styles.routesSection}>
        <h2>Top Performing Routes</h2>
        <div className={styles.routesGrid}>
          {stats.topRoutes.map((route, index) => (
            <div key={index} className={styles.routeCard}>
              <div className={styles.routeRank}>#{index + 1}</div>
              <div className={styles.routeInfo}>
                <div className={styles.routeName}>
                  <Plane className={styles.routeIcon} />
                  {route.route}
                </div>
                <div className={styles.routeStats}>
                  <div className={styles.routeStat}>
                    <Users className={styles.statIcon} />
                    <span>{route.bookings} bookings</span>
                  </div>
                  <div className={styles.routeStat}>
                    <CreditCard className={styles.statIcon} />
                    <span>{formatPrice(route.revenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className={styles.trendSection}>
        <h2>Monthly Booking Trend</h2>
        <div className={styles.trendChart}>
          <div className={styles.chartContainer}>
            {stats.monthlyTrend.map((month, index) => (
              <div key={index} className={styles.chartBar}>
                <div 
                  className={styles.barFill}
                  style={{ 
                    height: `${(month.bookings / Math.max(...stats.monthlyTrend.map(m => m.bookings))) * 100}%`,
                    backgroundColor: '#3b82f6'
                  }}
                ></div>
                <div className={styles.barLabel}>
                  <div className={styles.barValue}>{month.bookings}</div>
                  <div className={styles.barMonth}>{month.month}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.actionsSection}>
        <h2>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <button 
            onClick={() => navigate('/dashboard/bookings')}
            className={styles.actionButton}
          >
            <Users className={styles.actionIcon} />
            <span>Manage All Bookings</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/refunds')}
            className={styles.actionButton}
          >
            <CreditCard className={styles.actionIcon} />
            <span>Handle Refunds</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/flights')}
            className={styles.actionButton}
          >
            <Plane className={styles.actionIcon} />
            <span>Flight Management</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/reports')}
            className={styles.actionButton}
          >
            <BarChart3 className={styles.actionIcon} />
            <span>Generate Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingOverviewStats;
