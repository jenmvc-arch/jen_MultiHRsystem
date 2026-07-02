/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Hash, 
  Plus, 
  Edit3, 
  Users, 
  CheckCircle2, 
  XCircle,
  FileText,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { CorporateEntity, Employee } from '../types';
import { googleSheetsClient, isGoogleConfigured } from '../lib/googleSheetsClient';

interface EntitiesViewProps {
  entities: CorporateEntity[];
  employees: Employee[];
  onAddEntity: (entity: CorporateEntity) => void;
  onUpdateEntity: (id: string, updates: Partial<CorporateEntity>) => void;
  onShowNotification: (title: string, message: string) => void;
}

export default function EntitiesView({
  entities,
  employees,
  onAddEntity,
  onUpdateEntity,
  onShowNotification
}: EntitiesViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<CorporateEntity | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTaxRef, setFormTaxRef] = useState('');
  const [formEpfRef, setFormEpfRef] = useState('');
  const [formSocsoRef, setFormSocsoRef] = useState('');
  const [formCurrency, setFormCurrency] = useState('RM');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formTheme, setFormTheme] = useState<'theme1' | 'theme2' | 'theme3'>('theme1');

  // Active viewing state to list registered employees under a clicked subsidiary card
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>('ENT-01');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isGoogleConfigured) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormLogoUrl(reader.result as string);
        onShowNotification('Logo Processed', 'The company logo has been successfully uploaded and stored locally.');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      onShowNotification('Uploading Logo', 'Uploading company logo to Google Drive...');
      const publicUrl = await googleSheetsClient.uploadFile(file);
      setFormLogoUrl(publicUrl);
      onShowNotification('Logo Uploaded', 'Company logo uploaded successfully.');
    } catch (err: any) {
      console.error('[Google Drive Logo Upload] Error:', err);
      onShowNotification('Upload Error', `Could not upload logo: ${err.message}`);
    }
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormRegNo('');
    setFormAddress('');
    setFormTaxRef('');
    setFormEpfRef('');
    setFormSocsoRef('');
    setFormCurrency('RM');
    setFormIsActive(true);
    setFormLogoUrl('');
    setFormTheme('theme1');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (entity: CorporateEntity) => {
    setEditingEntity(entity);
    setFormName(entity.name);
    setFormRegNo(entity.registrationNumber);
    setFormAddress(entity.address);
    setFormTaxRef(entity.taxReferenceNo);
    setFormEpfRef(entity.epfReferenceNo);
    setFormSocsoRef(entity.socsoReferenceNo);
    setFormCurrency(entity.currency);
    setFormIsActive(entity.isActive);
    setFormLogoUrl(entity.logoUrl || '');
    setFormTheme(entity.theme || 'theme1');
    setIsEditModalOpen(true);
  };

  const handleCreateEntitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRegNo.trim()) {
      onShowNotification('Validation Error', 'Subsidiary Name and Registration Number are required.');
      return;
    }

    const newId = `ENT-${Math.floor(10 + Math.random() * 90)}`;
    const newEntity: CorporateEntity = {
      id: newId,
      name: formName.trim(),
      registrationNumber: formRegNo.trim(),
      address: formAddress.trim() || 'No official registered office address registered.',
      taxReferenceNo: formTaxRef.trim() || 'Pending Inland Revenue allocation',
      epfReferenceNo: formEpfRef.trim() || 'Pending EPF registration',
      socsoReferenceNo: formSocsoRef.trim() || 'Pending SOCSO registration',
      currency: formCurrency,
      isActive: formIsActive,
      logoUrl: formLogoUrl || undefined,
      theme: formTheme,
    };

    onAddEntity(newEntity);
    setIsAddModalOpen(false);
    setSelectedEntityId(newId);
    onShowNotification('Subsidiary Added', `"${newEntity.name}" has been registered with customized logo & branding.`);
  };

  const handleEditEntitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;

    if (!formName.trim() || !formRegNo.trim()) {
      onShowNotification('Validation Error', 'Subsidiary Name and Registration Number are required.');
      return;
    }

    const updates: Partial<CorporateEntity> = {
      name: formName.trim(),
      registrationNumber: formRegNo.trim(),
      address: formAddress.trim(),
      taxReferenceNo: formTaxRef.trim(),
      epfReferenceNo: formEpfRef.trim(),
      socsoReferenceNo: formSocsoRef.trim(),
      currency: formCurrency,
      isActive: formIsActive,
      logoUrl: formLogoUrl || undefined,
      theme: formTheme,
    };

    onUpdateEntity(editingEntity.id, updates);
    setIsEditModalOpen(false);
    setEditingEntity(null);
    onShowNotification('Subsidiary Updated', `Corporate details & branding for ${formName} have been updated.`);
  };

  const activeEntityEmployees = employees.filter(emp => emp.entityId === selectedEntityId);
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-neutral-border rounded-lg shadow-2xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Corporate Subsidiaries & Entities
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage multi-entity corporate structures, statutory registration, tax filing setups, and localized personnel headcounts.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-[#f7f0e0] font-bold text-xs rounded hover:bg-primary-dark transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Subsidiary
        </button>
      </div>

      {/* Grid of Subsidiaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map(ent => {
          const headcount = employees.filter(e => e.entityId === ent.id).length;
          const isSelected = selectedEntityId === ent.id;

          return (
            <div 
              key={ent.id}
              onClick={() => setSelectedEntityId(ent.id)}
              className={`bg-white border p-5 rounded-lg shadow-2xs cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs relative ${
                isSelected 
                  ? 'border-primary ring-1 ring-primary bg-primary/[0.01]' 
                  : 'border-neutral-border hover:border-outline'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded bg-white border border-neutral-border/50 flex items-center justify-center overflow-hidden shrink-0">
                      {ent.logoUrl ? (
                        <img src={ent.logoUrl} alt={ent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-primary font-mono">{ent.id}</span>
                      <h3 className="font-bold text-sm text-on-surface tracking-tight line-clamp-1">{ent.name}</h3>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    ent.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {ent.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Inactive
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                  <span className="font-bold text-on-surface-variant">Theme Style:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary bg-neutral-100 px-2 py-0.5 rounded border border-neutral-border/30">
                    <span className={`w-2 h-2 rounded-full ${
                      ent.theme === 'theme2' 
                        ? 'bg-[#B30000]' 
                        : ent.theme === 'theme3' 
                        ? 'bg-[#D4AF37]' 
                        : 'bg-[#1c4e89]'
                    }`} />
                    {ent.theme === 'theme2' 
                      ? 'Red & Beige Bold' 
                      : ent.theme === 'theme3' 
                      ? 'Black & Gold Premium' 
                      : 'Classic Blue'
                    }
                  </span>
                </div>

                <div className="space-y-2 text-xs text-on-surface-variant mt-4">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-outline" />
                    <span>Reg No: <span className="font-mono text-on-surface font-semibold">{ent.registrationNumber}</span></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-outline mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{ent.address}</span>
                  </div>
                </div>

                {/* Statutory Panel */}
                <div className="mt-4 p-3 bg-neutral-100 rounded border border-neutral-border/50 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tax Reference:</span>
                    <span className="font-mono font-bold text-on-surface">{ent.taxReferenceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">EPF Reference:</span>
                    <span className="font-mono font-bold text-on-surface">{ent.epfReferenceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">SOCSO Reference:</span>
                    <span className="font-mono font-bold text-on-surface">{ent.socsoReferenceNo}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-5 pt-3 border-t border-neutral-border/50">
                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Headcount: <span className="font-bold">{headcount} personnel</span></span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(ent);
                  }}
                  className="p-1 hover:bg-primary/10 text-primary rounded transition-all"
                  title="Edit Corporate Details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-primary rounded-t-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Entity Personnel Directory Breakdown */}
      {selectedEntity && (
        <div className="bg-white border border-neutral-border rounded-lg shadow-2xs p-5">
          <div className="flex justify-between items-center border-b border-neutral-border pb-3 mb-4">
            <div>
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Registered Personnel Registry: {selectedEntity.name}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Staff listing currently mapped to this legal corporate subsidiary. Total active headcount is <span className="font-bold text-primary">{activeEntityEmployees.length}</span>.
              </p>
            </div>
            <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-1 rounded">
              {selectedEntity.id}
            </span>
          </div>

          {activeEntityEmployees.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant bg-neutral-100 rounded border border-neutral-border/50">
              <Building2 className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
              <p className="font-bold">No Employees Assigned</p>
              <p className="mt-1">There are currently no staff members mapped to this subsidiary. You can register new employees under this entity or perform a Subsidiary Transfer in the Employee Directory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-neutral-border text-on-surface-variant font-bold uppercase tracking-wider select-none">
                    <th className="p-3">Staff ID</th>
                    <th className="p-3">Personnel Name</th>
                    <th className="p-3">Department & Designation</th>
                    <th className="p-3 font-mono">Monthly Salary</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/50">
                  {activeEntityEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-mono font-bold text-primary">{emp.id}</td>
                      <td className="p-3 font-bold text-on-surface">{emp.name}</td>
                      <td className="p-3">
                        <div className="font-semibold text-on-surface">{emp.designation}</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">{emp.department}</div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-primary">RM {emp.basicSalary.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-secondary uppercase bg-neutral-100 px-1.5 py-0.5 rounded">
                          {emp.employmentType}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          emp.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : emp.status === 'On Leave' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Register New Subsidiary */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-left">
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-primary text-[#f7f0e0]">
              <h3 className="font-bold text-base text-[#f7f0e0] flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Register Legal Corporate Subsidiary
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#f7f0e0] hover:text-[#f7f0e0]/70"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntitySubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Registered Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Global Logistical Sdn Bhd"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Reg No. (SSM/ROC) *</label>
                  <input
                    type="text"
                    required
                    placeholder="202501049281 (1520194-H)"
                    value={formRegNo}
                    onChange={(e) => setFormRegNo(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Reporting Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="RM">RM (Malaysian Ringgit)</option>
                    <option value="SGD">SGD (Singapore Dollar)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Registered Address</label>
                <textarea
                  placeholder="Level 12, Wisma Central, Jalan Ampang, 50450 Kuala Lumpur"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none h-16 resize-none"
                />
              </div>

              {/* BRANDING SECTION */}
              <div className="border-t border-neutral-border pt-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-2">Corporate Branding & Identity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Logo</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-on-surface-variant font-semibold">Or paste logo URL:</span>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        className="flex-1 bg-white border border-neutral-border rounded p-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    {formLogoUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-on-surface-variant">Preview:</span>
                        <div className="w-8 h-8 rounded border overflow-hidden bg-white">
                          <img src={formLogoUrl} alt="Logo preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Corporate Theme Color</label>
                  <select
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value as any)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="theme1">Theme 1: Classic Professional Blue (Current)</option>
                    <option value="theme2">Theme 2: Red & Beige Bold Modern Professional</option>
                    <option value="theme3">Theme 3: Black & Gold Premium High-Contrast</option>
                  </select>
                  <div className="mt-2 text-[10px] text-on-surface-variant space-y-1 bg-neutral-100 p-2 rounded border border-neutral-border/30">
                    {formTheme === 'theme1' && (
                      <p>Classic corporative layout using deep blue tones and cool gray accents.</p>
                    )}
                    {formTheme === 'theme2' && (
                      <p className="leading-tight">
                        <strong>Bold & Warm Red/Beige:</strong> Uses deep crimson reds (#B30000), burgundies, and comfortable parchment creams for a modern editorial vibe.
                      </p>
                    )}
                    {formTheme === 'theme3' && (
                      <p className="leading-tight">
                        <strong>Black & Gold:</strong> Dark mode aesthetic with premium yellow gold highlights (#D4AF37) and dark charcoal backing.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-border pt-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-2">Statutory Reference Accounts</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Corporate Tax Ref</label>
                  <input
                    type="text"
                    placeholder="C 8827104920"
                    value={formTaxRef}
                    onChange={(e) => setFormTaxRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">EPF Ref Code</label>
                  <input
                    type="text"
                    placeholder="EPF-MY-29481"
                    value={formEpfRef}
                    onChange={(e) => setFormEpfRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">SOCSO Ref Code</label>
                  <input
                    type="text"
                    placeholder="SOC-MY-18273"
                    value={formSocsoRef}
                    onChange={(e) => setFormSocsoRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-neutral-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="formIsActive" className="text-xs font-semibold text-on-surface cursor-pointer select-none">
                    Subsidiary Active for Employee Mapping
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-neutral-border rounded text-xs hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-[#f7f0e0] font-bold rounded text-xs hover:bg-primary-dark transition-all cursor-pointer"
                  >
                    Save & Add Registry
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Corporate Details */}
      {isEditModalOpen && editingEntity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-left">
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-primary text-[#f7f0e0]">
              <h3 className="font-bold text-base text-[#f7f0e0] flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Edit Corporate Details: {editingEntity.id}
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEntity(null);
                }}
                className="text-[#f7f0e0] hover:text-[#f7f0e0]/70"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEntitySubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Registered Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Reg No. (SSM/ROC) *</label>
                  <input
                    type="text"
                    required
                    value={formRegNo}
                    onChange={(e) => setFormRegNo(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Reporting Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="RM">RM (Malaysian Ringgit)</option>
                    <option value="SGD">SGD (Singapore Dollar)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Registered Address</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none h-16 resize-none"
                />
              </div>

              {/* BRANDING SECTION */}
              <div className="border-t border-neutral-border pt-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-2">Corporate Branding & Identity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Logo</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] text-on-surface-variant font-semibold">Or paste logo URL:</span>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        className="flex-1 bg-white border border-neutral-border rounded p-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    {formLogoUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-on-surface-variant">Preview:</span>
                        <div className="w-8 h-8 rounded border overflow-hidden bg-white">
                          <img src={formLogoUrl} alt="Logo preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Corporate Theme Color</label>
                  <select
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value as any)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="theme1">Theme 1: Classic Professional Blue (Current)</option>
                    <option value="theme2">Theme 2: Red & Beige Bold Modern Professional</option>
                    <option value="theme3">Theme 3: Black & Gold Premium High-Contrast</option>
                  </select>
                  <div className="mt-2 text-[10px] text-on-surface-variant space-y-1 bg-neutral-100 p-2 rounded border border-neutral-border/30">
                    {formTheme === 'theme1' && (
                      <p>Classic corporative layout using deep blue tones and cool gray accents.</p>
                    )}
                    {formTheme === 'theme2' && (
                      <p className="leading-tight">
                        <strong>Bold & Warm Red/Beige:</strong> Uses deep crimson reds (#B30000), burgundies, and comfortable parchment creams for a modern editorial vibe.
                      </p>
                    )}
                    {formTheme === 'theme3' && (
                      <p className="leading-tight">
                        <strong>Black & Gold:</strong> Dark mode aesthetic with premium yellow gold highlights (#D4AF37) and dark charcoal backing.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-border pt-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-2">Statutory Reference Accounts</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Corporate Tax Ref</label>
                  <input
                    type="text"
                    value={formTaxRef}
                    onChange={(e) => setFormTaxRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">EPF Ref Code</label>
                  <input
                    type="text"
                    value={formEpfRef}
                    onChange={(e) => setFormEpfRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">SOCSO Ref Code</label>
                  <input
                    type="text"
                    value={formSocsoRef}
                    onChange={(e) => setFormSocsoRef(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-neutral-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="editIsActive" className="text-xs font-semibold text-on-surface cursor-pointer select-none">
                    Subsidiary Active for Employee Mapping
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingEntity(null);
                    }}
                    className="px-4 py-2 border border-neutral-border rounded text-xs hover:bg-neutral-100 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-[#f7f0e0] font-bold rounded text-xs hover:bg-primary-dark transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
