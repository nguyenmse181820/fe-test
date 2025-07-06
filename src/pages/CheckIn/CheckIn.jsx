import React, { useState, useEffect } from 'react';
import { useNavigate} from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { parseBackendDateTime, formatTimeWithTimezone, getUserTimezone } from '../../utils/timezone';
import styles from './CheckIn.module.css';

const CheckIn = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axiosInstance.get('/BOOKING-SERVICE/booking-service/api/v1/bookings/user');
        setBookings(response.data.data.content);
      } catch (err) {
        setError('Không thể tải lịch sử đặt chỗ');
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>Lỗi</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.primaryButton}
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Lịch sử đặt chỗ</h1>
            <p className={styles.subtitle}>Danh sách các chuyến bay đã đặt</p>
          </div>

          <div className={styles.bookingsList}>
            {bookings.map((booking) => (
              <div key={booking.bookingReference} className={styles.bookingCard}>
                <div className={styles.bookingHeader}>
                  <h3>Mã đặt chỗ: {booking.bookingReference}</h3>
                  <span className={`${styles.status} ${styles[booking.status.toLowerCase()]}`}>
                    {booking.status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </span>
                </div>

                <div className={styles.bookingDetails}>
                  {booking.flightSummaries.map((flight, index) => (
                    <div key={index} className={styles.flightInfo}>
                      <div className={styles.route}>
                        <span>{flight.originAirportCode}</span>
                        <span className={styles.arrow}>→</span>
                        <span>{flight.destinationAirportCode}</span>
                      </div>
                      <div className={styles.flightDetails}>
                        <p>Chuyến bay: {flight.flightCode}</p>
                        <p>Khởi hành: {formatTimeWithTimezone(flight.departureTime, getUserTimezone(), true)}</p>
                      </div>
                    </div>
                  ))}

                  <div className={styles.bookingSummary}>
                    <p>Số hành khách: {booking.passengerCount}</p>
                    <p>Tổng tiền: {booking.totalAmount.toLocaleString('vi-VN')} VNĐ</p>
                    <p>Ngày đặt: {(() => {
                      const date = parseBackendDateTime(booking.bookingDate);
                      return date ? date.toLocaleDateString('vi-VN') : 'N/A';
                    })()}</p>
                    {booking.status === 'PENDING_PAYMENT' && (
                      <p className={styles.deadline}>
                        Hạn thanh toán: {new Date(booking.paymentDeadline).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.bookingActions}>
                  {booking.status === 'PAID' && (
                    <button 
                      className={styles.primaryButton}
                      onClick={() => navigate(`/check-in/detail/${booking.bookingReference}`)}
                    >
                      Check-in
                    </button>
                  )}
                  {booking.status === 'PENDING_PAYMENT' && (
                    <button 
                      className={styles.warningButton}
                      onClick={() => navigate(`/payment/${booking.bookingReference}`)}
                    >
                      Thanh toán
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckIn; 