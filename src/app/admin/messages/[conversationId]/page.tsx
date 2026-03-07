'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, User, FileWarning, Paperclip, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface ConversationData {
  id: string;
  contractorId: string;
  contractorName: string;
  subcontractorId: string;
  subcontractorName: string;
  jobId: string | null;
  createdAt: string;
}

interface ReportData {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  category: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface MessageAttachment {
  path?: string;
  bucket?: string;
  name?: string;
  type?: string;
}

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isSystemMessage: boolean;
  attachments: unknown[];
  createdAt: string;
}

interface TranscriptResponse {
  conversation: ConversationData;
  reports: ReportData[];
  messages: MessageData[];
}

function MessageAttachments({ attachments }: { attachments: unknown[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleView = async (att: MessageAttachment) => {
    if (!att.bucket || !att.path) return;
    const key = `${att.bucket}:${att.path}`;
    setLoadingId(key);
    try {
      const res = await fetch('/api/admin/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: att.bucket, path: att.path }),
      });
      const { url } = await res.json();
      if (url) window.open(url, '_blank');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      {attachments.map((a, i) => {
        const att = a as MessageAttachment;
        const name = att.name ?? att.path ?? `Attachment ${i + 1}`;
        const type = att.type ?? 'file';
        const hasStorage = att.bucket && att.path;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Paperclip className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">{name}</span>
            <span className="text-gray-400">({type})</span>
            {hasStorage && (
              <button
                type="button"
                onClick={() => handleView(att)}
                disabled={!!loadingId}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {loadingId === `${att.bucket}:${att.path}` ? 'Loading...' : (
                  <>
                    View <ExternalLink className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminConversationReviewPage() {
  const params = useParams();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;

  const [data, setData] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setError('No conversation ID');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/conversations/${conversationId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  if (!conversationId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <p className="text-gray-600">Invalid conversation</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="text-gray-500">Loading conversation...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <p className="text-red-600">{error ?? 'Conversation not found'}</p>
      </div>
    );
  }

  const { conversation, reports = [], messages } = data;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Link href="/admin/users">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </Link>

      {reports && reports.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="w-4 h-4 text-gray-600" />
              Reports Linked to This Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-200 rounded-lg p-3 text-sm space-y-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/users/${r.reporterId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {r.reporterName}
                    </Link>
                    <span className="text-gray-500">reported</span>
                    <Link
                      href={`/admin/users/${r.reportedId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {r.reportedName}
                    </Link>
                    <Badge variant="secondary" className="capitalize">
                      {r.category.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={r.status === 'open' ? 'destructive' : 'secondary'}>
                      {r.status}
                    </Badge>
                    <span className="text-gray-500">
                      {format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-gray-600 pl-0 mt-1">{r.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            Conversation Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Participants:</span>
              <Link
                href={`/admin/users/${conversation.contractorId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {conversation.contractorName}
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                href={`/admin/users/${conversation.subcontractorId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {conversation.subcontractorName}
              </Link>
            </div>
            {conversation.jobId && (
              <div>
                <span className="text-gray-600">Job:</span>{' '}
                <Link
                  href={`/admin/jobs/${conversation.jobId}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {conversation.jobId}
                </Link>
              </div>
            )}
            <div>
              <span className="text-gray-600">Started:</span>{' '}
              {format(new Date(conversation.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
          <p className="text-xs text-gray-500">Read-only. No reply or block controls.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages in this conversation.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`border rounded-lg p-4 ${
                    m.isSystemMessage ? 'bg-gray-50 border-gray-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                    <span className="font-medium text-gray-900">{m.senderName}</span>
                    <span className="text-gray-500">
                      {format(new Date(m.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                    {m.isSystemMessage && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{m.text}</p>
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <MessageAttachments attachments={m.attachments} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
