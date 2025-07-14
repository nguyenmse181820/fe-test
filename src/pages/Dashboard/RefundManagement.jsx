import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Download, RefreshCw, Calendar, Clock, CheckCircle, XCircle, 
  Eye, MoreHorizontal, Users, DollarSign, TrendingUp, AlertCircle, User, 
  FileText, Phone, Mail, Edit, Trash2, Plus, ArrowUpDown, ChevronDown,
  X, Check, Loader2, CreditCard, UserCheck, Ban, MessageSquare
} from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-toastify';
import { getBookingByReference } from '../../services/BookingService';
import { uploadFileToFirebase, validateFile } from '../../firebase/storage';

const RefundManagement = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [enrichedRefundRequests, setEnrichedRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [refundProof, setRefundProof] = useState(null);
  const [refundProofUrl, setRefundProofUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [refundNote, setRefundNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    totalAmount: 0
  });
  
  // Enhanced search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [amountRange, setAmountRange] = useState({ minAmount: '', maxAmount: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [enrichingData, setEnrichingData] = useState(false);

  useEffect(() => {
    fetchRefundRequests();
    fetchStatistics();
  }, [filter, searchTerm, currentPage, pageSize, sortBy, sortDirection, dateRange, amountRange]);

  // Enrich refund requests with customer data
  const enrichRefundRequestsWithCustomerData = useCallback(async (requests) => {
    if (!requests || requests.length === 0) return [];
    
    setEnrichingData(true);
    const enriched = [];
    
    for (const request of requests) {
      try {
        // Fetch booking details to get customer info
        const bookingData = await getBookingByReference(request.bookingReference);
        
        // Extract customer information from booking
        let customerName = 'N/A';
        let customerEmail = 'N/A';
        let customerPhone = 'N/A';
        
        if (bookingData && bookingData.details && bookingData.details.length > 0) {
          // Get the first passenger's details as the main contact
          const firstPassenger = bookingData.details[0];
          if (firstPassenger.passenger) {
            customerName = `${firstPassenger.passenger.firstName} ${firstPassenger.passenger.lastName}`;
            customerEmail = firstPassenger.passenger.email || request.requestedBy || 'N/A';
            customerPhone = firstPassenger.passenger.phoneNumber || 'N/A';
          } else {
            // Fallback if passenger object doesn't exist
            customerName = `${firstPassenger.firstName || ''} ${firstPassenger.lastName || ''}`.trim() || 'N/A';
            customerEmail = firstPassenger.email || request.requestedBy || 'N/A';
            customerPhone = firstPassenger.phoneNumber || 'N/A';
          }
        } else if (request.requestedBy) {
          // Fallback to requestedBy if no passenger details
          customerEmail = request.requestedBy;
          customerName = request.requestedBy.split('@')[0]; // Use email prefix as name
        }
        
        enriched.push({
          ...request,
          customerName,
          customerEmail,
          customerPhone,
          bookingData
        });
      } catch (error) {
        console.error(`Error fetching booking data for ${request.bookingReference}:`, error);
        enriched.push({
          ...request,
          customerName: request.requestedBy ? request.requestedBy.split('@')[0] : 'N/A',
          customerEmail: request.requestedBy || 'N/A',
          customerPhone: 'N/A',
          bookingData: null
        });
      }
    }
    
    setEnrichingData(false);
    return enriched;
  }, []);

  const fetchStatistics = async () => {
    try {
      // Calculate statistics from the current data since backend might not have stats endpoint
      const response = await axiosInstance.get('/booking-service/api/refund-requests');
      const allRequests = response.data.content || response.data || [];
      
      const stats = {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
        approved: allRequests.filter(r => r.status === 'APPROVED').length,
        rejected: allRequests.filter(r => r.status === 'REJECTED').length,
        completed: allRequests.filter(r => r.status === 'COMPLETED').length,
        totalAmount: allRequests.reduce((sum, r) => sum + (r.refundAmount || 0), 0)
      };
      
      setStatistics(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStatistics({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        totalAmount: 0
      });
    }
  };

  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      let url = '/booking-service/api/refund-requests';
      
      // Build URL based on filter
      if (filter === 'pending') url += '?status=PENDING';
      else if (filter === 'approved') url += '?status=APPROVED';
      else if (filter === 'rejected') url += '?status=REJECTED';
      else if (filter === 'completed') url += '?status=COMPLETED';
      
      // Add search, sort, pagination params
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter.toUpperCase());
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortDirection) params.append('sortDirection', sortDirection);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (amountRange.minAmount) params.append('minAmount', amountRange.minAmount);
      if (amountRange.maxAmount) params.append('maxAmount', amountRange.maxAmount);
      params.append('page', currentPage.toString());
      params.append('size', pageSize.toString());
      
      const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;
      const response = await axiosInstance.get(finalUrl);
      
      const requestsData = response.data.content || response.data || [];
      setRefundRequests(requestsData);
      setTotalElements(response.data.totalElements || requestsData.length || 0);
      setTotalPages(response.data.totalPages || 1);
      
      // Enrich with customer data
      const enriched = await enrichRefundRequestsWithCustomerData(requestsData);
      setEnrichedRefundRequests(enriched);
      
    } catch (error) {
      console.error('Error fetching refund requests:', error);
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleRefundRequest = async (refundRequestId) => {
    try {
      const response = await axiosInstance.get(`/booking-service/api/refund-requests/${refundRequestId}`);
      const requestData = response.data;
      
      // Enrich with customer data
      const enriched = await enrichRefundRequestsWithCustomerData([requestData]);
      setSelectedRequest(enriched[0] || requestData);
    } catch (error) {
      toast.error('Failed to fetch refund request details');
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setRefundNote('');
    setRefundProof(null);
    setRefundProofUrl('');
    // Use refundRequestId instead of id
    if (request.refundRequestId) {
      fetchSingleRefundRequest(request.refundRequestId);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file
      if (!validateFile(file)) {
        return;
      }
      
      setRefundProof(file);
      
      // Upload to Firebase immediately when file is selected
      try {
        setUploadingFile(true);
        const downloadURL = await uploadFileToFirebase(file, 'refund-proofs');
        setRefundProofUrl(downloadURL);
        console.log('File uploaded to Firebase, URL:', downloadURL);
      } catch (error) {
        console.error('Failed to upload file:', error);
        setRefundProof(null);
        setRefundProofUrl('');
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const handleProcessRefund = async (action) => {
    if (!selectedRequest) return;

    if (action === 'approve' && !refundProofUrl) {
      toast.error('Please upload transaction proof before approving the refund request');
      return;
    }

    try {
      setProcessing(true);
      
      let response;
      if (action === 'approve') {
        // Send the Firebase URL to backend
        response = await axiosInstance.post(
          `/booking-service/api/refund-requests/${selectedRequest.refundRequestId}/approve`,
          {
            notes: refundNote || '',
            transactionProofUrl: refundProofUrl
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } else if (action === 'reject') {
        // Use the reject endpoint  
        response = await axiosInstance.post(
          `/booking-service/api/refund-requests/${selectedRequest.refundRequestId}/reject`,
          {
            notes: refundNote || ''
          }
        );
      }

      if (response && response.data) {
        toast.success(`Refund request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowModal(false);
        fetchRefundRequests();
        fetchStatistics(); // Refresh statistics
      } else {
        toast.error('Failed to process refund request');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(`Failed to ${action} refund request`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteRefund = async () => {
    if (!selectedRequest) return;
    setCompleting(true);
    try {
      await axiosInstance.post(`/booking-service/api/refund-requests/${selectedRequest.refundRequestId}/complete`);
      toast.success('Refund marked as completed');
      setShowModal(false);
      fetchRefundRequests();
    } catch (error) {
      toast.error('Failed to complete refund');
    } finally {
      setCompleting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchRefundRequests();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setAmountRange({ minAmount: '', maxAmount: '' });
    setCurrentPage(1);
    setSortBy('createdAt');
    setSortDirection('desc');
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const exportRefundRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (searchTerm) params.append('search', searchTerm);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await axiosInstance.get(`/booking-service/api/refund-requests/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `refund-requests-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export refund requests');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader2 },
      COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Check }
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4 mr-1" />
        {status}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' VND';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text', 'bg').replace('600', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-lg text-gray-600">Loading refund requests...</span>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No refund requests found</h3>
      <p className="text-gray-600">There are no refund requests matching your current filters.</p>
    </div>
  );

  if (loading && !enrichingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
              <p className="mt-2 text-gray-600">Manage and process customer refund requests</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={() => fetchRefundRequests()}
                disabled={loading || enrichingData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(loading || enrichingData) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportRefundRequests}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Requests"
            value={statistics.total}
            icon={FileText}
            color="text-gray-600"
          />
          <StatCard
            title="Pending"
            value={statistics.pending}
            icon={Clock}
            color="text-yellow-600"
          />
          <StatCard
            title="Approved"
            value={statistics.approved}
            icon={CheckCircle}
            color="text-green-600"
          />
          <StatCard
            title="Rejected"
            value={statistics.rejected}
            icon={XCircle}
            color="text-red-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by booking reference, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All', count: statistics.total },
                    { key: 'pending', label: 'Pending', count: statistics.pending },
                    { key: 'approved', label: 'Approved', count: statistics.approved },
                    { key: 'rejected', label: 'Rejected', count: statistics.rejected },
                    { key: 'completed', label: 'Completed', count: statistics.completed }
                  ].map((status) => (
                    <button
                      key={status.key}
                      onClick={() => {
                        setFilter(status.key);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === status.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.label} {status.count > 0 && `(${status.count})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Filter className="w-4 h-4" />
                <span>Advanced Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedFilters && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Range (VND)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={amountRange.minAmount}
                        onChange={(e) => setAmountRange({...amountRange, minAmount: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={amountRange.maxAmount}
                        onChange={(e) => setAmountRange({...amountRange, maxAmount: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Reset Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="text-sm text-gray-700">
            Showing {enrichedRefundRequests.length} of {totalElements} results
            {enrichingData && (
              <span className="ml-2 inline-flex items-center text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Enriching data...
              </span>
            )}
          </div>
          <div className="mt-2 sm:mt-0 flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700">per page</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {enrichedRefundRequests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Request ID</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('bookingReference')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Booking</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('refundAmount')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Created</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedRefundRequests.map((request) => (
                    <tr key={request.refundRequestId || request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {request.refundRequestId ? `${request.refundRequestId.slice(-8)}` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {request.bookingReference}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.customerName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.customerEmail || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(request.refundAmount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.createdAt || request.requestedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm border rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Refund Request Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Request Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Request ID</label>
                      <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded-lg mt-1">
                        {selectedRequest.refundRequestId}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Booking Reference</label>
                      <div className="font-semibold text-gray-900 text-lg mt-1">
                        {selectedRequest.bookingReference}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created</label>
                      <div className="text-gray-900 mt-1">
                        {formatDate(selectedRequest.createdAt || selectedRequest.requestedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <div className="font-semibold text-gray-900 text-lg mt-1">
                        {selectedRequest.customerName || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="text-gray-900 mt-1">
                        {selectedRequest.customerEmail || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <div className="text-gray-900 mt-1">
                        {selectedRequest.customerPhone || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Refund Amount</label>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(selectedRequest.refundAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refund Reason */}
              <div className="bg-yellow-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Refund Reason
                </h3>
                <div className="bg-white p-4 rounded-lg border">
                  {selectedRequest.reason || 'No reason provided'}
                </div>
              </div>

              {/* Process Refund Section - Only for PENDING requests */}
              {selectedRequest.status === 'PENDING' && (
                <div className="bg-white border-2 border-orange-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Process Refund
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Transaction Proof <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploadingFile}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Upload a screenshot or photo showing the refund transaction. Files are stored securely in Firebase. Max 5MB.
                      </p>
                      
                      {/* Upload Progress */}
                      {uploadingFile && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
                            <span className="text-sm text-blue-800">
                              Uploading file to Firebase Storage...
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Success */}
                      {refundProofUrl && !uploadingFile && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-sm text-green-800">
                                File uploaded successfully to Firebase!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => window.open(refundProofUrl, '_blank')}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Preview
                            </button>
                          </div>
                          <p className="text-xs text-green-600 mt-1 font-mono break-all">
                            URL: {refundProofUrl}
                          </p>
                        </div>
                      )}
                      
                      {/* No File Warning */}
                      {!refundProofUrl && !uploadingFile && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                            <span className="text-sm text-yellow-800">
                              Transaction proof is required to approve this refund request
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {refundProof && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Transaction Proof Preview</span>
                          <button
                            onClick={() => setRefundProof(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <img
                          src={URL.createObjectURL(refundProof)}
                          alt="Transaction proof preview"
                          className="max-w-sm max-h-48 rounded-lg border"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Staff Note (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={refundNote}
                        onChange={(e) => setRefundNote(e.target.value)}
                        placeholder="Add any notes about this refund process..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Proof (for completed requests) */}
              {selectedRequest.transactionProofUrl && (
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Refund Proof
                  </h3>
                  <img
                    src={selectedRequest.transactionProofUrl}
                    alt="Refund proof"
                    className="max-w-full max-h-80 rounded-lg border shadow-sm"
                  />
                </div>
              )}

              {/* Staff Notes */}
              {selectedRequest.notes && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Staff Notes
                  </h3>
                  <div className="bg-white p-4 rounded-lg border">
                    {selectedRequest.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                
                {selectedRequest?.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleProcessRefund('reject')}
                      disabled={processing}
                      className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {processing ? 'Processing...' : 'Reject Request'}
                    </button>
                    <button
                      onClick={() => handleProcessRefund('approve')}
                      disabled={processing || uploadingFile || !refundProofUrl}
                      className={`px-6 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                        !refundProofUrl || uploadingFile
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      }`}
                      title={
                        uploadingFile 
                          ? 'Please wait for file upload to complete' 
                          : !refundProofUrl 
                          ? 'Please upload transaction proof to approve' 
                          : 'Approve this refund request'
                      }
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : uploadingFile ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {processing ? 'Processing...' : uploadingFile ? 'Uploading...' : 'Approve Request'}
                    </button>
                  </>
                )}
                
                {selectedRequest?.status === 'APPROVED' && (
                  <button
                    onClick={handleCompleteRefund}
                    disabled={completing}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {completing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {completing ? 'Completing...' : 'Mark as Completed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagement;
