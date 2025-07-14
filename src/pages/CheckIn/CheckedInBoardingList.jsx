import React, { useEffect, useState } from 'react';
import CheckedInBoardingCard from './CheckedInBoardingCard';
import { useLocation } from 'react-router-dom';
import { getCheckedInBoardingPassesService } from '@/services/BoardingPassService';

const CheckedInBoardingList = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const bookingReference = location.state?.bookingReference || '';
    useEffect(() => {
        const fetchData = async () => {
            const response = await getCheckedInBoardingPassesService(bookingReference);
            if (response && response.length > 0) {
                setData(response);
            }
        };
        fetchData();
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, []);

    if (loading) return <div style={{ textAlign: 'center', marginTop: 60, fontSize: 18, color: '#2563eb' }}>Loading boarding passes...</div>;
    if (!data || data.length === 0) return <div style={{ textAlign: 'center', marginTop: 60, color: '#ef4444', fontSize: 18 }}>You have no boarding passes!</div>;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(120deg, #e0e7ff 0%, #f0f4ff 100%)',
            padding: '40px 0',
        }}>
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
                <h2 style={{
                    textAlign: 'center',
                    marginBottom: 36,
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#1e3a8a',
                    letterSpacing: 1.5,
                    textShadow: '0 2px 8px #3b82f633',
                }}>
                    Checked-in Boarding Passes
                </h2>
                {data.map(pass => (
                    <CheckedInBoardingCard key={pass.id} pass={pass} />
                ))}
            </div>
        </div>
    );
};

export default CheckedInBoardingList;
