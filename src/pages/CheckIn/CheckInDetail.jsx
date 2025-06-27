import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import styles from './CheckInList.module.css';
import { toast } from 'react-toastify';

const BookingDetail = () => {
  const { bookingReference } = useParams();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  useEffect(() => {
    fetchBookingDetail();
  }, [bookingReference]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      const bookingResponse = await axiosInstance.get(`/BOOKING-SERVICE/booking-service/api/v1/bookings/${bookingReference}`);
      setBookingData(bookingResponse.data.data);

      const flightId = bookingResponse.data.data.details[0].flightId;
      const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);

      setOccupiedSeats(flightResponse.data.occupiedSeats || []);

      const aircraftId = flightResponse.data.aircraft.id;
      const aircraftResponse = await axiosInstance.get(`/air-craft/api/v1/aircraft/${aircraftId}`);

      setSeatMap(aircraftResponse.data.data.aircraftType.seatMap);
    } catch (err) {
      setError('Không thể tải thông tin đặt chỗ');
      console.error('Error fetching booking details:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSeatOccupied = (seatCode) => {
    return occupiedSeats.includes(seatCode);
  };

  const handleSeatSelection = (seatCode) => {
    if (isSeatOccupied(seatCode)) {
      return;
    }
    setSelectedSeat(seatCode);
  };

  const handleCheckIn = async () => {
    if (!selectedSeat) {
      alert('Vui lòng chọn ghế trước khi check-in');
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(`/CHECK-IN-SERVICE/api/v1/boarding-pass?flightId=${bookingData.details[0].flightId}&booking_detail_id=${bookingData.details[0].bookingDetailId}`, {
        barcode: "BP123456789",
        seatCode: selectedSeat,
        gate: "G5",
        sequenceNumber: "045"

      });

      await axiosInstance.post(`/flight-service/api/v1/fs/flights/${bookingData.details[0].flightId}/seats/confirm`, {
        bookingReference: bookingReference,
        seatCodes: [
          selectedSeat
        ]
      })
      if (response && response.data) {
        const notification = await axiosInstance.post(`/USER-SERVICE/api/v1/noti`, {
          codeTemplate: "CHECK_IN_SUCCESS",
          checkInTime: response.data.data.checkInTime,
          boardingPassId: response.data.data.boardingPassId
        });
        if(notification && notification.data){
          toast.info(notification.data.data.content);
        }
      }

      setTimeout(() => navigate('/booking-overview'), 3000);
    } catch (err) {
      setError('Không thể hoàn tất quá trình check-in');
      console.error('Error during check-in:', err);
    } finally {
      setLoading(false);
    }
  };

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

  if (!bookingData) return null;

  const { bookingInfo, details } = bookingData;
  const bookingDetail = details[0];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Chi tiết đặt chỗ</h1>
          <p className={styles.subtitle}>Mã đặt chỗ: {bookingInfo.bookingReference}</p>
        </div>

        <div className={styles.bookingInfo}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Thông tin chuyến bay</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Chuyến bay</label>
                <span>{bookingDetail.flightCode}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Hành trình</label>
                <span>{bookingDetail.originAirportCode} → {bookingDetail.destinationAirportCode}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Khởi hành</label>
                <span>{new Date(bookingDetail.departureTime).toLocaleString('vi-VN')}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Đến</label>
                <span>{new Date(bookingDetail.arrivalTime).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Thông tin hành khách</h2>
            <div className={styles.passengerInfo}>
              <p><strong>Họ tên:</strong> {bookingDetail.passenger.title} {bookingDetail.passenger.firstName} {bookingDetail.passenger.lastName}</p>
              <p><strong>Ngày sinh:</strong> {new Date(bookingDetail.passenger.dateOfBirth).toLocaleDateString('vi-VN')}</p>
              <p><strong>Giới tính:</strong> {bookingDetail.passenger.gender === 'MALE' ? 'Nam' : 'Nữ'}</p>
              <p><strong>Quốc tịch:</strong> {bookingDetail.passenger.nationality}</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Chọn ghế</h2>
            <div className={styles.seatSelection}>
              <div className={styles.seatMap}>
                {seatMap && Object.entries(seatMap.layout).map(([section, data]) => {
                  if (data.type === 'space') {
                    return (
                      <div key={section} className={styles.spaceSection}>
                        <div className={styles.spaceLabel}>{data.label}</div>
                      </div>
                    );
                  }

                  return (
                    <div key={section} className={styles.sectionContainer}>
                      <div className={styles.sectionLabel}>
                        {section === 'first' ? 'Hạng Thương Gia' :
                          section === 'business' ? 'Hạng Phổ Thông Đặc Biệt' :
                            'Hạng Phổ Thông'}
                      </div>
                      <div className={styles.seatRow}>
                        {data.seats.map((seat) => {
                          const isSelected = selectedSeat === seat.seatCode;
                          const isOccupied = isSeatOccupied(seat.seatCode);
                          return (
                            <button
                              key={seat.seatCode}
                              className={`${styles.seat} ${isSelected ? styles.selected : ''} ${isOccupied ? styles.occupied : ''}`}
                              onClick={() => handleSeatSelection(seat.seatCode)}
                              disabled={isOccupied}
                            >
                              {seat.seatCode}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.seatLegend}>
                <div className={styles.legendItem}>
                  <div className={`${styles.seat} ${styles.available}`}></div>
                  <span>Có sẵn</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={`${styles.seat} ${styles.selected}`}></div>
                  <span>Đã chọn</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={`${styles.seat} ${styles.occupied}`}></div>
                  <span>Đã đặt</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              onClick={() => navigate('/check-in')}
            >
              Quay lại
            </button>
            <button
              className={styles.primaryButton}
              onClick={handleCheckIn}
              disabled={!selectedSeat}
            >
              Hoàn tất Check-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetail; 