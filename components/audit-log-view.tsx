import { AuditLog, User } from '@/lib/types';
import { getAuditActionLabel, getAuditActionColor } from '@/lib/admin-utils';
import { format } from 'date-fns';
import { Shield, Clock } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
  users: User[];
  title?: string;
  emptyMessage?: string;
}

export function AuditLogView({
  logs,
  users,
  title = 'Audit Log',
  emptyMessage = 'No audit entries',
}: AuditLogViewProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-600" />
          {title}
        </h3>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {logs.map((log) => {
          const admin = users.find((u) => u.id === log.adminId);
          const targetUser = log.targetUserId ? users.find((u) => u.id === log.targetUserId) : null;

          return (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getAuditActionColor(
                        log.actionType
                      )}`}
                    >
                      {getAuditActionLabel(log.actionType)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">{log.details}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      By <span className="font-medium text-gray-700">{admin?.name || 'Unknown Admin'}</span>
                    </span>
                    {targetUser && (
                      <span>
                        User: <span className="font-medium text-gray-700">{targetUser.name}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {format(log.createdAt, 'MMM dd, yyyy h:mm a')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
