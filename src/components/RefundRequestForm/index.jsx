import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, Card } from 'react-bootstrap';
import { DollarSign, FileText, AlertTriangle, Info } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { toast } from 'react-toastify';
import styles from './RefundRequestForm.module.css';

const RefundRequestForm = ({ show, onHide, bookingData, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    customReason: '',
    requestedAmount: '',
    supportingDocuments: null,
    bankAccountNumber: '',
    bankName: '',
    accountHolderName: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [eligibilityCheck, setEligibilityCheck] = useState(null);

  const predefinedReasons = [
    {
      value: 'FLIGHT_CANCELLED',
      label: 'Flight was cancelled by airline',
      description: 'Your flight was cancelled and no alternative was provided'
    },
    {
      value: 'FLIGHT_DELAYED',
      label: 'Significant flight delay',
      description: 'Flight was delayed by more than 3 hours'
    },
    {
      value: 'PERSONAL_EMERGENCY',
      label: 'Personal emergency',
      description: 'Unable to travel due to personal emergency'
    },
    {
      value: 'MEDICAL_REASON',
      label: 'Medical reasons',
      description: 'Unable to travel due to medical reasons'
    },
    {
      value: 'BOOKING_ERROR',
      label: 'Booking error',
      description: 'Mistake in booking details'
    },
    {
      value: 'OTHER',
      label: 'Other reason',
      description: 'Please specify your reason'
    }
  ];

  useEffect(() => {
    if (show && bookingData) {
      checkRefundEligibility();
      // Pre-fill maximum refundable amount
      setFormData(prev => ({
        ...prev,
        requestedAmount: bookingData.totalPrice || ''
      }));
    }
  }, [show, bookingData]);

  const checkRefundEligibility = async () => {
    try {
      const response = await axiosInstance.get(
        `/booking-service/api/bookings/${bookingData.bookingReference}/refund-eligibility`
      );
      setEligibilityCheck(response.data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setEligibilityCheck({
        eligible: false,
        reason: 'Unable to check eligibility at this time'
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrors(prev => ({
          ...prev,
          supportingDocuments: 'File size must be less than 10MB'
        }));
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          supportingDocuments: 'Only JPEG, PNG, and PDF files are allowed'
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        supportingDocuments: file
      }));
      
      setErrors(prev => ({
        ...prev,
        supportingDocuments: null
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.reason) {
      newErrors.reason = 'Please select a reason for refund';
    }
    
    if (formData.reason === 'OTHER' && !formData.customReason.trim()) {
      newErrors.customReason = 'Please specify your reason';
    }
    
    if (!formData.requestedAmount || parseFloat(formData.requestedAmount) <= 0) {
      newErrors.requestedAmount = 'Please enter a valid refund amount';
    }
    
    if (parseFloat(formData.requestedAmount) > parseFloat(bookingData.totalPrice)) {
      newErrors.requestedAmount = 'Refund amount cannot exceed booking total';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }
    
    if (!formData.bankAccountNumber.trim()) {
      newErrors.bankAccountNumber = 'Bank account number is required';
    }
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const submitData = new FormData();
      submitData.append('bookingReference', bookingData.bookingReference);
      submitData.append('reason', formData.reason === 'OTHER' ? formData.customReason : formData.reason);
      submitData.append('requestedAmount', formData.requestedAmount);
      submitData.append('accountHolderName', formData.accountHolderName);
      submitData.append('bankAccountNumber', formData.bankAccountNumber);
      submitData.append('bankName', formData.bankName);
      
      if (formData.supportingDocuments) {
        submitData.append('supportingDocuments', formData.supportingDocuments);
      }
      
      const response = await axiosInstance.post(
        '/booking-service/api/refund-requests',
        submitData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.data.success) {
        toast.success('Refund request submitted successfully');
        onSuccess(response.data.refundRequest);
        handleClose();
      } else {
        throw new Error(response.data.message || 'Failed to submit refund request');
      }
    } catch (error) {
      console.error('Error submitting refund request:', error);
      toast.error(error.message || 'Failed to submit refund request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      reason: '',
      customReason: '',
      requestedAmount: '',
      supportingDocuments: null,
      bankAccountNumber: '',
      bankName: '',
      accountHolderName: ''
    });
    setErrors({});
    setStep(1);
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
    <Modal show={show} onHide={handleClose} size="lg" className={styles.modal}>
      <Modal.Header closeButton className={styles.modalHeader}>
        <Modal.Title>Request Refund</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Booking Information */}
        <Card className="mb-4">
          <Card.Body>
            <h6>Booking Details</h6>
            <Row>
              <Col md={6}>
                <div><strong>Booking Reference:</strong> {bookingData.bookingReference}</div>
                <div><strong>Total Amount:</strong> {formatCurrency(bookingData.totalPrice)}</div>
              </Col>
              <Col md={6}>
                <div><strong>Status:</strong> {bookingData.status}</div>
                <div><strong>Booking Date:</strong> {new Date(bookingData.createdAt).toLocaleDateString('vi-VN')}</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Eligibility Check */}
        {eligibilityCheck && (
          <Alert variant={eligibilityCheck.eligible ? 'success' : 'warning'} className="mb-4">
            <div className="d-flex align-items-center">
              {eligibilityCheck.eligible ? (
                <Info size={20} className="me-2" />
              ) : (
                <AlertTriangle size={20} className="me-2" />
              )}
              <div>
                <strong>
                  {eligibilityCheck.eligible ? 'Eligible for Refund' : 'Limited Refund Eligibility'}
                </strong>
                <div>{eligibilityCheck.reason}</div>
                {eligibilityCheck.maxRefundAmount && (
                  <div>
                    Maximum refundable amount: {formatCurrency(eligibilityCheck.maxRefundAmount)}
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <h6 className="mb-3">Step 1: Refund Details</h6>
              
              {/* Reason Selection */}
              <Form.Group className="mb-3">
                <Form.Label>Reason for Refund *</Form.Label>
                {predefinedReasons.map((reason) => (
                  <Form.Check
                    key={reason.value}
                    type="radio"
                    id={reason.value}
                    name="reason"
                    value={reason.value}
                    label={
                      <div>
                        <div className="fw-bold">{reason.label}</div>
                        <small className="text-muted">{reason.description}</small>
                      </div>
                    }
                    checked={formData.reason === reason.value}
                    onChange={handleInputChange}
                    className="mb-2"
                  />
                ))}
                {errors.reason && (
                  <Form.Text className="text-danger">{errors.reason}</Form.Text>
                )}
              </Form.Group>

              {/* Custom Reason */}
              {formData.reason === 'OTHER' && (
                <Form.Group className="mb-3">
                  <Form.Label>Please specify your reason *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="customReason"
                    value={formData.customReason}
                    onChange={handleInputChange}
                    placeholder="Please provide details about your refund request..."
                    isInvalid={!!errors.customReason}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.customReason}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {/* Refund Amount */}
              <Form.Group className="mb-3">
                <Form.Label>Requested Refund Amount (VND) *</Form.Label>
                <Form.Control
                  type="number"
                  name="requestedAmount"
                  value={formData.requestedAmount}
                  onChange={handleInputChange}
                  placeholder="Enter refund amount"
                  max={bookingData.totalPrice}
                  isInvalid={!!errors.requestedAmount}
                />
                <Form.Text className="text-muted">
                  Maximum refundable: {formatCurrency(bookingData.totalPrice)}
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  {errors.requestedAmount}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Supporting Documents */}
              <Form.Group className="mb-3">
                <Form.Label>Supporting Documents (Optional)</Form.Label>
                <Form.Control
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  isInvalid={!!errors.supportingDocuments}
                />
                <Form.Text className="text-muted">
                  Upload any supporting documents (medical certificates, flight cancellation notices, etc.). 
                  Accepted formats: JPEG, PNG, PDF. Max size: 10MB.
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  {errors.supportingDocuments}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
          )}

          {step === 2 && (
            <div>
              <h6 className="mb-3">Step 2: Refund Account Details</h6>
              
              <Alert variant="info" className="mb-3">
                <Info size={16} className="me-2" />
                Please provide your bank account details for the refund transfer.
              </Alert>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Account Holder Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="accountHolderName"
                      value={formData.accountHolderName}
                      onChange={handleInputChange}
                      placeholder="Full name as on bank account"
                      isInvalid={!!errors.accountHolderName}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.accountHolderName}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bank Account Number *</Form.Label>
                    <Form.Control
                      type="text"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleInputChange}
                      placeholder="Your bank account number"
                      isInvalid={!!errors.bankAccountNumber}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.bankAccountNumber}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Bank Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="Name of your bank"
                  isInvalid={!!errors.bankName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.bankName}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Summary */}
              <Card className="bg-light">
                <Card.Body>
                  <h6>Refund Request Summary</h6>
                  <div><strong>Reason:</strong> {formData.reason === 'OTHER' ? formData.customReason : predefinedReasons.find(r => r.value === formData.reason)?.label}</div>
                  <div><strong>Amount:</strong> {formatCurrency(formData.requestedAmount)}</div>
                  <div><strong>Refund to:</strong> {formData.accountHolderName} - {formData.bankName}</div>
                </Card.Body>
              </Card>
            </div>
          )}
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        
        {step === 1 && (
          <Button variant="primary" onClick={handleNext}>
            Next
          </Button>
        )}
        
        {step === 2 && (
          <>
            <Button variant="outline-secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button 
              variant="success" 
              onClick={handleSubmit} 
              disabled={loading}
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
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default RefundRequestForm;
