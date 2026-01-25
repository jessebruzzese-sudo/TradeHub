'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { TRADE_CATEGORIES } from '@/lib/trades';

export interface TenderFilters {
  availableFrom: string;
  availableTo: string;
  distance: number;
  minBudget: string;
  maxBudget: string;
  includeNoBudget: boolean;
  selectedTrades: string[];
}

interface TenderRefineFiltersProps {
  currentUser: any;
  onFiltersChange: (filters: TenderFilters) => void;
  isMobile?: boolean;
}

const DISTANCE_OPTIONS = [5, 10, 15, 25, 50, 100];
const DEFAULT_DISTANCE = 15;

export function TenderRefineFilters({ currentUser, onFiltersChange, isMobile = false }: TenderRefineFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(!isMobile);

  const [filters, setFilters] = useState<TenderFilters>({
    availableFrom: searchParams.get('availableFrom') || '',
    availableTo: searchParams.get('availableTo') || '',
    distance: parseInt(searchParams.get('distance') || String(DEFAULT_DISTANCE)),
    minBudget: searchParams.get('minBudget') || '',
    maxBudget: searchParams.get('maxBudget') || '',
    includeNoBudget: searchParams.get('includeNoBudget') !== 'false',
    selectedTrades: searchParams.get('trades')?.split(',').filter(Boolean) || [],
  });

  const showTradeFilter = currentUser?.multi_trade_unlocked === true || currentUser?.role === 'admin';

  const allTrades = TRADE_CATEGORIES;

  useEffect(() => {
    onFiltersChange(filters);
    updateURL();
  }, [filters]);

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.availableFrom) params.set('availableFrom', filters.availableFrom);
    if (filters.availableTo) params.set('availableTo', filters.availableTo);
    if (filters.distance !== DEFAULT_DISTANCE) params.set('distance', String(filters.distance));
    if (filters.minBudget) params.set('minBudget', filters.minBudget);
    if (filters.maxBudget) params.set('maxBudget', filters.maxBudget);
    if (!filters.includeNoBudget) params.set('includeNoBudget', 'false');
    if (filters.selectedTrades.length > 0) params.set('trades', filters.selectedTrades.join(','));

    const newUrl = params.toString() ? `?${params.toString()}` : '/tenders';
    router.replace(newUrl, { scroll: false });
  };

  const handleClearFilters = () => {
    const clearedFilters: TenderFilters = {
      availableFrom: '',
      availableTo: '',
      distance: DEFAULT_DISTANCE,
      minBudget: '',
      maxBudget: '',
      includeNoBudget: true,
      selectedTrades: [],
    };
    setFilters(clearedFilters);
    router.replace('/tenders', { scroll: false });
  };

  const hasActiveFilters =
    filters.availableFrom ||
    filters.availableTo ||
    filters.distance !== DEFAULT_DISTANCE ||
    filters.minBudget ||
    filters.maxBudget ||
    !filters.includeNoBudget ||
    filters.selectedTrades.length > 0;

  const formatDateInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const handleDateChange = (field: 'availableFrom' | 'availableTo', value: string) => {
    const formatted = formatDateInput(value);
    setFilters(prev => ({ ...prev, [field]: formatted }));
  };

  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    const numbers = value.replace(/\D/g, '');
    setFilters(prev => ({ ...prev, [field]: numbers }));
  };

  const handleTradeToggle = (trade: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTrades: prev.selectedTrades.includes(trade)
        ? prev.selectedTrades.filter(t => t !== trade)
        : [...prev.selectedTrades, trade]
    }));
  };

  const content = (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-3 block">Availability (Date Range)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="availableFrom" className="text-xs text-gray-600 mb-1 block">
              Available from
            </Label>
            <Input
              id="availableFrom"
              placeholder="dd/mm/yyyy"
              value={filters.availableFrom}
              onChange={(e) => handleDateChange('availableFrom', e.target.value)}
              maxLength={10}
            />
          </div>
          <div>
            <Label htmlFor="availableTo" className="text-xs text-gray-600 mb-1 block">
              Available to
            </Label>
            <Input
              id="availableTo"
              placeholder="dd/mm/yyyy"
              value={filters.availableTo}
              onChange={(e) => handleDateChange('availableTo', e.target.value)}
              maxLength={10}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="distance" className="text-sm font-medium mb-3 block">
          Distance (radius)
        </Label>
        <Select
          value={String(filters.distance)}
          onValueChange={(value) => setFilters(prev => ({ ...prev, distance: parseInt(value) }))}
        >
          <SelectTrigger id="distance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISTANCE_OPTIONS.map(dist => (
              <SelectItem key={dist} value={String(dist)}>
                {dist} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Budget (Price Range)</Label>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <Label htmlFor="minBudget" className="text-xs text-gray-600 mb-1 block">
              Min
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
              <Input
                id="minBudget"
                placeholder="0"
                value={filters.minBudget}
                onChange={(e) => handleBudgetChange('minBudget', e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="maxBudget" className="text-xs text-gray-600 mb-1 block">
              Max
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
              <Input
                id="maxBudget"
                placeholder="0"
                value={filters.maxBudget}
                onChange={(e) => handleBudgetChange('maxBudget', e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeNoBudget"
            checked={filters.includeNoBudget}
            onCheckedChange={(checked) =>
              setFilters(prev => ({ ...prev, includeNoBudget: checked as boolean }))
            }
          />
          <Label
            htmlFor="includeNoBudget"
            className="text-sm font-normal cursor-pointer"
          >
            Include tenders with no budget
          </Label>
        </div>
      </div>

      {showTradeFilter && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Trades</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {allTrades.map(trade => (
              <div key={trade} className="flex items-center space-x-2">
                <Checkbox
                  id={`trade-${trade}`}
                  checked={filters.selectedTrades.includes(trade)}
                  onCheckedChange={() => handleTradeToggle(trade)}
                />
                <Label
                  htmlFor={`trade-${trade}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {trade}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleClearFilters}
        >
          <X className="w-4 h-4 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Refine Search</CardTitle>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              {hasActiveFilters && !isOpen && (
                <p className="text-xs text-blue-600 mt-1">Active filters applied</p>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>{content}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refine Search</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
