'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  Shield, 
  PlusCircle, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  Database,
  Terminal
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_id: string;
  details: any;
  created_at: string;
}

interface AuditLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogsDrawer({ isOpen, onClose }: AuditLogsDrawerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${BACKEND_URL}/audit/admin/logs`);
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ACCESS_CODE_GENERATE': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'ACCESS_CODE_VERIFY': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'ACCESS_CODE_REDEEM': return <Shield className="w-4 h-4 text-cyan-500" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatAction = (action: string) => {
    return action.replace('ACCESS_CODE_', '').replace('_', ' ');
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return then.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl z-[60] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                   <Terminal className="w-4 h-4 text-cyan-500" />
                   <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Full Protocol Logs</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">High-Integrity Node Audit Trail</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              >
                <X className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <Activity className="w-8 h-8 text-cyan-500/20 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] animate-pulse">Synchronizing Logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                  <Database className="w-8 h-8 text-slate-700" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">No records found</p>
                </div>
              ) : (
                <div className="space-y-6 relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-800" />

                  {logs.map((log, index) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-10 group"
                    >
                      {/* Timeline Node */}
                      <div className="absolute left-0 top-1 p-1 bg-slate-900 border border-slate-800 rounded-full z-10 group-hover:border-white/20 transition-colors">
                        {getActionIcon(log.action)}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-white/90 uppercase tracking-widest flex items-center gap-2">
                            {formatAction(log.action)}
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className="text-cyan-500 font-mono tracking-normal">{log.target_id}</span>
                          </span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter tabular-nums flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5" /> {getTimeAgo(log.created_at)}
                          </span>
                        </div>
                        
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/10 p-1.5 rounded">
                               <Shield className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">Actor Identity</span>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">{log.actor_id}</span>
                            </div>
                          </div>

                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key} className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.1em]">{key}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-slate-950/20">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Audit Status</span>
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring Active
                 </span>
              </div>
              <button 
                onClick={fetchLogs}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[10px] font-black text-white hover:text-cyan-400 uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 group"
              >
                <Activity className="w-3 h-3 group-hover:animate-spin" /> Synchronize Matrix Hub
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
