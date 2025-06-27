import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axios';
import styles from './CheckInList.module.css';

const CheckInList = () => {
  const [boardingPasses, setBoardingPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBoardingPasses();
  }, []);

  const fetchBoardingPasses = async () => {
    try {
      const response = await axiosInstance.get('CHECK-IN-SERVICE/api/v1/boarding-pass');
      if (response.data.success) {
        setBoardingPasses(response.data.data);
      } else {
        setError('Failed to fetch boarding passes');
      }
    } catch (err) {
      setError('Error loading boarding passes');
      console.error('Error fetching boarding passes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading boarding passes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Check-in History</h1>
      
      {boardingPasses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No boarding passes found</p>
        </div>
      ) : (
        <div className={styles.boardingPassList}>
          {boardingPasses.map((pass) => (
            <div key={pass.id} className={styles.boardingPassCard}>
              <div className={styles.cardHeader}>
                <h2>Boarding Pass</h2>
                <span className={styles.barcode}>{pass.barcode}</span>
              </div>
              
              <div className={styles.cardContent}>
                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <label>Boarding Time</label>
                    <span>{formatDateTime(pass.boardingTime)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Check-in Time</label>
                    <span>{formatDateTime(pass.checkinTime)}</span>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <label>Seat</label>
                    <span className={styles.seatCode}>{pass.seatCode}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Gate</label>
                    <span className={styles.gate}>{pass.gate}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Sequence</label>
                    <span className={styles.sequence}>{pass.sequenceNumber}</span>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoItem}>
                    <label>Issued At</label>
                    <span>{formatDateTime(pass.issuedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckInList; 