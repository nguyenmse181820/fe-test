import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import {
  Gift,
  Ticket,
  CheckCircle,
  X,
  AlertCircle,
  RefreshCw,
  Tag,
  Percent,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-toastify';
import voucherService from '../../services/voucherService';
import { validateVoucherCode, formatVoucherError, isVoucherApplicable, formatCurrency } from '../../utils/loyaltyValidation';

const VoucherSelection = ({ 
  userId, 
  bookingAmount, 
  onVoucherApplied, 
  onVoucherRemoved,
  selectedVoucher,
  disabled = false
}) => {
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [manualVoucherCode, setManualVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingVouchers, setFetchingVouchers] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchAvailableVouchers();
    }
  }, [userId]);

  const fetchAvailableVouchers = async () => {
    try {
      setFetchingVouchers(true);
      const vouchers = await voucherService.getAvailableVouchers(userId);
      
      // Filter vouchers that are applicable for the current booking amount
      const applicableVouchers = vouchers.filter(voucher => 
        !voucher.isUsed && 
        new Date(voucher.expiresAt) > new Date() &&
        voucher.voucherTemplate &&
        voucher.voucherTemplate.status === 'ACTIVE' &&
        bookingAmount >= (voucher.voucherTemplate.minSpend || 0)
      );
      
      setAvailableVouchers(applicableVouchers);
    } catch (error) {
      console.error('Error fetching available vouchers:', error);
      toast.error('Failed to load available vouchers');
    } finally {
      setFetchingVouchers(false);
    }
  };

  const handleApplyVoucher = async (voucherCode) => {
    try {
      setLoading(true);
      
      // Enhanced validation
      if (!userId) {
        toast.error('User ID is required');
        return;
      }
      
      if (!voucherCode?.trim()) {
        toast.error('Voucher code is required');
        return;
      }
      
      if (!bookingAmount || bookingAmount <= 0) {
        toast.error('Valid booking amount is required');
        return;
      }
      
      console.log('Applying voucher:', {
        userId,
        voucherCode,
        bookingAmount
      });
      
      const result = await voucherService.applyVoucher(userId, voucherCode, bookingAmount);
      
      console.log('Voucher application result:', result);
      
      if (result.success) {
        onVoucherApplied({
          code: voucherCode,
          discount: result.discount,
          discountType: result.discountType,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount
        });
        toast.success('Voucher applied successfully!');
      } else {
        console.error('Voucher application failed:', result.message);
        toast.error(result.message || 'Failed to apply voucher');
      }
    } catch (error) {
      console.error('Error applying voucher:', error);
      toast.error(formatVoucherError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    onVoucherRemoved();
    setManualVoucherCode('');
    setShowManualInput(false);
    toast.info('Voucher removed');
  };

  const handleManualVoucherSubmit = (e) => {
    e.preventDefault();
    const code = manualVoucherCode.trim();
    
    const validation = validateVoucherCode(code);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    handleApplyVoucher(code);
  };

  const calculateDiscount = (voucher) => {
    const template = voucher.voucherTemplate;
    if (!template) return 0;
    
    const discountAmount = (bookingAmount * template.discountPercentage) / 100;
    return Math.min(discountAmount, template.maxDiscount || discountAmount);
  };

  const getDiscountDisplay = (voucher) => {
    const template = voucher.voucherTemplate;
    if (!template) return '0% OFF';
    
    return `${template.discountPercentage}% OFF`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (fetchingVouchers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Apply Voucher</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <RefreshCw className="animate-spin h-6 w-6 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5" />
          <span>Apply Voucher</span>
        </CardTitle>
        <CardDescription>
          Save money on your booking with available vouchers
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedVoucher ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Voucher Applied</p>
                  <p className="text-sm text-green-600">{selectedVoucher.code}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-800">
                  -{formatCurrency(selectedVoucher.discountAmount)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVoucher}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Available Vouchers */}
            {availableVouchers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Available Vouchers</h4>
                <div className="space-y-2">
                  {availableVouchers.map((voucher) => {
                    const template = voucher.voucherTemplate;
                    const discountAmount = calculateDiscount(voucher);
                    const isApplicable = bookingAmount >= (template?.minSpend || 0);
                    
                    return (
                      <div
                        key={voucher.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isApplicable ? 'border-gray-200 hover:border-blue-300' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-medium text-gray-900">{template?.name || 'Voucher'}</h5>
                              <Badge variant="outline" className="text-xs">
                                {getDiscountDisplay(voucher)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{template?.description || 'Save money on your booking'}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Code: {voucher.code}</span>
                              <span>Min: {formatCurrency(template?.minSpend || 0)}</span>
                              <span>Expires: {formatDate(voucher.expiresAt)}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-green-600 mb-2">
                              Save {formatCurrency(discountAmount)}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleApplyVoucher(voucher.code)}
                              disabled={loading || disabled || !isApplicable}
                            >
                              {loading ? (
                                <RefreshCw className="animate-spin h-4 w-4" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          </div>
                        </div>
                        {!isApplicable && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Minimum purchase {formatCurrency(template?.minSpend || 0)} required</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Voucher Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Have a voucher code?</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                  disabled={disabled}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Enter Code
                </Button>
              </div>
              
              {showManualInput && (
                <form onSubmit={handleManualVoucherSubmit} className="space-y-2">
                  <div>
                    <Label htmlFor="manualVoucherCode">Voucher Code</Label>
                    <Input
                      id="manualVoucherCode"
                      type="text"
                      placeholder="Enter voucher code"
                      value={manualVoucherCode}
                      onChange={(e) => setManualVoucherCode(e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={loading || disabled || !manualVoucherCode.trim()}
                    >
                      {loading ? (
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <Ticket className="h-4 w-4 mr-2" />
                      )}
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowManualInput(false);
                        setManualVoucherCode('');
                      }}
                      disabled={disabled}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* No Vouchers Available */}
            {availableVouchers.length === 0 && !showManualInput && (
              <div className="text-center py-6">
                <Ticket className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No vouchers available for this booking</p>
                <p className="text-sm text-gray-400">
                  Check back later or try entering a voucher code manually
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoucherSelection;