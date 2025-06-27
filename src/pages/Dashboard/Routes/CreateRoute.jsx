import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { FaTimes } from 'react-icons/fa';
import styles from './CreateRoute.module.css';

const CreateRoute = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [airports, setAirports] = useState([]);
  
  const [formData, setFormData] = useState({
    originAirportId: '',
    destinationAirportId: '',
    estimatedDurationMinutes: ''
  });

  // Airport search states
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedOriginAirport, setSelectedOriginAirport] = useState(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState(null);
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [destinationDropdownOpen, setDestinationDropdownOpen] = useState(false);
  
  // Refs for dropdowns
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  const originDropdownRef = useRef(null);
  const destinationDropdownRef = useRef(null);

  const fetchAirports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get('/flight-service/api/v1/airports');
      if (response.data && response.data.data && response.data.data.content) {
        setAirports(response.data.data.content);
      } else {
        throw new Error('Failed to fetch airports');
      }
    } catch (err) {
      console.error('Error fetching airports:', err);
      setError(err.response?.data?.message || 'Failed to fetch airports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAirports();
  }, []);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originDropdownRef.current && !originDropdownRef.current.contains(event.target) && 
          originInputRef.current && !originInputRef.current.contains(event.target)) {
        setOriginDropdownOpen(false);
      }
      if (destinationDropdownRef.current && !destinationDropdownRef.current.contains(event.target) && 
          destinationInputRef.current && !destinationInputRef.current.contains(event.target)) {
        setDestinationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear previous field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.originAirportId) {
      errors.originAirportId = 'Origin airport is required';
    }

    if (!formData.destinationAirportId) {
      errors.destinationAirportId = 'Destination airport is required';
    }

    if (formData.originAirportId === formData.destinationAirportId) {
      errors.destinationAirportId = 'Destination must be different from origin';
    }

    if (!formData.estimatedDurationMinutes) {
      errors.estimatedDurationMinutes = 'Estimated duration is required';
    } else if (isNaN(formData.estimatedDurationMinutes) || Number(formData.estimatedDurationMinutes) <= 0) {
      errors.estimatedDurationMinutes = 'Duration must be a positive number';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setSubmitError(null);
    setFieldErrors({});

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        ...formData,
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes)
      };

      const response = await axiosInstance.post('/flight-service/api/v1/fs/routes', requestData);

      if (response.status === 201 || response.status === 200) {
        navigate('/dashboard/routes');
      } else {
        throw new Error(response.data?.message || 'Failed to create route');
      }
    } catch (err) {
      console.error('Error creating route:', err);
      
      if (err.response?.status === 400) {
        const errorMessage = err.response.data?.message || 'Invalid data provided';
        setSubmitError(errorMessage);
      } else if (err.response?.status >= 500) {
        setSubmitError('Server error occurred. Please try again later.');
      } else {
        setSubmitError(err.message || 'An error occurred while creating the route');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate suggested duration based on airport coordinates
  const calculateSuggestedDuration = () => {
    if (!selectedOriginAirport || !selectedDestinationAirport) return null;
    
    const origin = selectedOriginAirport;
    const destination = selectedDestinationAirport;
    
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      return null;
    }

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (destination.latitude - origin.latitude) * Math.PI / 180;
    const dLon = (destination.longitude - origin.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(origin.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Estimate flight time: distance / average speed + taxi/takeoff/landing time
    // Average commercial flight speed: ~800 km/h, plus ~30 minutes for taxi/takeoff/landing
    const flightTimeHours = (distance / 800) + 0.5;
    const flightTimeMinutes = Math.ceil(flightTimeHours * 60);

    return flightTimeMinutes;
  };

  const handleUseSuggestedDuration = () => {
    const suggested = calculateSuggestedDuration();
    if (suggested) {
      setFormData(prev => ({
        ...prev,
        estimatedDurationMinutes: suggested.toString()
      }));
    }
  };

  // Filter airports for search
  const filteredOrigins = originSearch
    ? airports.filter(a => 
        a.name.toLowerCase().includes(originSearch.toLowerCase()) || 
        a.code.toLowerCase().includes(originSearch.toLowerCase()) ||
        a.city.toLowerCase().includes(originSearch.toLowerCase())
      )
    : airports;

  const filteredDestinations = destinationSearch
    ? airports.filter(a => 
        a.name.toLowerCase().includes(destinationSearch.toLowerCase()) || 
        a.code.toLowerCase().includes(destinationSearch.toLowerCase()) ||
        a.city.toLowerCase().includes(destinationSearch.toLowerCase())
      )
    : airports;

  if (loading && airports.length === 0) {
    return <div className={styles.loading}>Loading airports...</div>;
  }

  if (error && airports.length === 0) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  const suggestedDuration = calculateSuggestedDuration();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create New Route</h1>
        <button 
          onClick={() => navigate('/dashboard/routes')}
          className={styles.backButton}
        >
          Back to Routes
        </button>
      </div>

      {submitError && (
        <div className={styles.submitError}>
          <strong>Error:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2>Route Information</h2>
          
          <div className={styles.formGrid}>
            {/* Origin Airport Selection */}
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label htmlFor="originAirport">Origin Airport</label>
              {selectedOriginAirport ? (
                <div className={styles.selectedAirport}>
                  <div className={styles.airportInfo}>
                    <strong>{selectedOriginAirport.code}</strong>
                    <span>{selectedOriginAirport.name}</span>
                    <small>{selectedOriginAirport.city}, {selectedOriginAirport.country}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOriginAirport(null);
                      setFormData(prev => ({ ...prev, originAirportId: '' }));
                      setOriginSearch('');
                      setOriginDropdownOpen(true);
                    }}
                    className={styles.clearSelection}
                    title="Change airport"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    id="originSearch"
                    placeholder="Search origin airport..."
                    value={originSearch}
                    onChange={e => { setOriginSearch(e.target.value); setOriginDropdownOpen(true); }}
                    onFocus={() => setOriginDropdownOpen(true)}
                    ref={originInputRef}
                    className={`${styles.input} ${fieldErrors.originAirportId ? styles.inputError : ''}`}
                    autoComplete="off"
                  />
                  {originDropdownOpen && (
                    <div className={styles.airportDropdown} ref={originDropdownRef}>
                      {filteredOrigins.map(airport => (
                        <div
                          key={airport.id}
                          className={styles.airportDropdownItem}
                          onClick={() => {
                            setSelectedOriginAirport(airport);
                            setFormData(prev => ({ ...prev, originAirportId: airport.id }));
                            setOriginSearch('');
                            setOriginDropdownOpen(false);
                          }}
                        >
                          <div className={styles.airportInfo}>
                            <strong>{airport.code}</strong>
                            <span>{airport.name}</span>
                            <small>{airport.city}, {airport.country}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {fieldErrors.originAirportId && (
                <span className={styles.fieldError}>{fieldErrors.originAirportId}</span>
              )}
            </div>

            {/* Destination Airport Selection */}
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label htmlFor="destinationAirport">Destination Airport</label>
              {selectedDestinationAirport ? (
                <div className={styles.selectedAirport}>
                  <div className={styles.airportInfo}>
                    <strong>{selectedDestinationAirport.code}</strong>
                    <span>{selectedDestinationAirport.name}</span>
                    <small>{selectedDestinationAirport.city}, {selectedDestinationAirport.country}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDestinationAirport(null);
                      setFormData(prev => ({ ...prev, destinationAirportId: '' }));
                      setDestinationSearch('');
                      setDestinationDropdownOpen(true);
                    }}
                    className={styles.clearSelection}
                    title="Change airport"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    id="destinationSearch"
                    placeholder="Search destination airport..."
                    value={destinationSearch}
                    onChange={e => { setDestinationSearch(e.target.value); setDestinationDropdownOpen(true); }}
                    onFocus={() => setDestinationDropdownOpen(true)}
                    ref={destinationInputRef}
                    className={`${styles.input} ${fieldErrors.destinationAirportId ? styles.inputError : ''}`}
                    autoComplete="off"
                  />
                  {destinationDropdownOpen && (
                    <div className={styles.airportDropdown} ref={destinationDropdownRef}>
                      {filteredDestinations.map(airport => (
                        <div
                          key={airport.id}
                          className={styles.airportDropdownItem}
                          onClick={() => {
                            setSelectedDestinationAirport(airport);
                            setFormData(prev => ({ ...prev, destinationAirportId: airport.id }));
                            setDestinationSearch('');
                            setDestinationDropdownOpen(false);
                          }}
                        >
                          <div className={styles.airportInfo}>
                            <strong>{airport.code}</strong>
                            <span>{airport.name}</span>
                            <small>{airport.city}, {airport.country}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {fieldErrors.destinationAirportId && (
                <span className={styles.fieldError}>{fieldErrors.destinationAirportId}</span>
              )}
            </div>
          </div>

          {/* Duration Input */}
          <div className={styles.formGroup}>
            <label htmlFor="estimatedDurationMinutes">Estimated Duration (minutes)</label>
            <div className={styles.durationInputGroup}>
              <input
                type="number"
                id="estimatedDurationMinutes"
                name="estimatedDurationMinutes"
                value={formData.estimatedDurationMinutes}
                onChange={handleInputChange}
                placeholder="Enter duration in minutes"
                className={`${styles.input} ${fieldErrors.estimatedDurationMinutes ? styles.inputError : ''}`}
                min="1"
                step="1"
              />
              {suggestedDuration && (
                <div className={styles.suggestionContainer}>
                  <span className={styles.suggestion}>
                    Suggested: {Math.floor(suggestedDuration / 60)}h {suggestedDuration % 60}m
                  </span>
                  <button
                    type="button"
                    onClick={handleUseSuggestedDuration}
                    className={styles.useSuggestionButton}
                  >
                    Use Suggestion
                  </button>
                </div>
              )}
            </div>
            {fieldErrors.estimatedDurationMinutes && (
              <span className={styles.fieldError}>{fieldErrors.estimatedDurationMinutes}</span>
            )}
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/routes')}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? 'Creating...' : 'Create Route'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateRoute;
