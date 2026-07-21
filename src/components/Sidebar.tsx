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
import { getDirectLogoUrl } from '../data';

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
  const coreItems = [
    { id: 'dashboard' as AppTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'directory' as AppTab, label: 'Employee Directory', icon: Users },
    { id: 'payroll' as AppTab, label: 'Payroll Center', icon: CreditCard },
    { id: 'leave-management' as AppTab, label: 'Leave Management', icon: Calendar },
    { id: 'performance' as AppTab, label: 'Performance Appraisal', icon: Award },
    { id: 'hire-onboarding' as AppTab, label: 'Hire & Onboarding', icon: UserPlus },
  ];

  const complianceItems = [
    { id: 'department-role' as AppTab, label: 'Department & Roles', icon: Tags },
    { id: 'tax-settings' as AppTab, label: 'Tax Compliance (LHDN)', icon: Percent },
    { id: 'forms-directory' as AppTab, label: 'Forms Directory', icon: ClipboardList },
    { id: 'reports' as AppTab, label: 'Reports & Borang', icon: FileText },
  ];

  const bottomItems = [
    { id: 'settings' as AppTab, label: 'System Settings', icon: Settings },
    { id: 'help' as AppTab, label: 'Help & Documentation', icon: HelpCircle },
  ];

  const activeEntity = entities.find(e => e.id === activeEntityId) || entities[0];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-primary text-[#f7f0e0] py-6" style={{ viewTransitionName: 'sidebar-container' } as any}>
      {/* Brand Header with Corporate Selector */}
      <div className="px-5 mb-6 flex flex-col items-center gap-3 bg-white/5 p-4 rounded-lg mx-3 border border-white/10" style={{ viewTransitionName: 'sidebar-brand' } as any}>
        {/* Company Logo */}
        <div className="w-36 h-12 rounded bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/10 relative" style={{ viewTransitionName: 'corporate-logo' } as any}>
          {activeEntity?.logoUrl && !activeEntity.logoUrl.includes('placeholder') && !activeEntity.logoUrl.includes('example.com') ? (
            <>
              <img 
                 src={getDirectLogoUrl(activeEntity.logoUrl)} 
                alt={activeEntity.name} 
                className="w-full h-full object-contain p-1.5" 
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

      <nav className="flex-1 px-2 space-y-4 overflow-y-auto style-scrollbar">
        {/* Core Operations Section */}
        <div>
          <div className="px-4 py-1 text-[9px] font-bold text-[#f7f0e0]/40 uppercase tracking-widest mb-1">
            Core Operations
          </div>
          <div className="space-y-0.5">
            {coreItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onMobileClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded text-[11px] font-semibold transition-all duration-150 ${
                    isActive 
                      ? 'bg-white/10 text-[#f7f0e0] border-l-4 border-[#f7f0e0]' 
                      : 'text-[#f7f0e0]/75 hover:bg-white/5 hover:text-[#f7f0e0]'
                  }`}
                  id={`nav-item-${item.id}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7f0e0]' : 'text-[#f7f0e0]/75'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Setup & Compliance Section */}
        <div>
          <div className="px-4 py-1 text-[9px] font-bold text-[#f7f0e0]/40 uppercase tracking-widest mb-1">
            Setup & Compliance
          </div>
          <div className="space-y-0.5">
            {complianceItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onMobileClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded text-[11px] font-semibold transition-all duration-150 ${
                    isActive 
                      ? 'bg-white/10 text-[#f7f0e0] border-l-4 border-[#f7f0e0]' 
                      : 'text-[#f7f0e0]/75 hover:bg-white/5 hover:text-[#f7f0e0]'
                  }`}
                  id={`nav-item-${item.id}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7f0e0]' : 'text-[#f7f0e0]/75'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
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
