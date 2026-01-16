'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, MapPin, Clock, Briefcase } from 'lucide-react';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { TRADE_CATEGORIES } from '@/lib/trades';

export default function SubcontractorsPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  return (
    <TradeGate>
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PageHeader
              backLink={{ href: '/dashboard' }}
              title="Find Subcontractors"
              description="Browse and connect with verified subcontractors in your area"
            />

            <div className="mt-8">
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="text"
                          placeholder="Search by name or location..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select>
                      <SelectTrigger className="md:w-48">
                        <SelectValue placeholder="All Trades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Trades</SelectItem>
                        {TRADE_CATEGORIES.map(trade => (
                          <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="md:w-48">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="5km">Within 5km</SelectItem>
                        <SelectItem value="10km">Within 10km</SelectItem>
                        <SelectItem value="25km">Within 25km</SelectItem>
                        <SelectItem value="50km">Within 50km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="saved">
                    <Star className="w-4 h-4 mr-2" />
                    Saved
                  </TabsTrigger>
                  <TabsTrigger value="recent">
                    <Clock className="w-4 h-4 mr-2" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="worked">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Worked With
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Subcontractor Directory Coming Soon
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Browse, save, and connect with verified subcontractors across all trades.
                      </p>
                      <div className="max-w-md mx-auto space-y-3 text-left">
                        <div className="flex items-start gap-3">
                          <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Save Favorites</p>
                            <p className="text-sm text-gray-600">Keep a list of your go-to contractors</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Search by Location</p>
                            <p className="text-sm text-gray-600">Find contractors working in your area</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Work History</p>
                            <p className="text-sm text-gray-600">See who you have worked with before</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="saved">
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No saved subcontractors yet</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recent">
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No recently viewed subcontractors</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="worked">
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No work history yet</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
