import React, { useState } from 'react';
import { CarAsset, Driver } from '../../types';

interface DriverHistoryProps {
  assignedCar: CarAsset;
  activeDriver: Driver;
}

export default function DriverHistory({
  assignedCar,
  activeDriver
}: DriverHistoryProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  return (
    <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-logs-history-card">
      <div className="text-left border-b border-slate-100 pb-3" id="drv-hist-hdr">
        <h3 className="font-bold text-slate-800 text-sm">Historical Operator Records</h3>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Below is a log history of events committed by you or logged for this specific vehicle.</p>
      </div>

      <div className="space-y-6" id="drv-historical-subcollections">
        {/* Repairs logged list */}
        <div className="space-y-2 text-left" id="drv-hist-svc-section">
          <span className="text-[10px] uppercase font-bold text-indigo-655 tracking-wider font-sans">🛠️ Service/Repair Log</span>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-svc-list">
            {(assignedCar.serviceLogs || []).length > 0 ? (
              (assignedCar.serviceLogs || []).map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      isExpanded ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                    }`}
                    id={`drv-hist-svc-${log.id}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">{log.category}</strong>
                          <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{log.date}</span>
                        </div>
                        <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{log.description}</p>
                      </div>
                      <span className="text-indigo-650 font-sans font-bold text-xs shrink-0 ml-2">zmk {log.cost}</span>
                    </div>

                    {/* Expanded information drawer */}
                    {isExpanded && (
                      <div className="p-3 bg-white border border-indigo-100/80 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-indigo-50 pb-1.5 font-bold text-indigo-900">
                          <span> Maintenance Activity Report</span>
                          <span className="font-mono text-[8px] text-indigo-400">ID: SVC-{log.id.toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-550 font-normal">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Mileage Logged</span>
                            <span className="font-semibold text-slate-700">{log.mileage.toLocaleString()} km</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Registered Odometer</span>
                            <span className="font-semibold text-slate-755">{assignedCar.plateNumber}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Authorized Garage</span>
                            <span className="font-semibold text-slate-700">{log.performedBy || 'Fleet Auto Prep Team'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Labor Cost Charged</span>
                            <span className="font-mono font-semibold text-indigo-600">zmk {log.cost}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-50 pt-1.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">Work Description Details</span>
                            <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{log.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 italic font-normal">No maintenance work logged on this unit.</p>
            )}
          </div>
        </div>

        {/* Cashings tracked list */}
        <div className="space-y-2 text-left" id="drv-hist-rev-section">
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider font-sans">Cashing Receipts Ledger</span>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-rev-list">
            {(() => {
              const matchedLogs = (assignedCar.revenueLogs || []).filter(r => r.driverId === activeDriver.id);
              return matchedLogs.length > 0 ? (
                matchedLogs.map((rev) => {
                const isExpanded = expandedLogId === rev.id;
                return (
                  <div
                    key={rev.id}
                    onClick={() => setExpandedLogId(isExpanded ? null : rev.id)}
                    className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      isExpanded ? 'bg-emerald-50/35 border-emerald-300 ring-1 ring-emerald-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                    }`}
                    id={`drv-hist-rev-${rev.id}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <strong className="text-slate-800">{rev.category} Yield</strong>
                          <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{rev.date}</span>
                          {rev.status === 'Pending' ? (
                            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200 animate-pulse text-nowrap">Pending Approval</span>
                          ) : (
                            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-205 text-nowrap">Approved</span>
                          )}
                        </div>
                        <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{rev.description}</p>
                      </div>
                      <span className="text-emerald-600 font-bold font-sans text-xs shrink-0 ml-2 font-black">+zmk {rev.amount}</span>
                    </div>

                    {/* Expanded information drawer */}
                    {isExpanded && (
                      <div className="p-3 bg-white border border-emerald-100 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-emerald-50 pb-1.5 font-bold text-emerald-950">
                          <span className="flex items-center gap-1">📁 Cashing Submission Details</span>
                          <span className="font-mono text-[8px] text-emerald-555 uppercase">TRX-{rev.id.toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-555 font-normal">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Yield Stream Category</span>
                            <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">{rev.category}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Submission Timestamp</span>
                            <span className="font-semibold text-slate-755 font-mono">{rev.date}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Declared Yield</span>
                            <span className="font-mono font-bold text-emerald-650 font-black">+zmk {rev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Audit Status</span>
                            <div className="mt-0.5">
                              {rev.status === 'Pending' ? (
                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded-sm border border-amber-200">Awaiting Manager Sign-off</span>
                              ) : (
                                <span className="text-[9px] font-semibold text-emerald-750 bg-emerald-50 px-1 rounded-sm border border-emerald-150">Audited & Approved</span>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2 border-t border-slate-50 pt-1.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 font-sans">Original Narrative Notes</span>
                            <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{rev.description || 'No complementary narrative provided.'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 italic font-normal">No income cashings logged on this unit.</p>
            );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
