/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Award, 
  FileText, 
  Settings, 
  HelpCircle, 
  Plus,
  Building2,
  Percent,
  Calendar,
  ClipboardList,
  UserPlus,
  Tags
} from 'lucide-react';
import { AppTab, CorporateEntity } from '../types';

interface SidebarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onNewRequest: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  entities?: CorporateEntity[];
  activeEntityId?: string;
  onChangeActiveEntity?: (id: string) => void;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  onNewRequest,
  isMobileOpen,
  onMobileClose,
  entities = [],
  activeEntityId = '',
  onChangeActiveEntity
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as AppTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entities' as AppTab, label: 'Company Settings', icon: Building2 },
    { id: 'payroll' as AppTab, label: 'Payroll Management', icon: CreditCard },
    { id: 'performance' as AppTab, label: 'Appraisal Management', icon: Award },
    { id: 'directory' as AppTab, label: 'Employee Management', icon: Users },
    { id: 'department-role' as AppTab, label: 'Department & Role', icon: Tags },
    { id: 'tax-settings' as AppTab, label: 'Tax Settings & Forms', icon: Percent },
    { id: 'leave-management' as AppTab, label: 'Leave Management', icon: Calendar },
    { id: 'forms-directory' as AppTab, label: 'Forms Directory', icon: ClipboardList },
    { id: 'hire-onboarding' as AppTab, label: 'Hire & Onboarding', icon: UserPlus },
    { id: 'reports' as AppTab, label: 'Report', icon: FileText },
  ];

  const bottomItems = [
    { id: 'settings' as AppTab, label: 'Settings', icon: Settings },
    { id: 'help' as AppTab, label: 'Help & Support', icon: HelpCircle },
  ];

  const activeEntity = entities.find(e => e.id === activeEntityId) || entities[0];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary text-[#f7f0e0] py-6">
      {/* Brand Header with Corporate Selector */}
      <div className="px-5 mb-6 flex flex-col gap-2 bg-white/5 p-3 rounded-lg mx-3 border border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/10 relative">
            {activeEntity?.logoUrl && !activeEntity.logoUrl.includes('placeholder') && !activeEntity.logoUrl.includes('example.com') ? (
              <>
                <img 
                  src={getDirectLogoUrl(activeEntity.logoUrl)} 
                  alt={activeEntity.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs uppercase">
                  {activeEntity.name.substring(0, 2)}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs uppercase">
                {activeEntity?.name ? activeEntity.name.substring(0, 2) : 'HR'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm tracking-tight leading-tight text-[#f7f0e0] truncate">
              {activeEntity?.name || 'Mega HR'}
            </h1>
            <p className="text-[10px] text-[#f7f0e0]/60 mt-0.5 font-mono uppercase tracking-wider font-semibold">
              {activeEntity?.id || 'GLOBAL ADMIN'}
            </p>
          </div>
        </div>

        {entities && entities.length > 0 && (
          <div className="mt-1">
            <label className="block text-[9px] font-bold text-[#f7f0e0]/50 uppercase tracking-wider mb-1">
              Switch Corporate View
            </label>
            <select
              value={activeEntityId}
              onChange={(e) => onChangeActiveEntity?.(e.target.value)}
              className="w-full bg-white/10 hover:bg-white/15 text-[#f7f0e0] border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-white/40 font-medium transition-all cursor-pointer"
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.id} className="text-zinc-850 bg-[#1c4e89] py-1 text-xs">
                  {ent.name} ({ent.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="px-4 mb-6">
        <button 
          onClick={onNewRequest}
          className="w-full bg-[#f7f0e0] text-primary font-medium text-sm py-2 px-4 rounded shadow-sm hover:bg-[#f7f0e0]/90 transition-colors flex items-center justify-center gap-2"
          id="btn-sidebar-new-request"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onMobileClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-white/10 text-[#f7f0e0] border-l-4 border-[#f7f0e0]' 
                  : 'text-[#f7f0e0]/75 hover:bg-white/5 hover:text-[#f7f0e0]'
              }`}
              id={`nav-item-${item.id}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#f7f0e0]' : 'text-[#f7f0e0]/75'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer System Nav */}
      <div className="px-2 pt-4 border-t border-white/10">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onMobileClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-white/10 text-[#f7f0e0] border-l-4 border-[#f7f0e0]' 
                  : 'text-[#f7f0e0]/70 hover:bg-white/5 hover:text-[#f7f0e0]'
              }`}
              id={`nav-item-${item.id}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, fixed left side) */}
      <aside className="hidden md:block w-[240px] shrink-0 border-r border-outline-variant/20 h-screen sticky top-0 bg-primary select-none z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-[240px] z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>
    </>
  );
}
