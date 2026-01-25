'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface AllAccessUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllAccessUpgradeModal({ open, onOpenChange }: AllAccessUpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl">Do everything with All-Access Pro</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            All-Access Pro is designed for businesses that price projects, hire subcontractors, and also work on the tools. Everything stays in one account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Post tenders & receive quotes</p>
              <p className="text-sm text-gray-600">Price your projects with unlimited radius</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Hire subcontractors</p>
              <p className="text-sm text-gray-600">Post jobs and manage your team</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Work as a subcontractor</p>
              <p className="text-sm text-gray-600">Broadcast availability & expand your radius</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">All features in one account</p>
              <p className="text-sm text-gray-600">No need for multiple logins or accounts</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-900">$36/month</p>
          <p className="text-sm text-blue-700">Cancel anytime • No lock-in contracts</p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Not now
          </Button>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Upgrade to All-Access Pro
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
