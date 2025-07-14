
import React, { useState } from 'react';
import BoardingPassCard from './BoardingPassCard';
import { useLocation, useNavigate } from 'react-router-dom';
import { createNewBoardingPassService } from '@/services/BoardingPassService';
import { toast } from 'react-toastify';

const BoardingPassList = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingDetail = location.state?.bookingDetail;

    // Nếu không có dữ liệu, hiển thị thông báo
    if (!bookingDetail || !bookingDetail.details || bookingDetail.details.length === 0) {
        return <div style={{ textAlign: 'center', marginTop: 60, color: '#ef4444', fontSize: 20 }}>Không có thông tin boarding pass!</div>;
    }

    // Chuyển đổi dữ liệu API sang props cho BoardingPassCardF
    const passes = bookingDetail.details.map((detail) => {
        const passenger = detail.passenger;
        return {
            passengerName: `${passenger.title ? passenger.title + ' ' : ''}${passenger.firstName} ${passenger.lastName}`,
            from: detail.originAirportCode,
            fromCity: '', // Có thể map thêm tên thành phố nếu muốn
            to: detail.destinationAirportCode,
            toCity: '',
            flight: detail.flightCode,
            terminal: undefined, // Không hiển thị terminal
            gate: undefined, // Không hiển thị gate
            seat: detail.seatCode,
            class: detail.selectedFareName,
            date: new Date(detail.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            boardingTime: undefined, // Không hiển thị boarding time
            departTime: new Date(detail.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            arriveTime: new Date(detail.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            bookingReference: bookingDetail.bookingInfo?.bookingReference || '',
        };
    });

    const [checked, setChecked] = useState(Array(passes.length).fill(false));
    const allChecked = checked.every(Boolean);

    const handleCheck = (idx) => {
        setChecked(prev => prev.map((v, i) => (i === idx ? !v : v)));
    };

    function generateBaggageCode(uuid) {
        if (!uuid || typeof uuid !== "string") return "BG-UNKNOWN";
        const firstPart = uuid.split("-")[0];
        return "BG-" + firstPart;
    }
    

    const handleConfirm = async () => {
        const boardingPassRequestList = bookingDetail.details.map(detail => ({
            seatCode: detail.seatCode,
            flightId: detail.flightId,
            booking_detail_id: detail.bookingDetailId,
            departure_time: detail.departureTime,
            baggage: bookingDetail.baggageAddons.map(bag => ({
                baggageAddOnsId: bag.id,
                tagCode: generateBaggageCode(bag.id),
                weight: bag.weight,
                passengerIndex: bag.passengerIndex
            })
            )
        }));
        try {
            const response = await createNewBoardingPassService(boardingPassRequestList);
            toast.success(response, {
                autoClose: 2000
            });
            setTimeout(() => {
                navigate('/booking-overview');
            }, 1200);
        } catch (error) {
            console.error('Check-in failed:', error);
            toast.error('Có lỗi xảy ra khi thực hiện check-in. Vui lòng thử lại sau.');
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Check-in Boarding Pass</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {passes.map((bp, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                        <BoardingPassCard {...bp} />
                        <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: 15 }}>
                                <input
                                    type="checkbox"
                                    checked={checked[idx]}
                                    onChange={() => handleCheck(idx)}
                                    style={{ marginRight: 8 }}
                                />
                                Tôi xác nhận thông tin trên boarding pass là chính xác
                            </label>
                        </div>
                    </div>
                ))}
            </div>
            <button
                disabled={!allChecked}
                onClick={handleConfirm}
                style={{
                    marginTop: 32,
                    width: '100%',
                    padding: '12px 0',
                    background: allChecked ? '#2563eb' : '#a5b4fc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: allChecked ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                }}
            >
                Xác nhận Check-in
            </button>
        </div>
    );
};

export default BoardingPassList;
