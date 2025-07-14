import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Crown,
  Star,
  Gift,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  CreditCard,
  Users,
  Plane,
  History,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import loyaltyService from '../../services/loyaltyService';
import voucherService from '../../services/voucherService';
import { getMembershipTierInfo, formatLoyaltyDate, formatLoyaltyPoints, formatCurrency } from '../../utils/loyaltyValidation';
import styles from './Membership.module.css';

const Membership = () => {
  const { user } = useAuth();
  const [membership, setMembership] = useState(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [userVouchers, setUserVouchers] = useState([]);
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      fetchMembershipData();
    }
  }, [user]);

  const fetchMembershipData = async () => {
    try {
      setLoading(true);
      
      // Try to get membership first, create if doesn't exist
      let membershipData = await loyaltyService.getMembership(user.id).catch(async (error) => {
        if (error.response?.status === 400) {
          // Membership doesn't exist, create one
          try {
            const newMembership = await loyaltyService.createMembership(user.id, {
              tier: 'SILVER',
              points: 0,
              joinDate: new Date().toISOString()
            });
            return newMembership;
          } catch (createError) {
            console.error('Error creating membership:', createError);
            return null;
          }
        }
        return null;
      });

      // Get additional data in parallel
      const [
        templatesData,
        vouchersData
      ] = await Promise.all([
        loyaltyService.getVoucherTemplates().catch(() => []),
        loyaltyService.getUserVouchers(user.id).catch(() => [])
      ]);

      // Debug: Log the membership data structure
      console.log('Membership API Response:', membershipData);

      // Extract data directly from membership response
      if (membershipData?.data) {
        const data = membershipData.data;
        console.log('Using data from membershipData.data:', data);
        setMembership(data);
        setPointsBalance(data.points || 0);
        setPointsHistory(data.transactions || []); // Use transactions from API
        
        // Process redemption history from transactions
        const redemptions = (data.transactions || [])
          .filter(t => t.type === 'REDEEM' || t.type === 'SPEND')
          .map(t => ({
            id: t.id,
            rewardName: t.note || 'Voucher Redemption',
            pointsUsed: Math.abs(t.points),
            date: t.createdAt || new Date().toISOString()
          }));
        setRedemptionHistory(redemptions);
      } else if (membershipData) {
        // Fallback for different response structure
        console.log('Using membershipData directly:', membershipData);
        setMembership(membershipData);
        setPointsBalance(membershipData.points || 0);
        setPointsHistory(membershipData.transactions || []);
        
        const redemptions = (membershipData.transactions || [])
          .filter(t => t.type === 'REDEEM' || t.type === 'SPEND')
          .map(t => ({
            id: t.id,
            rewardName: t.note || 'Voucher Redemption',
            pointsUsed: Math.abs(t.points),
            date: t.createdAt || new Date().toISOString()
          }));
        setRedemptionHistory(redemptions);
      }

      setAvailableRewards(templatesData || []);
      setUserVouchers(vouchersData || []);
      
      // Debug: Log the vouchers data structure
      console.log('User Vouchers Data:', vouchersData);
    } catch (error) {
      console.error('Error fetching membership data:', error);
      toast.error('Failed to load membership information');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (templateId, pointsRequired) => {
    try {
      if (!pointsRequired || pointsRequired <= 0) {
        toast.error('Invalid voucher template - points required not set');
        return;
      }
      
      if (pointsBalance < pointsRequired) {
        toast.error('Insufficient points for this reward');
        return;
      }

      await loyaltyService.redeemVoucherTemplate(user.id, templateId);
      toast.success('Voucher redeemed successfully!');
      
      // Add a small delay to ensure backend processing is complete
      setTimeout(() => {
        fetchMembershipData();
      }, 1000);
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      toast.error('Failed to redeem voucher');
    }
  };

  const formatDate = (dateString) => {
    return formatLoyaltyDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const tierInfo = membership ? getMembershipTierInfo(membership.tier) : getMembershipTierInfo('SILVER');
  const TierIcon = tierInfo.name === 'Bronze' ? Award : tierInfo.name === 'Silver' ? Star : Crown;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loyalty Program</h1>
          <p className="text-gray-600">Manage your membership and rewards</p>
        </div>

        {/* Membership Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${tierInfo.bgColor} text-white`}>
                  <TierIcon className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{tierInfo.name} Member</CardTitle>
                  <CardDescription>
                    {membership ? `Member since ${formatDate(membership.createdAt || membership.joinDate)}` : 'Join our loyalty program'}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{formatLoyaltyPoints(pointsBalance)}</div>
                <div className="text-sm text-gray-500">Points Available</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Points Earned</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{membership?.totalEarnedPoints || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{Array.isArray(pointsHistory) ? pointsHistory.filter(item => item.type === 'EARN').slice(0, 5).reduce((sum, item) => sum + (item.points || 0), 0) : 0} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flights Taken</CardTitle>
                  <Plane className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{membership?.flightsTaken || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Lifetime flights
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Vouchers</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Array.isArray(userVouchers) ? userVouchers.filter(v => v.status === 'ACTIVE' || !v.isUsed).length : 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready to use
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(pointsHistory) && pointsHistory.slice(0, 5).map((activity, index) => (
                    <div key={activity.id || index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{activity.note || activity.source || 'Points transaction'}</p>
                          <p className="text-xs text-gray-500">{formatDate(activity.createdAt || activity.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${activity.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                          {activity.type === 'EARN' ? '+' : '-'}{Math.abs(activity.points || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(pointsHistory) || pointsHistory.length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(!Array.isArray(availableRewards) || availableRewards.length === 0) ? (
                <div className="col-span-full text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No voucher templates available</p>
                  <p className="text-sm text-gray-400">Check back later for new rewards</p>
                </div>
              ) : (
                Array.isArray(availableRewards) && availableRewards
                  .filter(template => template.pointsRequired && template.pointsRequired > 0)
                  .map((template) => (
                  <Card key={template.id} className="relative">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.title || template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{template.pointsRequired} points</span>
                        </div>
                        <Badge variant="default">
                          {template.discountPercentage ? `${template.discountPercentage}% OFF` : 
                           template.discountType === 'PERCENTAGE' ? `${template.discountValue}% OFF` : 
                           template.discountValue ? `${formatCurrency(template.discountValue)} OFF` : 'Discount Available'}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleRedeemReward(template.id, template.pointsRequired)}
                        disabled={pointsBalance < template.pointsRequired}
                        className="w-full"
                      >
                        {pointsBalance < template.pointsRequired ? 'Insufficient Points' : 'Redeem Voucher'}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="vouchers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!Array.isArray(userVouchers) || userVouchers.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No vouchers available</p>
                  <p className="text-sm text-gray-400">Redeem voucher templates to get vouchers</p>
                </div>
              ) : (
                userVouchers.map((voucher) => (
                <Card key={voucher.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">{voucher.title || voucher.name || voucher.voucherName || 'Redeemed Voucher'}</CardTitle>
                    <CardDescription>{voucher.description || voucher.voucherDescription || 'Discount voucher'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Discount</span>
                        <span className="font-medium">
                          {voucher.voucherTemplate?.discountPercentage ? `${voucher.voucherTemplate.discountPercentage}%` :
                           voucher.discountPercentage ? `${voucher.discountPercentage}%` :
                           voucher.discountType === 'PERCENTAGE' ? `${voucher.discountValue}%` : 
                           voucher.discountAmount ? formatCurrency(voucher.discountAmount) :
                           voucher.discountValue ? formatCurrency(voucher.discountValue) : 'Discount Available'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={(voucher.status === 'ACTIVE' || !voucher.isUsed) ? 'default' : 'secondary'}>
                          {voucher.status || (voucher.isUsed ? 'USED' : 'ACTIVE')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Expires</span>
                        <span className="text-sm">{formatDate(voucher.expiryDate || voucher.expiresAt || voucher.endDate)}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-500 mb-1">Voucher Code</div>
                        <div className="font-mono text-sm bg-gray-100 p-2 rounded">{voucher.code || voucher.voucherCode || 'N/A'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Points History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(pointsHistory) && pointsHistory.map((transaction, index) => (
                      <div key={transaction.id || index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <History className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{transaction.note || transaction.source || 'Points transaction'}</p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.createdAt || transaction.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-medium ${transaction.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'EARN' ? '+' : '-'}{Math.abs(transaction.points || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(pointsHistory) || pointsHistory.length === 0) && (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No points history</p>
                        <p className="text-sm text-gray-400">Start earning points by booking flights</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Redemption History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(redemptionHistory) && redemptionHistory.map((redemption, index) => (
                      <div key={redemption.id || index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Gift className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{redemption.rewardName}</p>
                            <p className="text-xs text-gray-500">{formatDate(redemption.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-red-600 font-medium">-{redemption.pointsUsed}</span>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(redemptionHistory) || redemptionHistory.length === 0) && (
                      <div className="text-center py-8">
                        <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No redemption history</p>
                        <p className="text-sm text-gray-400">Redeem rewards to see your history</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Membership;