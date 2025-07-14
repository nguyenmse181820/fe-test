import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate and download a ticket PDF for a booking
 * @param {Object} booking - Booking data
 * @param {string} type - Type of ticket ('ticket' or 'boarding-pass')
 */
export const downloadTicket = async (booking, type = 'ticket') => {
  try {
    const { bookingInfo, details, payments } = booking;
    
    // Create a temporary container for the ticket
    const ticketContainer = document.createElement('div');
    ticketContainer.style.position = 'absolute';
    ticketContainer.style.left = '-9999px';
    ticketContainer.style.top = '-9999px';
    ticketContainer.style.width = '1100px'; // Wider for landscape
    ticketContainer.style.background = 'white';
    ticketContainer.style.padding = '20px';
    ticketContainer.style.fontFamily = 'Arial, sans-serif';
    
    // Generate ticket HTML
    ticketContainer.innerHTML = generateTicketHTML(booking, type);
    
    // Append to body
    document.body.appendChild(ticketContainer);
    
    // Generate canvas from HTML
    const canvas = await html2canvas(ticketContainer, {
      scale: 1.5, // Reduced scale for better performance
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1100,
      height: 800 // Fixed height for single page
    });
    
    // Remove temporary container
    document.body.removeChild(ticketContainer);
    
    // Create PDF in landscape mode
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions to fit landscape A4
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm for A4 landscape
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm for A4 landscape
    
    // Scale to fit page
    const canvasAspectRatio = canvas.width / canvas.height;
    const pdfAspectRatio = pdfWidth / pdfHeight;
    
    let finalWidth, finalHeight;
    if (canvasAspectRatio > pdfAspectRatio) {
      // Canvas is wider, fit to width
      finalWidth = pdfWidth;
      finalHeight = pdfWidth / canvasAspectRatio;
    } else {
      // Canvas is taller, fit to height
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * canvasAspectRatio;
    }
    
    // Center the image
    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;
    
    // Add image to PDF
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    
    // Generate filename
    const filename = type === 'boarding-pass' 
      ? `boarding-pass-${bookingInfo.bookingReference}.pdf`
      : `ticket-${bookingInfo.bookingReference}.pdf`;
    
    // Save PDF
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating ticket:', error);
    // Return false instead of throwing, so caller can handle gracefully
    return false;
  }
};

/**
 * Generate HTML content for the ticket
 * @param {Object} booking - Booking data
 * @param {string} type - Type of ticket
 * @returns {string} HTML content
 */
const generateTicketHTML = (booking, type) => {
  const { bookingInfo, details, payments } = booking;
  const flight = details && details[0] ? details[0] : null; // Get first flight detail
  
  // Extract passengers with seat information from booking details
  const passengers = details ? details.map(detail => ({
    ...detail.passenger,
    seatCode: detail.seatCode, // Include seat code from booking detail
    flightId: detail.flightId,
    price: detail.price
  })).filter(p => p && p.firstName) : [];
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatPrice = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return `
    <div style="max-width: 1100px; margin: 0 auto; background: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px;">
      <!-- Header Section -->
      <div style="background: linear-gradient(135deg, #003366 0%, #0066cc 100%); color: white; padding: 25px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">BOEING AIRLINES</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">
            ${type === 'boarding-pass' ? 'Electronic Boarding Pass' : 'Electronic Ticket'}
          </p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 12px; opacity: 0.8;">Booking Reference</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">
            ${bookingInfo.bookingReference}
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #90EE90;">
            ${bookingInfo.status === 'PAID' ? 'CONFIRMED' : bookingInfo.status}
          </p>
        </div>
      </div>
      
      <!-- Main Content Section -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; padding: 25px;">
        
        <!-- Left Column: Flight & Passenger Info -->
        <div>
          <!-- Flight Information -->
          ${flight ? `
            <div style="background: linear-gradient(90deg, #f8fafc 0%, #ffffff 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 2px solid #e2e8f0;">
              <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                Flight Information
              </h3>
              
              <!-- Flight Route -->
              <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 25px; align-items: center; margin-bottom: 20px;">
                <!-- Departure -->
                <div style="text-align: center;">
                  <h4 style="margin: 0 0 10px 0; color: #0066cc; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Departure</h4>
                  <p style="margin: 0; font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: 1px;">
                    ${flight.originAirportCode || 'N/A'}
                  </p>
                  <p style="margin: 5px 0; color: #64748b; font-size: 12px; font-weight: 500;">
                    ${getAirportName(flight.originAirportCode)}
                  </p>
                  <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">
                      ${formatTime(flight.departureTime)}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 11px; font-weight: 500;">
                      ${formatDate(flight.departureTime)}
                    </p>
                  </div>
                </div>
                
                <!-- Flight Icon and Code -->
                <div style="text-align: center; padding: 0 15px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0066cc 0%, #003366 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                    <span style="color: white; font-size: 18px; font-weight: bold; line-height: 1; display: flex; align-items: center; justify-content: center;">✈</span>
                  </div>
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0066cc; text-transform: uppercase; letter-spacing: 1px;">
                    ${flight.flightCode || 'N/A'}
                  </p>
                  <div style="width: 60px; height: 1px; background: #e2e8f0; margin: 10px auto;"></div>
                  <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 500;">
                    ${flight.departureTime && flight.arrivalTime ? calculateFlightDuration(flight.departureTime, flight.arrivalTime) : 'N/A'}
                  </p>
                </div>
                
                <!-- Arrival -->
                <div style="text-align: center;">
                  <h4 style="margin: 0 0 10px 0; color: #0066cc; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Arrival</h4>
                  <p style="margin: 0; font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: 1px;">
                    ${flight.destinationAirportCode || 'N/A'}
                  </p>
                  <p style="margin: 5px 0; color: #64748b; font-size: 12px; font-weight: 500;">
                    ${getAirportName(flight.destinationAirportCode)}
                  </p>
                  <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">
                      ${formatTime(flight.arrivalTime)}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 11px; font-weight: 500;">
                      ${formatDate(flight.arrivalTime)}
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Aircraft Info Grid -->
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Aircraft</p>
                  <p style="margin: 8px 0 0 0; font-weight: 700; color: #1e293b; font-size: 14px;">
                    ${flight.aircraftType || 'Boeing 737'}
                  </p>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Terminal</p>
                  <p style="margin: 8px 0 0 0; font-weight: 700; color: #1e293b; font-size: 14px;">T1</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Passenger Information -->
          <div>
            <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
              Passenger Information
            </h3>
            
            ${passengers.length > 0 ? passengers.map((passenger, index) => `
              <div style="margin-bottom: 15px; background: linear-gradient(90deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <!-- Passenger Compact Header -->
                <div style="background: linear-gradient(90deg, #0066cc 0%, #003366 100%); color: white; padding: 12px 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center;">
                      <div style="width: 30px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                        <span style="font-size: 14px; font-weight: bold;">${index + 1}</span>
                      </div>
                      <div>
                        <h4 style="margin: 0; font-size: 16px; font-weight: 600;">
                          ${passenger.title || ''} ${passenger.firstName || ''} ${passenger.lastName || ''}
                        </h4>
                        <p style="margin: 3px 0 0 0; opacity: 0.8; font-size: 12px;">
                          ${passenger.seatClass || 'Economy'} Class
                        </p>
                      </div>
                    </div>
                    <!-- Seat Assignment Highlight -->
                    <div style="text-align: right;">
                      <p style="margin: 0; opacity: 0.8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Seat</p>
                      <div style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; margin-top: 3px;">
                        <span style="font-size: 18px; font-weight: 800; letter-spacing: 1px;">
                          ${passenger.seatCode || 'TBA'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div style="padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center; border: 2px dashed #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">Passenger information will be available soon</p>
              </div>
            `}
          </div>
        </div>
        
        <!-- Right Column: Payment & Important Info -->
        <div>
          <!-- Payment Information -->
          ${type === 'ticket' ? `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Payment Summary
              </h3>
              
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Amount</p>
                <p style="margin: 8px 0 0 0; font-weight: 800; color: #059669; font-size: 20px;">
                  ${formatPrice(bookingInfo.totalAmount)}
                </p>
              </div>
              
              <div>
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Payment Method</p>
                <p style="margin: 8px 0 0 0; font-weight: 600; color: #1e293b; font-size: 14px;">
                  ${payments && payments[0] ? payments[0].paymentMethod : 'VNPay'}
                </p>
              </div>
            </div>
          ` : ''}
          
          <!-- Important Information -->
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 30px; height: 30px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">!</span>
              </div>
              <h4 style="margin: 0; color: #92400e; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Important Info</h4>
            </div>
            <ul style="margin: 0; padding-left: 15px; color: #92400e; font-size: 11px; line-height: 1.6; font-weight: 500;">
              <li style="margin-bottom: 8px;">Arrive 2-3 hours before departure</li>
              <li style="margin-bottom: 8px;">Check-in online to save time</li>
              <li style="margin-bottom: 8px;">ID must match ticket name exactly</li>
              <li style="margin-bottom: 8px;">Check baggage allowance online</li>
              ${type === 'boarding-pass' ? '<li style="margin-bottom: 8px;">Present at security & gate</li>' : ''}
              <li>Contact support: +84 123 456 789</li>
            </ul>
          </div>
          
          <!-- QR Code Placeholder -->
          <div style="margin-top: 25px; text-align: center; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <div style="width: 120px; height: 120px; background: #f1f5f9; border: 2px dashed #cbd5e1; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <span style="color: #64748b; font-size: 12px; text-align: center;">QR Code<br/>Check-in</span>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 10px;">Scan for mobile check-in</p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%); padding: 15px; text-align: center; border-top: 2px solid #e2e8f0;">
        <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600; letter-spacing: 1px;">BOEING AIRLINES</p>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 10px;">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })} | support@boeing-airlines.com | boeing-airlines.com
        </p>
      </div>
    </div>
          </div>
        </div>
        
        <!-- Right Column: Payment & Important Info -->
        <div>
          <!-- Payment Information -->
          ${type === 'ticket' ? `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Payment Summary
              </h3>
              
              <div style="margin-bottom: 15px;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Amount</p>
                <p style="margin: 8px 0 0 0; font-weight: 800; color: #059669; font-size: 20px;">
                  ${formatPrice(bookingInfo.totalAmount)}
                </p>
              </div>
              
              <div>
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Payment Method</p>
                <p style="margin: 8px 0 0 0; font-weight: 600; color: #1e293b; font-size: 14px;">
                  ${payments && payments[0] ? payments[0].paymentMethod : 'VNPay'}
                </p>
              </div>
            </div>
          ` : ''}
          
          <!-- Important Information -->
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 30px; height: 30px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="color: white; font-size: 16px; font-weight: bold;">!</span>
              </div>
              <h4 style="margin: 0; color: #92400e; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Important Info</h4>
            </div>
            <ul style="margin: 0; padding-left: 15px; color: #92400e; font-size: 11px; line-height: 1.6; font-weight: 500;">
              <li style="margin-bottom: 8px;">Arrive 2-3 hours before departure</li>
              <li style="margin-bottom: 8px;">Check-in online to save time</li>
              <li style="margin-bottom: 8px;">ID must match ticket name exactly</li>
              <li style="margin-bottom: 8px;">Check baggage allowance online</li>
              ${type === 'boarding-pass' ? '<li style="margin-bottom: 8px;">Present at security & gate</li>' : ''}
              <li>Contact support: +84 123 456 789</li>
            </ul>
          </div>
          
          <!-- QR Code Placeholder -->
          <div style="margin-top: 25px; text-align: center; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <div style="width: 120px; height: 120px; background: #f1f5f9; border: 2px dashed #cbd5e1; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <span style="color: #64748b; font-size: 12px; text-align: center;">QR Code<br/>Check-in</span>
            </div>
            <p style="margin: 0; color: #64748b; font-size: 10px;">Scan for mobile check-in</p>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%); padding: 15px; text-align: center; border-top: 2px solid #e2e8f0;">
        <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600; letter-spacing: 1px;">BOEING AIRLINES</p>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 10px;">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })} | support@boeing-airlines.com | boeing-airlines.com
        </p>
      </div>
    </div>
  `;
};

/**
 * Helper function to get airport name
 */
const getAirportName = (code) => {
  const airports = {
    'SGN': 'Tan Son Nhat Airport',
    'HAN': 'Noi Bai International Airport',
    'DAD': 'Da Nang International Airport',
    'CXR': 'Nha Trang Airport',
    'PQC': 'Phu Quoc International Airport'
  };
  return airports[code] || code;
};

/**
 * Helper function to calculate flight duration
 */
const calculateFlightDuration = (departureTime, arrivalTime) => {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Simple ticket download without full booking data (for quick downloads)
 * @param {string} bookingReference - Booking reference
 * @param {Object} basicInfo - Basic booking info
 */
export const downloadSimpleTicket = async (bookingReference, basicInfo) => {
  try {
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
    
    // Simple ticket design for landscape
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('Boeing Airlines', 20, 20);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text('Booking Reference:', 20, 50);
    pdf.setFontSize(18);
    pdf.text(bookingReference, 20, 65);
    
    if (basicInfo) {
      pdf.setFontSize(12);
      pdf.text(`Status: ${basicInfo.status || 'Confirmed'}`, 20, 85);
      pdf.text(`Total Amount: ${basicInfo.totalAmount || 'N/A'}`, 20, 100);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 115);
    }
    
    pdf.save(`ticket-${bookingReference}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating simple ticket:', error);
    return false;
  }
};
