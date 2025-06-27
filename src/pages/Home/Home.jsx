import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { airports, promotions, destinations } from '../../data/mockData';
import styles from './Home.module.css';

const Home = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    tripType: 'one-way',
    from: '',
    to: '',
    departureDate: '',
    returnDate: '',
    passengers: '1 Adult, 0 Child, 0 Infant',
    class: 'Economy'
  });

  const [showPassengerSelector, setShowPassengerSelector] = useState(false);
  const [passengerCount, setPassengerCount] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePassengerCount = (type, increment) => {
    setPassengerCount(prev => {
      const current = prev[type];
      let newValue = current + increment;
      
      // Validation rules
      if (type === 'adults') {
        newValue = Math.max(1, Math.min(newValue, 9)); // Min 1, Max 9 adults
      } else if (type === 'children') {
        newValue = Math.max(0, Math.min(newValue, 8)); // Max 8 children
      } else if (type === 'infants') {
        newValue = Math.max(0, Math.min(newValue, prev.adults)); // Max infants = adults
      }
      
      const updated = { ...prev, [type]: newValue };
      
      // Update passenger string
      const totalPassengers = updated.adults + updated.children + updated.infants;
      if (totalPassengers <= 10) { // Max 10 total passengers
        const passengerString = `${updated.adults} Adult${updated.adults > 1 ? 's' : ''}, ${updated.children} Child${updated.children !== 1 ? 'ren' : ''}, ${updated.infants} Infant${updated.infants !== 1 ? 's' : ''}`;
        setSearchData(prevSearch => ({
          ...prevSearch,
          passengers: passengerString
        }));
        return updated;
      }
      
      return prev; // Don't update if exceeds 10 passengers
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to flights page with search parameters
    const params = new URLSearchParams({
      from: searchData.from,
      to: searchData.to,
      departureDate: searchData.departureDate,
      ...(searchData.tripType === 'round-trip' && { returnDate: searchData.returnDate }),
      passengers: searchData.passengers,
      class: searchData.class
    });
    
    navigate(`/flights?${params.toString()}`);
  };

  // Close passenger selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPassengerSelector && !event.target.closest('.passengerSelector')) {
        setShowPassengerSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPassengerSelector]);

  return (
    <div className={styles.homepage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Discover Your Next Adventure</h1>
          <p className={styles.heroSubtitle}>
            Book flights to amazing destinations worldwide with Boeing Airways
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className={styles.searchSection}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${searchData.tripType === 'one-way' ? styles.active : ''}`}
            onClick={() => handleInputChange('tripType', 'one-way')}
          >
            ✈️ One-way / Round-trip
          </button>
          <button 
            className={`${styles.tab} ${searchData.tripType === 'multi-city' ? styles.active : ''}`}
            onClick={() => handleInputChange('tripType', 'multi-city')}
          >
            🗺️ Multi-city
          </button>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>From</label>
            <select 
              className={styles.input}
              value={searchData.from}
              onChange={(e) => handleInputChange('from', e.target.value)}
              required
            >
              <option value="">Select departure city</option>
              {airports.map(airport => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>To</label>
            <select 
              className={styles.input}
              value={searchData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              required
            >
              <option value="">Select destination</option>
              {airports.map(airport => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Departure Date</label>
            <input 
              type="date"
              className={styles.input}
              value={searchData.departureDate}
              onChange={(e) => handleInputChange('departureDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Passengers</label>
            <div className={`${styles.passengerSelector} passengerSelector`}>
              <button 
                type="button"
                className={styles.passengerButton}
                onClick={() => setShowPassengerSelector(!showPassengerSelector)}
              >
                👥 {searchData.passengers}
              </button>
              
              {showPassengerSelector && (
                <div className={styles.passengerDropdown}>
                  <div className={styles.passengerRow}>
                    <span>Adults (12+ years)</span>
                    <div className={styles.passengerControls}>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('adults', -1)}
                        disabled={passengerCount.adults <= 1}
                      >
                        -
                      </button>
                      <span>{passengerCount.adults}</span>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('adults', 1)}
                        disabled={passengerCount.adults >= 9}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.passengerRow}>
                    <span>Children (2-11 years)</span>
                    <div className={styles.passengerControls}>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('children', -1)}
                        disabled={passengerCount.children <= 0}
                      >
                        -
                      </button>
                      <span>{passengerCount.children}</span>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('children', 1)}
                        disabled={passengerCount.children >= 8}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.passengerRow}>
                    <span>Infants (Under 2 years)</span>
                    <div className={styles.passengerControls}>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('infants', -1)}
                        disabled={passengerCount.infants <= 0}
                      >
                        -
                      </button>
                      <span>{passengerCount.infants}</span>
                      <button 
                        type="button"
                        onClick={() => updatePassengerCount('infants', 1)}
                        disabled={passengerCount.infants >= passengerCount.adults}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.passengerNote}>
                    Maximum 10 passengers per booking
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Class</label>
            <select 
              className={styles.input}
              value={searchData.class}
              onChange={(e) => handleInputChange('class', e.target.value)}
            >
              <option value="Economy">Economy</option>
              <option value="Business">Business</option>
              <option value="First">First Class</option>
            </select>
          </div>

          <button type="submit" className={styles.searchBtn}>
            🔍 Search Flights
          </button>
        </form>

        <div className={styles.options}>
          <div className={styles.quickActions}>
            <button 
              type="button" 
              className={styles.quickBtn}
              onClick={() => navigate('/flights')}
            >
              💡 Discover Flight Ideas
            </button>
            <button 
              type="button" 
              className={styles.quickBtn}
              onClick={() => navigate('/deals')}
            >
              🏷️ Price Alert
            </button>
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section className={styles.promotions}>
        <h2 className={styles.sectionTitle}>Special Offers</h2>
        <div className={styles.promoGrid}>
          {promotions.map(promo => (
            <div key={promo.id} className={styles.promoCard}>
              <div className={styles.promoImage}>
                🎉
              </div>
              <div className={styles.promoContent}>
                <h3 className={styles.promoTitle}>{promo.title}</h3>
                <p className={styles.promoDescription}>{promo.description}</p>
                <span className={styles.promoCode}>Code: {promo.code}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Destinations */}
      <section className={styles.destinations}>
        <h2 className={styles.sectionTitle}>Popular Destinations</h2>
        <div className={styles.destGrid}>
          {destinations.map(dest => (
            <div key={dest.id} className={styles.destCard}>
              <div className={styles.destImage}>
                🏙️
              </div>
              <div className={styles.destContent}>
                <h3 className={styles.destTitle}>{dest.city}, {dest.country}</h3>
                <p className={styles.destDescription}>{dest.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
