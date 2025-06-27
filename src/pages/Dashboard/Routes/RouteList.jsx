import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import styles from './RouteList.module.css';

const RouteList = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('origin.name:asc');
  
  // Filter state (applied filters)
  const [appliedFilters, setAppliedFilters] = useState({
    'origin.name': '',
    'destination.name': '',
    'origin.code': '',
    'destination.code': ''
  });
  
  // Search form state (input values)
  const [searchForm, setSearchForm] = useState({ 
    originName: '', 
    destinationName: '', 
    originCode: '', 
    destinationCode: ''
  });
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('pageNo', currentPage);
      params.append('pageSize', pageSize);
      
      // Add sorting
      params.append('sortBy', sortBy);
      
      // Add filters (only non-empty values)
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await axiosInstance.get(`/flight-service/api/v1/fs/routes?${params.toString()}`);
      
      if (response.data.statusCode === 200) {
        const { content, totalElements, totalPages } = response.data.data;
        setRoutes(content);
        setTotalElements(totalElements);
        setTotalPages(totalPages);
      } else {
        throw new Error('Failed to fetch routes');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [currentPage, pageSize, sortBy, appliedFilters]);

  const handleSort = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    const newDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(`${field}:${newDirection}`);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    setAppliedFilters({
      'origin.name': searchForm.originName,
      'destination.name': searchForm.destinationName,
      'origin.code': searchForm.originCode,
      'destination.code': searchForm.destinationCode
    });
    setCurrentPage(1);
    setShowSearchBar(false);
  };

  const handleClearFilters = () => {
    setSearchForm({ 
      originName: '', 
      destinationName: '', 
      originCode: '', 
      destinationCode: ''
    });
    setAppliedFilters({
      'origin.name': '',
      'destination.name': '',
      'origin.code': '',
      'destination.code': ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (route) => {
    setSelectedRoute(route);
    setDetailsModalOpen(true);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const renderSortIcon = (field) => {
    const [currentField, direction] = sortBy.split(':');
    if (currentField === field) {
      return direction === 'asc' ? '↑' : '↓';
    }
    return '↕';
  };

  if (loading && routes.length === 0) {
    return <div className={styles.loading}>Loading routes...</div>;
  }

  if (error && routes.length === 0) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Routes Management</h1>
        <div className={styles.headerActions}>
          <button 
            onClick={() => setShowSearchBar(!showSearchBar)}
            className={styles.filterButton}
          >
            {showSearchBar ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button 
            onClick={() => navigate('/dashboard/routes/create')}
            className={styles.createButton}
          >
            Create Route
          </button>
        </div>
      </div>

      {/* Search/Filter Bar */}
      {showSearchBar && (
        <div className={styles.searchBar}>
          <div className={styles.searchGrid}>
            <div className={styles.searchGroup}>
              <label>Origin Name</label>
              <input
                type="text"
                name="originName"
                value={searchForm.originName}
                onChange={handleFilterChange}
                placeholder="Search by origin name..."
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchGroup}>
              <label>Origin Code</label>
              <input
                type="text"
                name="originCode"
                value={searchForm.originCode}
                onChange={handleFilterChange}
                placeholder="Search by origin code..."
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchGroup}>
              <label>Destination Name</label>
              <input
                type="text"
                name="destinationName"
                value={searchForm.destinationName}
                onChange={handleFilterChange}
                placeholder="Search by destination name..."
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchGroup}>
              <label>Destination Code</label>
              <input
                type="text"
                name="destinationCode"
                value={searchForm.destinationCode}
                onChange={handleFilterChange}
                placeholder="Search by destination code..."
                className={styles.searchInput}
              />
            </div>
          </div>
          <div className={styles.searchActions}>
            <button onClick={handleSearch} className={styles.searchButton}>
              Search
            </button>
            <button onClick={handleClearFilters} className={styles.clearButton}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Applied Filters Display */}
      {Object.values(appliedFilters).some(filter => filter) && (
        <div className={styles.appliedFilters}>
          <span>Active filters:</span>
          {Object.entries(appliedFilters).map(([key, value]) => 
            value && (
              <span key={key} className={styles.filterTag}>
                {key}: {value}
              </span>
            )
          )}
          <button onClick={handleClearFilters} className={styles.clearAllFilters}>
            Clear All
          </button>
        </div>
      )}

      {/* Routes Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('origin.name')} className={styles.sortableHeader}>
                Origin {renderSortIcon('origin.name')}
              </th>
              <th onClick={() => handleSort('destination.name')} className={styles.sortableHeader}>
                Destination {renderSortIcon('destination.name')}
              </th>
              <th onClick={() => handleSort('estimatedDurationMinutes')} className={styles.sortableHeader}>
                Duration {renderSortIcon('estimatedDurationMinutes')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(route => (
              <tr key={route.id}>
                <td>
                  <div className={styles.airportInfo}>
                    <strong>{route.origin.code}</strong>
                    <span>{route.origin.name}</span>
                    <small>{route.origin.city}, {route.origin.country}</small>
                  </div>
                </td>
                <td>
                  <div className={styles.airportInfo}>
                    <strong>{route.destination.code}</strong>
                    <span>{route.destination.name}</span>
                    <small>{route.destination.city}, {route.destination.country}</small>
                  </div>
                </td>
                <td className={styles.duration}>
                  {formatDuration(route.estimatedDurationMinutes)}
                </td>
                <td>
                  <button
                    onClick={() => handleViewDetails(route)}
                    className={styles.actionButton}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Showing {routes.length} of {totalElements} routes
        </div>
        <div className={styles.paginationControls}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.pageSizeSelect}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Route Details Modal */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} className={styles.modal}>
        <div className={styles.modalBackdrop}>
          <DialogPanel className={styles.modalPanel}>
            <DialogTitle className={styles.modalTitle}>Route Details</DialogTitle>
            {selectedRoute && (
              <div className={styles.routeDetails}>
                <div className={styles.routeSection}>
                  <h3>Origin Airport</h3>
                  <div className={styles.airportDetails}>
                    <p><strong>Code:</strong> {selectedRoute.origin.code}</p>
                    <p><strong>Name:</strong> {selectedRoute.origin.name}</p>
                    <p><strong>Location:</strong> {selectedRoute.origin.city}, {selectedRoute.origin.country}</p>
                    <p><strong>Timezone:</strong> {selectedRoute.origin.timezone}</p>
                  </div>
                </div>
                
                <div className={styles.routeSection}>
                  <h3>Destination Airport</h3>
                  <div className={styles.airportDetails}>
                    <p><strong>Code:</strong> {selectedRoute.destination.code}</p>
                    <p><strong>Name:</strong> {selectedRoute.destination.name}</p>
                    <p><strong>Location:</strong> {selectedRoute.destination.city}, {selectedRoute.destination.country}</p>
                    <p><strong>Timezone:</strong> {selectedRoute.destination.timezone}</p>
                  </div>
                </div>
                
                <div className={styles.routeSection}>
                  <h3>Flight Information</h3>
                  <div className={styles.flightInfo}>
                    <p><strong>Estimated Duration:</strong> {formatDuration(selectedRoute.estimatedDurationMinutes)}</p>
                    <p><strong>Route ID:</strong> {selectedRoute.id}</p>
                  </div>
                </div>
              </div>
            )}
            <div className={styles.modalActions}>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className={styles.closeButton}
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default RouteList;
