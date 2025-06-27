import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { DollarSign, FileText } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-toastify';

const CreateRefundRequest = ({ show, onHide, bookingData, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const predefinedReasons = [
    'Flight was cancelled by airline',
    'Significant flight delay (more than 3 hours)',
    'Personal emergency - unable to travel',
    'Medical reasons',
    'Booking error',
    'Other reason'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please select or enter a reason for refund';
    }
    
    if (formData.reason === 'Other reason' && (!formData.customReason || !formData.customReason.trim())) {
      newErrors.customReason = 'Please provide details for your custom reason';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('bookingReference', bookingData.bookingReference);
      
      // Use custom reason if "Other reason" is selected and custom reason is provided
      const reasonToSubmit = formData.reason === 'Other reason' ? formData.customReason : formData.reason;
      params.append('reason', reasonToSubmit);
      
      const response = await axiosInstance.post(
        '/booking-service/api/refund-requests/create',
        null,
        { params }
      );
      
      toast.success('Refund request submitted successfully');
      if (onSuccess) {
        onSuccess(response.data);
      }
      handleClose();
      
    } catch (error) {
      console.error('Error submitting refund request:', error);
      toast.error(error.response?.data || 'Failed to submit refund request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ reason: '' });
    setErrors({});
    onHide();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (!bookingData) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Request Refund</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Booking Information */}
        <div className="bg-light p-3 rounded mb-4">
          <h6>Booking Details</h6>
          <div className="row">
            <div className="col-md-6">
              <div><strong>Booking Reference:</strong> {bookingData.bookingReference}</div>
              <div><strong>Total Amount:</strong> {formatCurrency(bookingData.totalAmount)}</div>
            </div>
            <div className="col-md-6">
              <div><strong>Status:</strong> {bookingData.status}</div>
              <div><strong>Booking Date:</strong> {new Date(bookingData.createdAt).toLocaleDateString('vi-VN')}</div>
            </div>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Reason Selection */}
          <Form.Group className="mb-3">
            <Form.Label>Reason for Refund *</Form.Label>
            {predefinedReasons.map((reason) => (
              <Form.Check
                key={reason}
                type="radio"
                id={reason}
                name="reason"
                value={reason}
                label={reason}
                checked={formData.reason === reason}
                onChange={handleInputChange}
                className="mb-2"
              />
            ))}
            {errors.reason && (
              <Form.Text className="text-danger">{errors.reason}</Form.Text>
            )}
          </Form.Group>

          {/* Custom Reason */}
          {formData.reason === 'Other reason' && (
            <Form.Group className="mb-3">
              <Form.Label>Please specify your reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="customReason"
                value={formData.customReason || ''}
                onChange={handleInputChange}
                placeholder="Please provide details about your refund request..."
              />
              {errors.customReason && (
                <Form.Text className="text-danger">{errors.customReason}</Form.Text>
              )}
            </Form.Group>
          )}

          <Alert variant="info" className="mb-3">
            <div className="d-flex align-items-center">
              <DollarSign size={20} className="me-2" />
              <div>
                <strong>Refund Amount:</strong> {formatCurrency(bookingData.totalAmount)}
                <div className="small">Full refund will be processed if approved</div>
              </div>
            </div>
          </Alert>

          <Alert variant="warning" className="mb-3">
            <div className="d-flex align-items-center">
              <FileText size={20} className="me-2" />
              <div>
                <strong>Processing Time:</strong> 3-5 business days
                <div className="small">You will be notified once your request is reviewed</div>
              </div>
            </div>
          </Alert>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="success" 
          onClick={handleSubmit} 
          disabled={loading || !formData.reason.trim() || (formData.reason === 'Other reason' && (!formData.customReason || !formData.customReason.trim()))}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateRefundRequest;
