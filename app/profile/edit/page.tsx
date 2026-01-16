'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { ArrowLeft, Info, Lock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { hasSubcontractorPremium, hasBuilderPremium, hasContractorPremium } from '@/lib/capability-utils';

export default function EditProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const store = getStore();
  const router = useRouter();

  const [name, setName] = useState(currentUser?.name || '');
  const [businessName, setBusinessName] = useState(currentUser?.businessName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [primaryTrade, setPrimaryTrade] = useState(currentUser?.primaryTrade || '');
  const [trades, setTrades] = useState(currentUser?.trades?.join(', ') || '');
  const [searchLocation, setSearchLocation] = useState(currentUser?.searchLocation || '');
  const [searchPostcode, setSearchPostcode] = useState(currentUser?.searchPostcode || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!currentUser) {
    return null;
  }

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await updateUser({ avatar: newAvatarUrl });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!primaryTrade && currentUser.role !== 'admin') {
      toast.error('Please select your primary trade');
      return;
    }

    setIsSaving(true);

    try {
      const tradesArray = trades
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await updateUser({
        name,
        businessName: businessName || undefined,
        bio: bio || undefined,
        primaryTrade: primaryTrade || undefined,
        trades: tradesArray.length > 0 ? tradesArray : undefined,
        location: searchLocation || undefined,
        postcode: searchPostcode || undefined,
      });

      toast.success('Profile updated successfully');
      router.push('/profile');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardHref = currentUser.role === 'contractor' ? '/dashboard/contractor' : '/dashboard/subcontractor';

  return (
    <TradeGate>
      <AppLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <PageHeader
          backLink={{ href: dashboardHref }}
          title="Edit Profile"
          description="Update your personal information"
        />

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <Label>Profile Photo</Label>
              <div className="mt-2">
                <ProfileAvatar
                  userId={currentUser.id}
                currentAvatarUrl={currentUser.avatar ?? undefined}
                  userName={currentUser.name}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to upload a new photo (max 5MB)
              </p>
            </div>

            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {currentUser.role !== 'admin' && (
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="mt-1"
              />
            </div>

            {currentUser.role !== 'admin' && (
              <div>
                <Label htmlFor="primaryTrade">
                  Primary Trade {!currentUser.primaryTrade && <span className="text-red-500">*</span>}
                </Label>
                {currentUser.primaryTrade ? (
                  <>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="primaryTrade"
                        type="text"
                        value={currentUser.primaryTrade}
                        disabled
                        className="bg-gray-50 flex-1"
                      />
                      <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Locked after account creation.
                    </p>
                  </>
                ) : (
                  <>
                    <Select value={primaryTrade} onValueChange={setPrimaryTrade}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your primary trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map((trade) => (
                          <SelectItem key={trade} value={trade}>
                            {trade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-900">
                        This is your main trade on TradeHub. It determines the jobs and professionals you see.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentUser.role !== 'admin' && currentUser.primaryTrade && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Label className="text-lg font-semibold text-gray-900">Additional Trades (Premium Feature)</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Primary trade can't be changed after setup. Premium users can add additional trades.
                    </p>
                  </div>
                </div>

                {hasSubcontractorPremium(currentUser) || currentUser.additionalTradesUnlocked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="font-medium">Multi-trade profiles unlocked</span>
                    </div>
                    <div>
                      <Label htmlFor="additionalTrades">Select Additional Trades</Label>
                      <p className="text-xs text-gray-500 mt-1 mb-2">
                        Choose trades beyond your primary trade to receive more job opportunities
                      </p>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Add a trade" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRADE_CATEGORIES.filter(t => t !== currentUser.primaryTrade && !currentUser.additionalTrades?.includes(t)).map((trade) => (
                            <SelectItem key={trade} value={trade}>
                              {trade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentUser.additionalTrades && currentUser.additionalTrades.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {currentUser.additionalTrades.map((trade) => (
                            <Badge key={trade} variant="secondary" className="text-sm">
                              {trade}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-medium">Multi-trade profiles are a Premium feature.</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Get matched with more jobs by adding additional trades to your profile. Included with Premium.
                    </p>
                    <Link href="/pricing">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {currentUser.role === 'subcontractor' && (
              <div>
                <Label htmlFor="trades">Additional Trade Skills</Label>
                <Input
                  id="trades"
                  type="text"
                  value={trades}
                  onChange={(e) => setTrades(e.target.value)}
                  placeholder="e.g., Commercial Electrical, Residential Wiring"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: List specific skills or specializations (separate with commas)
                </p>
              </div>
            )}

            {currentUser.role !== 'admin' && (
              <div>
                <Label>Profile Verification</Label>
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {currentUser.trustStatus === 'verified' ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="font-medium">Your profile is verified</span>
                    </div>
                  ) : currentUser.trustStatus === 'pending' ? (
                    <div className="flex items-center gap-2 text-yellow-700">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                      <span className="font-medium">Verification in progress</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Get a verified badge to build trust with clients and stand out from the competition
                      </p>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Lock className="w-4 h-4" />
                        <span>Verification is available on paid plans</span>
                      </div>
                      <Link href="/pricing">
                        <Button type="button" variant="outline" size="sm" disabled>
                          Upgrade to Get Verified
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentUser.role !== 'admin' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      <Label className="text-lg font-semibold text-gray-900">Custom Search Location (Premium Feature)</Label>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Override your business location for job discovery and tender matching. Your business location remains unchanged.
                    </p>
                  </div>
                </div>

                {hasBuilderPremium(currentUser) || hasContractorPremium(currentUser) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="font-medium">Custom search location unlocked</span>
                    </div>
                    <div>
                      <Label htmlFor="searchLocation">Search From Location</Label>
                      <SuburbAutocomplete
                        value={searchLocation}
                        postcode={searchPostcode}
                        onSuburbChange={setSearchLocation}
                        onPostcodeChange={setSearchPostcode}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Your business location: {currentUser.location || 'Not set'}{currentUser.postcode ? `, ${currentUser.postcode}` : ''}
                      </p>
                      {searchLocation && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-xs text-blue-900">
                            <strong>Active:</strong> Jobs and tenders are now calculated from {searchLocation}, {searchPostcode}
                          </p>
                        </div>
                      )}
                      {searchLocation && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchLocation('');
                            setSearchPostcode('');
                          }}
                          className="mt-2"
                        >
                          Clear Custom Location
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Set a virtual search location to discover jobs and tenders in different areas while keeping your business location unchanged.
                    </p>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Available on Business Pro and All Access Pro plans</span>
                    </div>
                    <Link href="/pricing">
                      <Button type="button" variant="default" className="bg-purple-600 hover:bg-purple-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href="/profile">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
    </TradeGate>
  );
}
