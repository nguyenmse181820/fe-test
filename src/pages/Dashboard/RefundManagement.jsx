import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Modal, Form, Alert, Spinner, Row, Col, InputGroup, Pagination, ProgressBar } from 'react-bootstrap';
import { Camera, Check, X, Eye, FileText, Upload, Search, Filter, Download, RefreshCw, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-toastify';
import styles from './RefundManagement.module.css';

const RefundManagement = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [refundProof, setRefundProof] = useState(null);
  const [refundNote, setRefundNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [singleRequest, setSingleRequest] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, completed, rejected
  
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

  useEffect(() => {
    fetchRefundRequests();
  }, [filter, searchTerm, currentPage, pageSize, sortBy, sortDirection, dateRange, amountRange]);

  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      let url = '/api/refund-requests/pending';
      if (filter === 'approved') url = '/api/refund-requests?status=APPROVED';
      else if (filter === 'rejected') url = '/api/refund-requests?status=REJECTED';
      else if (filter === 'completed') url = '/api/refund-requests?status=COMPLETED';
      else if (filter === 'all') url = '/api/refund-requests';
      
      // Add search, sort, pagination params
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (sortBy) params.sortBy = sortBy;
      if (sortDirection) params.sortDirection = sortDirection;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (amountRange.minAmount) params.minAmount = amountRange.minAmount;
      if (amountRange.maxAmount) params.maxAmount = amountRange.maxAmount;
      params.page = currentPage;
      params.size = pageSize;
      
      const response = await axiosInstance.get(url, { params });
      setRefundRequests(response.data.content || response.data || []);
      setTotalElements(response.data.totalElements || response.data.length || 0);
      setTotalPages(response.data.totalPages || 1);
      
    } catch (error) {
      console.error('Error fetching refund requests:', error);
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleRefundRequest = async (refundRequestId) => {
    try {
      const response = await axiosInstance.get(`/api/refund-requests/${refundRequestId}`);
      setSingleRequest(response.data);
    } catch (error) {
      toast.error('Failed to fetch refund request details');
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setRefundNote('');
    setRefundProof(null);
    fetchSingleRefundRequest(request.id);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setRefundProof(file);
    }
  };

  const handleProcessRefund = async (action) => {
    if (!selectedRequest) return;

    if (action === 'approve' && !refundProof) {
      toast.error('Please upload refund proof before approving');
      return;
    }

    try {
      setProcessing(true);
      
      const formData = new FormData();
      formData.append('action', action);
      formData.append('note', refundNote);
      
      if (refundProof) {
        formData.append('refundProof', refundProof);
      }

      const response = await axiosInstance.post(
        `/api/refund-requests/${selectedRequest.id}/approve`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        toast.success(`Refund request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowModal(false);
        fetchRefundRequests();
      } else {
        toast.error(response.data.message || 'Failed to process refund request');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund request');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteRefund = async () => {
    if (!selectedRequest) return;
    setCompleting(true);
    try {
      await axiosInstance.post(`/api/refund-requests/${selectedRequest.id}/complete`);
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
      PENDING: { variant: 'warning', text: 'Pending' },
      APPROVED: { variant: 'success', text: 'Approved' },
      REJECTED: { variant: 'danger', text: 'Rejected' },
      PROCESSING: { variant: 'info', text: 'Processing' },
      COMPLETED: { variant: 'primary', text: 'Completed' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Status timeline for modal
  const getStatusTimeline = (request) => {
    const steps = [
      { label: 'Requested', time: request.createdAt, icon: <FileText size={18} /> },
      { label: 'Pending', time: request.status === 'PENDING' ? request.processedAt : null, icon: <Clock size={18} /> },
      { label: 'Approved', time: request.status === 'APPROVED' ? request.processedAt : null, icon: <CheckCircle size={18} color="#28a745" /> },
      { label: 'Rejected', time: request.status === 'REJECTED' ? request.processedAt : null, icon: <XCircle size={18} color="#dc3545" /> },
      { label: 'Completed', time: request.status === 'COMPLETED' ? request.completedAt : null, icon: <Check size={18} color="#007bff" /> },
    ];
    return (
      <div className="mb-4">
        <h6>Status Timeline</h6>
        <div className="d-flex flex-row align-items-center gap-3">
          {steps.map((step, idx) => (
            <div key={step.label} className="text-center">
              <div>{step.icon}</div>
              <div style={{ fontSize: 12 }}>{step.label}</div>
              {step.time && <div className="text-muted" style={{ fontSize: 11 }}>{formatDate(step.time)}</div>}
              {idx < steps.length - 1 && <div style={{ width: 30, height: 2, background: '#dee2e6', margin: '0 8px', display: 'inline-block' }} />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading refund requests...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header with title and actions */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Refund Management</h2>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => fetchRefundRequests()}
            disabled={loading}
          >
            <RefreshCw size={16} className="me-1" />
            Refresh
          </Button>
          <Button
            variant="outline-primary"
            onClick={exportRefundRequests}
          >
            <Download size={16} className="me-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-primary">{statistics.total}</h4>
              <p className="mb-0">Total Requests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-warning">{statistics.pending}</h4>
              <p className="mb-0">Pending</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-success">{statistics.approved}</h4>
              <p className="mb-0">Approved</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-danger">{statistics.rejected}</h4>
              <p className="mb-0">Rejected</p>
            </Card.Body>
          </Card>
        </Col>
      </Row> */}

      {/* Filters and Search */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by booking reference, customer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button type="submit" variant="outline-secondary">
                    <Search size={16} />
                  </Button>
                </InputGroup>
              </Form>
            </Col>
            <Col md={6}>
              <div className="d-flex gap-2 align-items-center">
                <span>Status:</span>
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => {
                      setFilter(status);
                      setCurrentPage(1);
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter size={16} className="me-1" />
                  Filters
                </Button>
              </div>
            </Col>
          </Row>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Row className="mt-3 pt-3 border-top">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date Range</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Amount Range (VND)</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Min amount"
                        value={amountRange.minAmount}
                        onChange={(e) => setAmountRange({...amountRange, minAmount: e.target.value})}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Max amount"
                        value={amountRange.maxAmount}
                        onChange={(e) => setAmountRange({...amountRange, maxAmount: e.target.value})}
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button variant="outline-secondary" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Status filter buttons */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted">
          Showing {refundRequests.length} of {totalElements} results
        </span>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">Page size:</span>
          <Form.Select
            size="sm"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Form.Select>
        </div>
      </div>

      <Card>
        <Card.Body>
          {refundRequests.length === 0 ? (
            <div className="text-center py-5">
              <FileText size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No refund requests found</h5>
              <p className="text-muted">There are no refund requests for the selected filter.</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('id')}
                  >
                    Request ID
                    {sortBy === 'id' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('bookingReference')}
                  >
                    Booking Reference
                    {sortBy === 'bookingReference' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('customerName')}
                  >
                    Customer
                    {sortBy === 'customerName' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('refundAmount')}
                  >
                    Amount
                    {sortBy === 'refundAmount' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th>Reason</th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortBy === 'status' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('createdAt')}
                  >
                    Created Date
                    {sortBy === 'createdAt' && (
                      <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <code>{request.id.slice(0, 8)}...</code>
                    </td>
                    <td>
                      <strong>{request.bookingReference}</strong>
                    </td>
                    <td>
                      <div>
                        <div className="fw-bold">{request.customerName}</div>
                        <small className="text-muted">{request.customerEmail}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{formatCurrency(request.refundAmount)}</strong>
                    </td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        {request.reason.length > 50 
                          ? `${request.reason.substring(0, 50)}...` 
                          : request.reason
                        }
                      </div>
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye size={16} className="me-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center">
          <Pagination>
            <Pagination.First 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            
            {/* Show page numbers */}
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
                <Pagination.Item
                  key={pageNum}
                  active={currentPage === pageNum}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Pagination.Item>
              );
            })}
            
            <Pagination.Next 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* Refund Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Refund Request Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Request Information</h6>
                  <div className="mb-2">
                    <strong>Request ID:</strong> {selectedRequest.id}
                  </div>
                  <div className="mb-2">
                    <strong>Booking Reference:</strong> {selectedRequest.bookingReference}
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div className="mb-2">
                    <strong>Created:</strong> {formatDate(selectedRequest.createdAt)}
                  </div>
                </Col>
                <Col md={6}>
                  <h6>Customer Information</h6>
                  <div className="mb-2">
                    <strong>Name:</strong> {selectedRequest.customerName}
                  </div>
                  <div className="mb-2">
                    <strong>Email:</strong> {selectedRequest.customerEmail}
                  </div>
                  <div className="mb-2">
                    <strong>Phone:</strong> {selectedRequest.customerPhone}
                  </div>
                  <div className="mb-2">
                    <strong>Refund Amount:</strong> {formatCurrency(selectedRequest.refundAmount)}
                  </div>
                </Col>
              </Row>

              <div className="mb-4">
                <h6>Refund Reason</h6>
                <div className="p-3 bg-light rounded">
                  {selectedRequest.reason}
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div>
                  <h6>Process Refund</h6>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Upload Refund Proof (Required for approval)</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <Form.Text className="text-muted">
                      Upload a screenshot or photo showing the refund transaction. Max 5MB.
                    </Form.Text>
                  </Form.Group>

                  {refundProof && (
                    <div className="mb-3">
                      <img
                        src={URL.createObjectURL(refundProof)}
                        alt="Refund proof preview"
                        style={{ maxWidth: '300px', maxHeight: '200px' }}
                        className="img-thumbnail"
                      />
                    </div>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Staff Note (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      placeholder="Add any notes about this refund process..."
                    />
                  </Form.Group>
                </div>
              )}

              {selectedRequest.status === 'COMPLETED' && (
                <div className="mb-4">
                  <h6>Completion Details</h6>
                  <div className="p-3 bg-light rounded">
                    <p className="mb-1"><strong>Completed By:</strong> {selectedRequest.completedBy}</p>
                    <p className="mb-1"><strong>Completion Date:</strong> {formatDate(selectedRequest.completedAt)}</p>
                    <p className="mb-1"><strong>Completion Note:</strong> {selectedRequest.completionNote}</p>
                  </div>
                </div>
              )}

              {selectedRequest.refundProofUrl && (
                <div className="mb-4">
                  <h6>Refund Proof</h6>
                  <img
                    src={selectedRequest.refundProofUrl}
                    alt="Refund proof"
                    style={{ maxWidth: '100%', maxHeight: '300px' }}
                    className="img-thumbnail"
                  />
                </div>
              )}

              {selectedRequest.staffNote && (
                <div className="mb-4">
                  <h6>Staff Note</h6>
                  <div className="p-3 bg-light rounded">
                    {selectedRequest.staffNote}
                  </div>
                </div>
              )}

              {getStatusTimeline(selectedRequest)}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          {selectedRequest?.status === 'PENDING' && (
            <>
              <Button
                variant="danger"
                onClick={() => handleProcessRefund('reject')}
                disabled={processing}
              >
                {processing ? <Spinner animation="border" size="sm" /> : <X size={16} />}
                {processing ? ' Processing...' : ' Reject'}
              </Button>
              <Button
                variant="success"
                onClick={() => handleProcessRefund('approve')}
                disabled={processing || !refundProof}
              >
                {processing ? <Spinner animation="border" size="sm" /> : <Check size={16} />}
                {processing ? ' Processing...' : ' Approve'}
              </Button>
            </>
          )}
          {selectedRequest?.status === 'APPROVED' && (
            <Button
              variant="primary"
              onClick={handleCompleteRefund}
              disabled={completing}
            >
              {completing ? <Spinner animation="border" size="sm" /> : <CheckCircle size={16} />}
              {completing ? ' Completing...' : ' Mark as Completed'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RefundManagement;
