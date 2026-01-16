'use client';

import { AppLayout } from '@/components/app-nav';
import { Bell, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';

export default function NotificationsPage() {
  const mockNotifications = [
    {
      id: '1',
      title: 'New application received',
      description: 'Sam Clarke applied for Electrical Rewire - Kitchen & Living Room',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: '2',
      title: 'Job accepted',
      description: 'Jordan Smith accepted your job offer for Bathroom Plumbing Installation',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '3',
      title: 'Job completed',
      description: 'Solar Panel Installation has been marked as completed',
      time: '1 day ago',
      read: true,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <Button variant="ghost" size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        </div>

        <div className="space-y-2">
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow ${
                !notification.read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                  <p className="text-xs text-gray-500">{notification.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {mockNotifications.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="You'll be notified about applications, messages, and job updates here."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
