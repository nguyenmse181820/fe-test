import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from 'react-bootstrap';
import styles from './RefundStatusTimeline.module.css';

const RefundStatusTimeline = ({ request, isAdmin = false }) => {
  const getTimelineSteps = () => {
    const baseSteps = [
      {
        id: 'submitted',
        label: 'Request Submitted',
        description: 'Refund request has been submitted',
        icon: AlertCircle,
        status: 'completed',
        timestamp: request.createdAt
      }
    ];

    if (request.status === 'PENDING') {
      baseSteps.push({
        id: 'review',
        label: 'Under Review',
        description: 'Our team is reviewing your request',
        icon: Clock,
        status: 'active',
        timestamp: null
      });
    } else if (request.status === 'APPROVED') {
      baseSteps.push(
        {
          id: 'review',
          label: 'Review Completed',
          description: 'Request has been reviewed and approved',
          icon: CheckCircle,
          status: 'completed',
          timestamp: request.reviewedAt
        },
        {
          id: 'processing',
          label: 'Processing Refund',
          description: 'Refund is being processed',
          icon: Clock,
          status: request.refundProcessedAt ? 'completed' : 'active',
          timestamp: request.refundProcessedAt
        }
      );

      if (request.refundProcessedAt) {
        baseSteps.push({
          id: 'completed',
          label: 'Refund Completed',
          description: 'Refund has been processed successfully',
          icon: CheckCircle,
          status: 'completed',
          timestamp: request.refundProcessedAt
        });
      }
    } else if (request.status === 'REJECTED') {
      baseSteps.push({
        id: 'rejected',
        label: 'Request Rejected',
        description: request.staffNote || 'Request has been rejected',
        icon: XCircle,
        status: 'rejected',
        timestamp: request.reviewedAt
      });
    }

    return baseSteps;
  };

  const steps = getTimelineSteps();

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getStepIcon = (step) => {
    const IconComponent = step.icon;
    const iconClass = `${styles.stepIcon} ${styles[step.status]}`;
    
    return (
      <div className={iconClass}>
        <IconComponent size={20} />
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { variant: 'success', text: 'Completed' },
      active: { variant: 'primary', text: 'In Progress' },
      rejected: { variant: 'danger', text: 'Rejected' },
      pending: { variant: 'secondary', text: 'Pending' }
    };

    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant} className={styles.statusBadge}>{config.text}</Badge>;
  };

  return (
    <div className={styles.timeline}>
      <h6 className={styles.timelineTitle}>Refund Status Timeline</h6>
      
      <div className={styles.timelineContainer}>
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`${styles.timelineStep} ${styles[step.status]}`}
          >
            <div className={styles.stepIndicator}>
              {getStepIcon(step)}
              {index < steps.length - 1 && (
                <div className={`${styles.stepConnector} ${step.status === 'completed' ? styles.completed : ''}`} />
              )}
            </div>
            
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <h6 className={styles.stepLabel}>{step.label}</h6>
                {getStatusBadge(step.status)}
              </div>
              
              <p className={styles.stepDescription}>{step.description}</p>
              
              {step.timestamp && (
                <small className={styles.stepTimestamp}>
                  {formatTimestamp(step.timestamp)}
                </small>
              )}
              
              {isAdmin && step.id === 'review' && request.status === 'PENDING' && (
                <div className={styles.adminNote}>
                  <small className="text-muted">
                    Pending admin review - estimated processing time: 1-3 business days
                  </small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated completion time for active requests */}
      {request.status === 'PENDING' && (
        <div className={styles.estimatedTime}>
          <AlertCircle size={16} className="text-info me-2" />
          <small className="text text-white">
            Estimated completion time: 3-5 business days from submission
          </small>
        </div>
      )}

      {request.status === 'APPROVED' && !request.refundProcessedAt && (
        <div className={styles.estimatedTime}>
          <Clock size={16} className="text-primary me-2" />
          <small className="text-muted">
            Refund processing typically takes 3-5 business days to appear in your account
          </small>
        </div>
      )}
    </div>
  );
};

export default RefundStatusTimeline;
