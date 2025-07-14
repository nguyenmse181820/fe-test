import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Gift,
  Ticket,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-toastify';
import voucherService from '../../services/voucherService';
import loyaltyService from '../../services/loyaltyService';
import { formatCurrency } from '../../utils/loyaltyValidation';
import styles from './RedeemVoucher.module.css';

const RedeemVoucher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [voucherTemplates, setVoucherTemplates] = useState([]);
  const [userVouchers, setUserVouchers] = useState([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [showVoucherCode, setShowVoucherCode] = useState({});
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setFetchingData(true);
      const [availableVouchersData, templatesData, userVouchersData, pointsData] = await Promise.all([
        voucherService.getAvailableVouchers(user.id).catch(() => []),
        voucherService.getVoucherTemplates().catch(() => []),
        voucherService.getUserVouchers(user.id).catch(() => []),
        loyaltyService.getPointsBalance(user.id).catch(() => ({ balance: 0 }))
      ]);

      setAvailableVouchers(availableVouchersData || []);
      setVoucherTemplates(templatesData || []);
      setUserVouchers(userVouchersData || []);
      setPointsBalance(pointsData.balance || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load voucher information');
    } finally {
      setFetchingData(false);
    }
  };

  const handleRedeemVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }

    try {
      setLoading(true);
      await voucherService.useVoucherByCode(voucherCode.trim());
      toast.success('Voucher redeemed successfully!');
      setVoucherCode('');
      fetchData();
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      toast.error(error.response?.data?.message || 'Failed to redeem voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemFromPoints = async (templateId, pointsRequired) => {
    try {
      if (!pointsRequired || pointsRequired <= 0) {
        toast.error('Invalid voucher template - points required not set');
        return;
      }
      
      if (pointsBalance < pointsRequired) {
        toast.error('Insufficient points for this voucher');
        return;
      }

      setLoading(true);
      await loyaltyService.redeemVoucherTemplate(user.id, templateId);
      toast.success('Voucher redeemed with points successfully!');
      fetchData();
    } catch (error) {
      console.error('Error redeeming voucher with points:', error);
      toast.error('Failed to redeem voucher with points');
    } finally {
      setLoading(false);
    }
  };

  const copyVoucherCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Voucher code copied to clipboard');
  };

  const toggleVoucherCodeVisibility = (voucherId) => {
    setShowVoucherCode(prev => ({
      ...prev,
      [voucherId]: !prev[voucherId]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVoucherStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'USED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiscountDisplay = (voucher) => {
    // Handle both old structure (discountType/discountValue) and new structure (discountPercentage)
    if (voucher.discountPercentage) {
      return `${voucher.discountPercentage}% OFF`;
    } else if (voucher.discountType === 'PERCENTAGE') {
      return `${voucher.discountValue}% OFF`;
    } else if (voucher.discountValue) {
      return `${formatCurrency(voucher.discountValue)} OFF`;
    } else {
      return 'Discount Available';
    }
  };

  if (fetchingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Redeem Vouchers</h1>
          <p className="text-gray-600">Redeem voucher codes or exchange points for vouchers</p>
        </div>

        {/* Points Balance */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Points Balance</CardTitle>
                <CardDescription>Use points to redeem vouchers</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{pointsBalance.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Available Points</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Manual Voucher Redemption */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ticket className="h-5 w-5" />
              <span>Redeem Voucher Code</span>
            </CardTitle>
            <CardDescription>
              Enter a voucher code to redeem your voucher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeemVoucher} className="space-y-4">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="voucherCode">Voucher Code</Label>
                  <Input
                    id="voucherCode"
                    type="text"
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || !voucherCode.trim()}>
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Redeem Voucher
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Available Vouchers to Redeem with Points */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5" />
              <span>Redeem with Points</span>
            </CardTitle>
            <CardDescription>
              Exchange your loyalty points for vouchers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(voucherTemplates) && voucherTemplates
                .filter(template => template.pointsRequired && template.pointsRequired > 0)
                .map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name || template.title}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {getDiscountDisplay(template)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{template.pointsRequired} points</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRedeemFromPoints(template.id, template.pointsRequired)}
                      disabled={loading || pointsBalance < template.pointsRequired}
                    >
                      {pointsBalance < template.pointsRequired ? 'Insufficient Points' : 'Redeem'}
                    </Button>
                  </div>
                </div>
              ))}
              {(!Array.isArray(voucherTemplates) || voucherTemplates.filter(t => t.pointsRequired && t.pointsRequired > 0).length === 0) && (
                <div className="col-span-full text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No voucher templates available</p>
                  <p className="text-sm text-gray-400">Check back later for new rewards</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User's Vouchers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Your Vouchers</span>
            </CardTitle>
            <CardDescription>
              Manage your redeemed vouchers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!Array.isArray(userVouchers) || userVouchers.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No vouchers found</p>
                <p className="text-sm text-gray-400">Redeem voucher codes or exchange points to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(userVouchers) && userVouchers.map((voucher) => (
                  <div key={voucher.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{voucher.title}</h3>
                        <p className="text-sm text-gray-600">{voucher.description}</p>
                      </div>
                      <Badge className={getVoucherStatusColor(voucher.status)}>
                        {voucher.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Discount</span>
                        <div className="font-medium">{getDiscountDisplay(voucher)}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Expires</span>
                        <div className="font-medium">{formatDate(voucher.expiryDate)}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Min. Purchase</span>
                        <div className="font-medium">{formatCurrency(voucher.minimumPurchase || 0)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Code:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {showVoucherCode[voucher.id] ? voucher.code : '••••••••'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleVoucherCodeVisibility(voucher.id)}
                          >
                            {showVoucherCode[voucher.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyVoucherCode(voucher.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {voucher.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/booking?voucher=${voucher.code}`)}
                        >
                          Use Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RedeemVoucher;