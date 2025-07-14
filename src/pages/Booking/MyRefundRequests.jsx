import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert, Modal, Button, Row, Col, Form, InputGroup, ProgressBar } from 'react-bootstrap';
import { Eye, FileText, Clock, CheckCircle, XCircle, Search, PlusCircle } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-toastify';
import styles from './MyRefundRequests.module.css';

const MyRefundRequests = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [createForm, setCreateForm] = useState({ bookingReference: '', reason: '', amount: '' });
  const [singleRequest, setSingleRequest] = useState(null);

  useEffect(() => {
    fetchMyRefundRequests();
  }, []);

  const fetchMyRefundRequests = async () => {
    try {
      setLoading(true);
      let url = '/booking-service/api/refund-requests';
      if (searchTerm) url = `/booking-service/api/refund-requests/booking/${searchTerm}`;
      const response = await axiosInstance.get(url);
      setRefundRequests(response.data || []);
    } catch (error) {
      toast.error('Failed to load your refund requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleRefundRequest = async (refundRequestId) => {
    try {
      const response = await axiosInstance.get(`/booking-service/api/refund-requests/${refundRequestId}`);
      setSingleRequest(response.data);
    } catch (error) {
      toast.error('Failed to fetch refund request details');
    }
  };

  const handleCreateRefundRequest = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axiosInstance.post('/booking-service/api/refund-requests/create', createForm);
      toast.success('Refund request submitted');
      setShowCreateModal(false);
      setCreateForm({ bookingReference: '', reason: '', amount: '' });
      fetchMyRefundRequests();
    } catch (error) {
      toast.error('Failed to submit refund request');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    fetchSingleRefundRequest(request.id);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { 
        variant: 'warning', 
        text: 'Pending Review',
        icon: <Clock size={16} className="me-1" />
      },
      APPROVED: { 
        variant: 'success', 
        text: 'Approved & Refunded',
        icon: <CheckCircle size={16} className="me-1" />
      },
      REJECTED: { 
        variant: 'danger', 
        text: 'Rejected',
        icon: <XCircle size={16} className="me-1" />
      },
      PROCESSING: { 
        variant: 'info', 
        text: 'Processing',
        icon: <Clock size={16} className="me-1" />
      }
    };
    
    const config = statusConfig[status] || { 
      variant: 'secondary', 
      text: status,
      icon: null 
    };
    
    return (
      <Badge bg={config.variant} className="d-flex align-items-center">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      PENDING: 'Your refund request is being reviewed by our staff. You will be notified once processed.',
      APPROVED: 'Your refund has been approved and processed. The money should appear in your account within 3-5 business days.',
      REJECTED: 'Your refund request has been rejected. Please contact customer support for more information.',
      PROCESSING: 'Your refund is currently being processed by our finance team.'
    };
    
    return descriptions[status] || 'Status unknown';
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

  const getStatusTimeline = (request) => {
    const steps = [
      { label: 'Requested', time: request.createdAt, icon: <FileText size={18} /> },
      { label: 'Pending', time: request.status === 'PENDING' ? request.processedAt : null, icon: <Clock size={18} /> },
      { label: 'Approved', time: request.status === 'APPROVED' ? request.processedAt : null, icon: <CheckCircle size={18} color="#28a745" /> },
      { label: 'Rejected', time: request.status === 'REJECTED' ? request.processedAt : null, icon: <XCircle size={18} color="#dc3545" /> },
      { label: 'Completed', time: request.status === 'COMPLETED' ? request.completedAt : null, icon: <CheckCircle size={18} color="#007bff" /> },
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
        <span className="ms-2">Loading your refund requests...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Refund Requests</h2>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <PlusCircle size={16} className="me-1" />
            Create Refund Request
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => fetchMyRefundRequests()}
            disabled={loading}
          >
            <RefreshCw size={16} className="me-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search by booking reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline-secondary">
                  <Search size={16} />
                </Button>
              </InputGroup>
            </Col>
            <Col md={6}>
              <div className="d-flex gap-2 align-items-center">
                <span className="text-muted">Status:</span>
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {refundRequests.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <FileText size={48} className="text-muted mb-3" />
            <h5 className="text-muted">No Refund Requests</h5>
            <p className="text-muted">
              You haven't submitted any refund requests yet.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className="row">
          {refundRequests.map((request) => (
            <div key={request.id} className="col-md-6 col-lg-4 mb-4">
              <Card className="h-100">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="card-title mb-1">
                        Booking: {request.bookingReference}
                      </h6>
                      <small className="text-muted">
                        Request ID: {request.id.slice(0, 8)}...
                      </small>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <strong>Refund Amount:</strong>
                      <span className="text-success fw-bold">
                        {formatCurrency(request.refundAmount)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <strong>Submitted:</strong>
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">
                      {getStatusDescription(request.status)}
                    </small>
                  </div>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleViewDetails(request)}
                    className="w-100"
                  >
                    <Eye size={16} className="me-1" />
                    View Details
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))}
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
                    <strong>Request ID:</strong> 
                    <br />
                    <code>{selectedRequest.id}</code>
                  </div>
                  <div className="mb-2">
                    <strong>Booking Reference:</strong> {selectedRequest.bookingReference}
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> 
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <h6>Refund Details</h6>
                  <div className="mb-2">
                    <strong>Refund Amount:</strong> 
                    <br />
                    <span className="text-success fw-bold fs-5">
                      {formatCurrency(selectedRequest.refundAmount)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Submitted:</strong> {formatDate(selectedRequest.createdAt)}
                  </div>
                  {selectedRequest.processedAt && (
                    <div className="mb-2">
                      <strong>Processed:</strong> {formatDate(selectedRequest.processedAt)}
                    </div>
                  )}
                </Col>
              </Row>

              <div className="mb-4">
                <h6>Your Refund Reason</h6>
                <div className="p-3 bg-light rounded">
                  {selectedRequest.reason}
                </div>
              </div>

              <div className="mb-4">
                <Alert variant={
                  selectedRequest.status === 'APPROVED' ? 'success' :
                  selectedRequest.status === 'REJECTED' ? 'danger' : 
                  'info'
                }>
                  <strong>Status: </strong>
                  {getStatusDescription(selectedRequest.status)}
                </Alert>
              </div>

              {selectedRequest.refundProofUrl && (
                <div className="mb-4">
                  <h6>Refund Proof</h6>
                  <p className="text-muted mb-2">
                    Our staff has uploaded proof of your refund transaction:
                  </p>
                  <img
                    src={selectedRequest.refundProofUrl}
                    alt="Refund proof"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
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

              {selectedRequest.status === 'APPROVED' && (
                <Alert variant="success">
                  <CheckCircle size={20} className="me-2" />
                  <strong>Refund Completed!</strong>
                  <br />
                  Your refund has been processed successfully. The money should appear in your account within 3-5 business days.
                  If you don't receive the refund within this timeframe, please contact our customer support.
                </Alert>
              )}

              {selectedRequest.status === 'REJECTED' && (
                <Alert variant="warning">
                  <strong>Need Help?</strong>
                  <br />
                  If you have questions about why your refund was rejected, please contact our customer support team.
                  We're here to help resolve any issues.
                </Alert>
              )}

              {getStatusTimeline(selectedRequest)}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Refund Request Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Refund Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateRefundRequest}>
            <Form.Group className="mb-3">
              <Form.Label>Booking Reference</Form.Label>
              <Form.Control
                type="text"
                value={createForm.bookingReference}
                onChange={e => setCreateForm({ ...createForm, bookingReference: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Refund Amount (VND)</Form.Label>
              <Form.Control
                type="number"
                value={createForm.amount}
                onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
                required
                min={1}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={createForm.reason}
                onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={creating} className="w-100">
              {creating ? <Spinner animation="border" size="sm" /> : 'Submit Request'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MyRefundRequests;
