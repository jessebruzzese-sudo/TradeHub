'use client';

import React from 'react';
import { Check } from 'lucide-react';

export function TenderWizardStep({
  number,
  title,
  subtitle,
  icon: Icon,
  enabled,
  open,
  completed,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  open: boolean;
  completed?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const cardClass =
    `relative overflow-hidden rounded-2xl bg-white transition-all duration-300 transform ` +
    (open
      ? 'shadow-2xl -translate-y-1 border border-blue-500/40 ring-4 ring-blue-500/10'
      : 'shadow-md border border-black/10');

  return (
    <div className={cardClass}>
      <button
        type="button"
        onClick={() => enabled && onToggle()}
        className={`flex items-center justify-between px-5 py-4 border-b border-black/10 bg-white w-full text-left ${
          enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
        }`}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className={
                enabled
                  ? 'flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600'
                  : 'flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-500'
              }
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <span
                className={
                  enabled
                    ? 'px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700'
                    : 'px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500'
                }
              >
                Step {number}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
                {title}
              </h3>
            </div>
          </div>

          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {completed && (
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 border border-emerald-200">
              <Check className="h-4 w-4 text-emerald-700" />
            </div>
          )}
          {!enabled && <span className="text-xs text-slate-400">Locked</span>}
          <div className="text-slate-400">{open ? '▾' : '▸'}</div>
        </div>
      </button>

      {open && enabled ? <div className="px-5 py-5">{children}</div> : null}
    </div>
  );
}
