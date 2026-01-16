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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { PremiumJobUpsellModal } from '@/components/premium-job-upsell-modal';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Info, Upload, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { hasValidABN, getABNGateUrl, getABNStatusMessage, hasABNButNotVerified } from '@/lib/abn-utils';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function CreateJobPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const store = getStore();

  const [formData, setFormData] = useState({
    title: '',
    tradeCategory: currentUser?.primaryTrade || '',
    location: '',
    postcode: '',
    startTime: '08:00',
    duration: '1',
    payType: 'fixed',
    rate: '',
    description: '',
  });
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [multipleDates, setMultipleDates] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser && !hasValidABN(currentUser)) {
      router.push(getABNGateUrl('/jobs/create'));
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'contractor') {
    return (
      <TradeGate>
        <AppLayout>
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">Only contractors can post jobs</p>
              <Link href="/jobs">
                <Button>Back to Jobs</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      </TradeGate>
    );
  }

  const abnStatusMessage = getABNStatusMessage(currentUser);
  const hasAbnPending = hasABNButNotVerified(currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let jobDates: Date[];
    let duration: number;

    if (multipleDates) {
      if (!dateFrom || !dateTo) {
        toast.error('Please select both start and end dates');
        return;
      }
      if (dateTo < dateFrom) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
      jobDates = [dateFrom];
      const diffTime = Math.abs(dateTo.getTime() - dateFrom.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else {
      if (!singleDate) {
        toast.error('Please select a date');
        return;
      }
      jobDates = [singleDate];
      duration = parseInt(formData.duration);
    }

    const attachments = files.map(file => URL.createObjectURL(file));

    const newJob = {
      id: `job-${Date.now()}`,
      contractorId: currentUser.id,
      title: formData.title,
      description: formData.description,
      tradeCategory: formData.tradeCategory,
      location: formData.location,
      postcode: formData.postcode,
      dates: jobDates,
      startTime: formData.startTime,
      duration,
      payType: formData.payType as 'fixed' | 'hourly',
      rate: parseFloat(formData.rate),
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'open' as const,
      createdAt: new Date(),
    };

    store.createJob(newJob);
    setCreatedJobId(newJob.id);
    setShowSuccessModal(true);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles);
      const totalSize = [...files, ...newFiles].reduce((sum, file) => sum + file.size, 0);
      const maxSize = 50 * 1024 * 1024;

      if (totalSize > maxSize) {
        toast.error('Total file size must be less than 50MB');
        return;
      }

      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const parseDateFromAU = (dateStr: string): Date | null => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2000) return null;

    const date = new Date(year, month, day);
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }

    return date;
  };

  return (
    <TradeGate>
      <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <PageHeader
          backLink={{ href: '/dashboard/contractor' }}
          title="Post a New Job"
        />

        {abnStatusMessage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 mb-1">ABN Verification Required</p>
                <p className="text-sm text-yellow-800">{abnStatusMessage}</p>
                {currentUser.abnStatus === 'REJECTED' && (
                  <Link href="/verify-business">
                    <Button size="sm" className="mt-3">
                      Update ABN Details
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Electrical Rewire - Kitchen & Living Room"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tradeCategory">Trade Category</Label>
              <Input
                id="tradeCategory"
                type="text"
                value={currentUser.primaryTrade}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-set from your primary trade.{' '}
                <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
                  Add extra trades
                </Link>
                {' '}<span className="text-gray-400">(Premium)</span>
              </p>
            </div>

            <SuburbAutocomplete
              value={formData.location}
              postcode={formData.postcode}
              onSuburbChange={(value) => handleChange('location', value)}
              onPostcodeChange={(value) => handleChange('postcode', value)}
              required
            />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Date</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="multipleDates" className="text-sm font-normal text-gray-600 cursor-pointer">
                    Multiple dates
                  </Label>
                  <Switch
                    id="multipleDates"
                    checked={multipleDates}
                    onCheckedChange={setMultipleDates}
                  />
                </div>
              </div>

              {!multipleDates ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full mt-1 justify-start text-left font-normal ${!singleDate && 'text-gray-500'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {singleDate ? formatDate(singleDate, 'dd/MM/yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={singleDate}
                          onSelect={setSingleDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      required
                      value={formData.duration}
                      onChange={(e) => handleChange('duration', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">Date from</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full mt-1 justify-start text-left font-normal ${!dateFrom && 'text-gray-500'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? formatDate(dateFrom, 'dd/MM/yyyy') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Date to</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full mt-1 justify-start text-left font-normal ${!dateTo && 'text-gray-500'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? formatDate(dateTo, 'dd/MM/yyyy') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          disabled={(date) => dateFrom ? date < dateFrom : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              {multipleDates && dateFrom && dateTo && (
                <p className="text-xs text-gray-500 mt-2">
                  Duration: {Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payType">Pay Type</Label>
                <Select
                  value={formData.payType}
                  onValueChange={(value) => handleChange('payType', value)}
                  required
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Asking price</SelectItem>
                    <SelectItem value="hourly">Offering hourly rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rate">
                  {formData.payType === 'hourly' ? 'Hourly Rate ($)' : 'Asking Price ($)'}
                </Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  placeholder={formData.payType === 'hourly' ? 'e.g. $60' : 'e.g. 2400'}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide details about the job, requirements, and any special instructions..."
                rows={6}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="files">Upload plans, photos, or specs (optional)</Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="files"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Images, PDFs, or documents. Max 50MB total.
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={hasAbnPending}>
                Post Job
              </Button>
              <Link href="/jobs" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
            {hasAbnPending && (
              <p className="text-xs text-gray-500 text-center">
                You can post jobs once your ABN has been verified
              </p>
            )}
          </form>
        </div>
      </div>
    </AppLayout>
    <PremiumJobUpsellModal
      open={showSuccessModal}
      onOpenChange={setShowSuccessModal}
      jobId={createdJobId}
    />
    </TradeGate>
  );
}
