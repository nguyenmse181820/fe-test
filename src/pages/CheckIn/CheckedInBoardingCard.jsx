import React, { useState } from 'react';

const BaggageModal = ({ open, onClose, baggages }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 24px #0002' }}>
        <h3 style={{ fontSize: 22, marginBottom: 18, color: '#1e3a8a', fontWeight: 700 }}>Checked Baggage</h3>
        {baggages.length === 0 ? (
          <div style={{ color: '#64748b' }}>No baggage for this passenger.</div>
        ) : (
          <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
            {baggages.map((bag, idx) => (
              <li key={bag.id || idx} style={{ marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                <div><b>Tag:</b> {bag.tagCode}</div>
                <div><b>Type:</b> {bag.type}</div>
                {bag.weight && <div><b>Weight:</b> {bag.weight} kg</div>}
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} style={{ marginTop: 18, padding: '8px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px #2563eb22' }}>Close</button>
      </div>
    </div>
  );
};

const CheckedInBoardingCard = ({ pass }) => {
  const [showModal, setShowModal] = useState(false);
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4ff 0%, #dbeafe 100%)',
      borderRadius: 28,
      boxShadow: '0 4px 24px #0001',
      padding: 0,
      marginBottom: 32,
      maxWidth: 540,
      marginLeft: 'auto',
      marginRight: 'auto',
      position: 'relative',
      overflow: 'hidden',
      border: '1.5px solid #3b82f6',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #2563eb 60%, #1e3a8a 100%)',
        color: '#fff',
        padding: '20px 32px 12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 2 }}>{pass.flightCode}</div>
        <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.9 }}>{pass.classType}</div>
      </div>
      {/* Main content */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
        padding: '24px 32px',
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px dashed #3b82f6',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>{pass.title} {pass.passengerName}</div>
          <div style={{ fontSize: 15, marginBottom: 4 }}>
            Seat: <b>{pass.seatCode}</b>
          </div>
          <div style={{ fontSize: 15, color: '#334155', marginBottom: 4 }}>
            {pass.from} <span style={{ fontWeight: 700, color: '#2563eb', margin: '0 8px' }}>→</span> {pass.to}
          </div>
          <div style={{ fontSize: 15, color: '#64748b', marginBottom: 4 }}>
            Boarding: <b>{new Date(pass.boardingTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b> | Arrival: <b>{new Date(pass.arrivalTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b>
          </div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
            Check-in: {new Date(pass.checkinTime).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          {pass.baggages && pass.baggages.length > 0 && (
            <button onClick={() => setShowModal(true)} style={{ marginTop: 10, padding: '7px 18px', background: '#fbbf24', color: '#78350f', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 15, boxShadow: '0 2px 8px #fbbf2422' }}>
              View baggage ({pass.baggages.length})
            </button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 120, textAlign: 'center', alignSelf: 'center' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Barcode</div>
          <div style={{ background: '#e0e7ff', borderRadius: 10, padding: 10, marginBottom: 8, display: 'inline-block', minWidth: 100 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2 }}>{pass.barcode}</span>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div style={{
        background: 'linear-gradient(90deg, #2563eb 60%, #1e3a8a 100%)',
        color: '#fff',
        padding: '12px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 15,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        <div><b>Booking ref:</b> {pass.id}</div>
        <div><b>Flight date:</b> {new Date(pass.boardingTime).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
      </div>
      <BaggageModal open={showModal} onClose={() => setShowModal(false)} baggages={pass.baggages || []} />
    </div>
  );
};

export default CheckedInBoardingCard;
