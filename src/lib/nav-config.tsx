/**
 * Shared navigation configuration for desktop sidebar and mobile drawer.
 * Single source of truth for structure, labels, icons, groupings, and ABN gating.
 */

import {
  LayoutDashboard,
  Users,
  Search,
  Briefcase,
  Calendar,
  Images,
  FileText,
  MessageSquare,
  Bell,
  User,
  Shield,
  CreditCard,
  CircleHelp as HelpCircle,
  Eye,
} from 'lucide-react';
import { MVP_FREE_MODE } from '@/lib/feature-flags';

export type NavIcon = React.ComponentType<{ className?: string }>;

export interface NavItemConfig {
  label: string;
  href: string;
  icon: NavIcon;
  /** Requires ABN verification; shows locked state when unverified */
  requiresABN?: boolean;
  /** External action (e.g. mailto) - use onClick instead of Link */
  isExternal?: boolean;
  /** Exclude from MVP free mode (e.g. Pricing) */
  hideInFreeMode?: boolean;
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

/** Support mailto for Help / Support */
export const SUPPORT_MAILTO = 'mailto:Support@tradehub.com.au?subject=TradeHub%20Support%20Request';

/** Main Actions: discovery, jobs */
export const MAIN_ACTIONS_SECTION: NavSectionConfig = {
  title: 'Main Actions',
  items: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Subcontractors', href: '/subcontractors', icon: Users },
    { label: 'Search Trades', href: '/search', icon: Search },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Completed Works', href: '/works', icon: Images },
    { label: 'List Availability', href: '/profile/availability', icon: Calendar },
  ],
};

/** Communication: messages, notifications */
export const COMMUNICATION_SECTION: NavSectionConfig = {
  title: 'Communication',
  items: [
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
};

/** Account & Settings */
export const ACCOUNT_SECTION: NavSectionConfig = {
  title: 'Account & Settings',
  items: [
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Verify Business', href: '/verify-business', icon: Shield },
    { label: 'Pricing', href: '/pricing', icon: CreditCard, hideInFreeMode: true },
  ],
};

/** Support & Legal */
export const SUPPORT_LEGAL_SECTION: NavSectionConfig = {
  title: 'Support & Legal',
  items: [
    { label: 'Help / Support', href: SUPPORT_MAILTO, icon: HelpCircle, isExternal: true },
    { label: 'Terms of Service', href: '/terms', icon: FileText },
    { label: 'Privacy Policy', href: '/privacy', icon: Eye },
  ],
};

/** All business nav sections in display order */
export const BUSINESS_NAV_SECTIONS: NavSectionConfig[] = [
  MAIN_ACTIONS_SECTION,
  COMMUNICATION_SECTION,
  ACCOUNT_SECTION,
  SUPPORT_LEGAL_SECTION,
];

/** Get account items with Pricing filtered by MVP_FREE_MODE */
export function getAccountItems(): NavItemConfig[] {
  return ACCOUNT_SECTION.items.filter(
    (item) => !item.hideInFreeMode || !MVP_FREE_MODE
  );
}

/** Get all main + communication items for bottom nav (Dashboard, Jobs, Messages, Notifications) */
export const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

/** Admin nav (flat list, no sections) */
export const ADMIN_NAV_ITEMS = [
  { label: 'Home', href: '/admin' },
  { label: 'Verifications', href: '/admin/verifications' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Reviews', href: '/admin/reviews' },
];
