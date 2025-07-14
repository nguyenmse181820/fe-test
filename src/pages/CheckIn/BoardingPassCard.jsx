import React from 'react';

const BoardingPassCard = ({
  passengerName,
  from,
  fromCity,
  to,
  toCity,
  flight,
  terminal,
  gate,
  seat,
  class: seatClass,
  date,
  boardingTime,
  departTime,
  arriveTime,
}) => {
  return (
    <div style={{
      background: '#e0e7ff',
      borderRadius: 24,
      boxShadow: '0 4px 24px #0001',
      padding: 0,
      display: 'flex',
      maxWidth: 700,
      margin: 'auto',
      overflow: 'hidden',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      {/* Left */}
      <div style={{ flex: 2, background: '#fff', padding: 24, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 2, color: '#2563eb', marginBottom: 8 }}>BOARDING PASS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: '#555' }}>FROM:</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>{from}</div>
            <div style={{ fontSize: 15, color: '#64748b', fontWeight: 500 }}>{fromCity}</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{date} <span style={{ fontWeight: 600 }}>{departTime}</span></div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 32, color: '#2563eb' }}>✈️</div>
            <div style={{ fontSize: 13, color: '#555' }}>to</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#555' }}>TO:</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>{to}</div>
            <div style={{ fontSize: 15, color: '#64748b', fontWeight: 500 }}>{toCity}</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{date.replace('Jan 25', 'Jan 26')} <span style={{ fontWeight: 600 }}>{arriveTime}</span></div>
          </div>
        </div>
        <div style={{ borderTop: '1px dashed #cbd5e1', margin: '18px 0' }} />
        <div style={{ display: 'flex', gap: 24, fontSize: 15, color: '#2563eb', fontWeight: 600 }}>
          <div>Passenger<br /><span style={{ color: '#0f172a', fontWeight: 700 }}>{passengerName}</span></div>
          <div>Flight<br /><span style={{ color: '#0f172a', fontWeight: 700 }}>{flight}</span></div>
          {seat && (
            <div>Seat<br /><span style={{ color: '#0f172a', fontWeight: 700 }}>{seat}</span></div>
          )}
        </div>
      </div>
      {/* Right */}
      <div style={{ flex: 1, background: '#2563eb', color: '#fff', padding: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 220 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Lorem Airlines</div>
          <div style={{ margin: '16px 0 8px', fontSize: 15 }}>
            Passenger<br /><span style={{ fontWeight: 700, fontSize: 18 }}>{passengerName}</span>
          </div>
          <div style={{ fontSize: 15 }}>
            Class<br /><span style={{ fontWeight: 700, fontSize: 18 }}>{seatClass}</span>
          </div>
        </div>
        <div style={{ margin: '16px 0 8px', fontSize: 14 }}>
          Date <span style={{ fontWeight: 600 }}>{date?.split(',')[0]}</span><br />
          {departTime && (
            <>
              Depart <span style={{ fontWeight: 600 }}>{departTime}</span><br />
            </>
          )}
        </div>
        <div style={{ width: '100%', height: 40, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Fake barcode */}
          <div style={{ width: '90%', height: 24, background: 'repeating-linear-gradient(90deg, #222 0 2px, #fff 2px 6px)' }} />
        </div>
      </div>
    </div>
  );
};

export default BoardingPassCard;
