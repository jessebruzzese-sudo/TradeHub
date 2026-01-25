'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuburbAutocomplete } from '@/components/suburb-autocomplete';
import { Upload, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format as formatDate } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function EditJobPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const store = getStore();
  const jobId = params.id as string;

  const job = store.getJobById(jobId);

  const [formData, setFormData] = useState({
    title: job?.title || '',
    tradeCategory: job?.tradeCategory || currentUser?.primaryTrade || '',
    location: job?.location || '',
    postcode: job?.postcode || '',
    startTime: job?.startTime || '08:00',
    duration: job?.duration?.toString() || '1',
    payType: job?.payType || 'fixed',
    rate: job?.rate?.toString() || '',
    description: job?.description || '',
  });
  const [singleDate, setSingleDate] = useState<Date | undefined>(job?.dates?.[0] || undefined);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [multipleDates, setMultipleDates] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!job) {
      router.push('/jobs');
      return;
    }
    if (job.contractorId !== currentUser?.id) {
      router.push(`/jobs/${jobId}`);
      return;
    }
  }, [job, currentUser, jobId, router]);

  if (!currentUser || currentUser.role !== 'contractor' || !job || job.contractorId !== currentUser.id) {
    return null;
  }

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

    store.updateJob(jobId, {
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
    });

    toast.success('Job updated successfully');
    router.push(`/jobs/${jobId}`);
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

  return (
    <TradeGate>
      <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <PageHeader
          backLink={{ href: `/jobs/${jobId}` }}
          title="Edit Job"
        />

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

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
              <Link href={`/jobs/${jobId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
    </TradeGate>
  );
}
