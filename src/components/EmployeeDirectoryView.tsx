/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { googleSheetsClient, isGoogleConfigured } from '../lib/googleSheetsClient';
import { getGmt8Timestamp } from '../lib/dateUtils';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  X, 
  DollarSign, 
  Building2, 
  CheckCircle,
  AlertTriangle,
  Mail,
  Trash,
  Calendar,
  ShieldAlert,
  Phone,
  Globe,
  Heart,
  TrendingUp,
  History,
  UserCheck,
  FileText,
  Eye,
  Download,
  Printer,
  ArrowLeft,
  Check,
  Lock,
  Shield,
  Activity,
  Minus,
  Plus,
  RotateCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Employee, CareerHistoryEntry, Dependant, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel } from '../data';

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  entities: CorporateEntity[];
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onShowNotification: (title: string, message: string) => void;
}

export default function EmployeeDirectoryView({
  employees,
  entities,
  onAddEmployee,
  onDeleteEmployee,
  onUpdateEmployee,
  onShowNotification
}: EmployeeDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [entityFilter, setEntityFilter] = useState('All Subsidiaries');

  // Self-Service Mode & Preview States
  const [viewMode, setViewMode] = useState<'admin' | 'self-service'>('admin');
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string>(employees[0]?.id || '');
  const [viewingPayslipMonth, setViewingPayslipMonth] = useState<string | null>(null);
  const [selfServiceActiveTab, setSelfServiceActiveTab] = useState<'personal' | 'family' | 'financial' | 'history'>('personal');
  
  // States for interactive simulated profile edits inside Self-Service
  const [selfServiceContactNumber, setSelfServiceContactNumber] = useState('');
  const [selfServiceEmergencyName, setSelfServiceEmergencyName] = useState('');
  const [selfServiceEmergencyRelation, setSelfServiceEmergencyRelation] = useState('');
  const [selfServiceEmergencyPhone, setSelfServiceEmergencyPhone] = useState('');
  const [isSelfServiceEditingProfile, setIsSelfServiceEditingProfile] = useState(false);
  
  // Interactive zoom & rotate state for simulated payslip modal
  const [payslipZoom, setPayslipZoom] = useState(100);
  const [payslipRotation, setPayslipRotation] = useState(0);

  // Add Employee Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEntityId, setFormEntityId] = useState(entities[0]?.id || '');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formStatus, setFormStatus] = useState<'Active' | 'On Leave' | 'Terminated' | 'Suspended'>('Active');
  const [formBank, setFormBank] = useState('Maybank Berhad');
  const [formAccount, setFormAccount] = useState('');
  const [formSalary, setFormSalary] = useState(5000);
  const [formHousing, setFormHousing] = useState(500);
  const [formTransport, setFormTransport] = useState(300);

  // New specific compliance form states
  const [formNricPassport, setFormNricPassport] = useState('');
  const [formNationality, setFormNationality] = useState('Malaysian');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [formTaxNumber, setFormTaxNumber] = useState('');
  const [formEpfNumber, setFormEpfNumber] = useState('');
  const [formEmploymentType, setFormEmploymentType] = useState<Employee['employmentType']>('Confirmation');
  const [formEligibleForStatutory, setFormEligibleForStatutory] = useState<'Yes' | 'No'>('Yes');
  const [formMaritalStatus, setFormMaritalStatus] = useState<'Single' | 'Married' | 'Divorced' | 'Widowed'>('Single');
  const [formEmergencyContactName, setFormEmergencyContactName] = useState('');
  const [formEmergencyContactRelation, setFormEmergencyContactRelation] = useState('');
  const [formEmergencyContactPhone, setFormEmergencyContactPhone] = useState('');
  const [formDateOfJoined, setFormDateOfJoined] = useState('2026-06-29');

  // Spouse details form states
  const [formSpouseName, setFormSpouseName] = useState('');
  const [formSpouseNric, setFormSpouseNric] = useState('');
  const [formSpouseIsWorking, setFormSpouseIsWorking] = useState<'Yes' | 'No'>('No');
  const [formSpouseCompany, setFormSpouseCompany] = useState('');
  const [formSpousePosition, setFormSpousePosition] = useState('');

  // Dependants details form states
  const [formHasDependants, setFormHasDependants] = useState<'Yes' | 'No'>('No');
  const [formDependants, setFormDependants] = useState<Omit<Dependant, 'id'>[]>([]);

  // Temp dependant fields for adding
  const [tempDepName, setTempDepName] = useState('');
  const [tempDepGender, setTempDepGender] = useState<'Male' | 'Female'>('Male');
  const [tempDepDob, setTempDepDob] = useState('2018-01-01');

  // Selected Employee Detail View States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');

  // General Info Edit States
  const [isEditingGeneralInfo, setIsEditingGeneralInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Leave' | 'Terminated' | 'Suspended'>('Active');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');
  const [editBasicSalary, setEditBasicSalary] = useState(0);
  const [editHousingAllowance, setEditHousingAllowance] = useState(0);
  const [editTransportAllowance, setEditTransportAllowance] = useState(0);
  const [editAllowanceGeneral, setEditAllowanceGeneral] = useState(0);
  const [editAllowanceParking, setEditAllowanceParking] = useState(0);
  const [editAllowanceMeal, setEditAllowanceMeal] = useState(0);
  const [editAllowancePhone, setEditAllowancePhone] = useState(0);
  const [editNricPassport, setEditNricPassport] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editEmploymentType, setEditEmploymentType] = useState('');
  const [editDateOfJoined, setEditDateOfJoined] = useState('');
  const [editEpfRateEmployee, setEditEpfRateEmployee] = useState(11);
  const [editEpfRateEmployer, setEditEpfRateEmployer] = useState(13);
  const [editTaxPcb, setEditTaxPcb] = useState(0);
  const [editEmergencyContactName, setEditEmergencyContactName] = useState('');
  const [editEmergencyContactRelation, setEditEmergencyContactRelation] = useState('');
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState('');
  const [editEntityId, setEditEntityId] = useState('');

  const handleStartEditGeneralInfo = () => {
    if (!selectedEmployee) return;
    setEditName(selectedEmployee.name);
    setEditEmail(selectedEmployee.email || '');
    setEditDesignation(selectedEmployee.designation);
    setEditDepartment(selectedEmployee.department);
    setEditStatus(selectedEmployee.status);
    setEditBankName(selectedEmployee.bankName || '');
    setEditAccountNo(selectedEmployee.accountNo || '');
    setEditBasicSalary(selectedEmployee.basicSalary);
    setEditHousingAllowance(selectedEmployee.allowanceAccommodation !== undefined ? selectedEmployee.allowanceAccommodation : selectedEmployee.housingAllowance || 0);
    setEditTransportAllowance(selectedEmployee.allowanceTransport !== undefined ? selectedEmployee.allowanceTransport : selectedEmployee.transportAllowance || 0);
    setEditAllowanceGeneral(selectedEmployee.allowanceGeneral || 0);
    setEditAllowanceParking(selectedEmployee.allowanceParking || 0);
    setEditAllowanceMeal(selectedEmployee.allowanceMeal || 0);
    setEditAllowancePhone(selectedEmployee.allowancePhone || 0);
    setEditNricPassport(selectedEmployee.nricPassport || '');
    setEditNationality(selectedEmployee.nationality || '');
    setEditContactNumber(selectedEmployee.contactNumber || '');
    setEditEmploymentType(selectedEmployee.employmentType || '');
    setEditDateOfJoined(selectedEmployee.dateOfJoined || '');
    setEditEpfRateEmployee(selectedEmployee.epfRateEmployee !== undefined ? selectedEmployee.epfRateEmployee : 11);
    setEditEpfRateEmployer(selectedEmployee.epfRateEmployer !== undefined ? selectedEmployee.epfRateEmployer : 13);
    setEditTaxPcb(selectedEmployee.taxPcb || 0);
    setEditEmergencyContactName(selectedEmployee.emergencyContactName || '');
    setEditEmergencyContactRelation(selectedEmployee.emergencyContactRelation || '');
    setEditEmergencyContactPhone(selectedEmployee.emergencyContactPhone || '');
    setEditEntityId(selectedEmployee.entityId || entities[0]?.id || '');
    setIsEditingGeneralInfo(true);
  };

  const handleSaveGeneralInfoUpdates = () => {
    if (!selectedEmployee) return;
    
    const updates: Partial<Employee> = {
      name: editName,
      email: editEmail,
      designation: editDesignation,
      department: editDepartment,
      status: editStatus,
      bankName: editBankName,
      accountNo: editAccountNo,
      basicSalary: Number(editBasicSalary),
      housingAllowance: Number(editHousingAllowance),
      allowanceAccommodation: Number(editHousingAllowance),
      transportAllowance: Number(editTransportAllowance),
      allowanceTransport: Number(editTransportAllowance),
      allowanceGeneral: Number(editAllowanceGeneral),
      allowanceParking: Number(editAllowanceParking),
      allowanceMeal: Number(editAllowanceMeal),
      allowancePhone: Number(editAllowancePhone),
      nricPassport: editNricPassport,
      nationality: editNationality,
      contactNumber: editContactNumber,
      employmentType: editEmploymentType,
      dateOfJoined: editDateOfJoined,
      epfRateEmployee: Number(editEpfRateEmployee),
      epfRateEmployer: Number(editEpfRateEmployer),
      taxPcb: Number(editTaxPcb),
      emergencyContactName: editEmergencyContactName,
      emergencyContactRelation: editEmergencyContactRelation,
      emergencyContactPhone: editEmergencyContactPhone,
      entityId: editEntityId
    };

    onUpdateEmployee(selectedEmployee.id, updates);
    setIsEditingGeneralInfo(false);
    onShowNotification('Profile Saved', 'Employee personal and corporate profile updated successfully.');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isGoogleConfigured) {
      // Offline fallback: Use local blob URL
      const localUrl = URL.createObjectURL(file);
      setFormAvatarUrl(localUrl);
      onShowNotification('Avatar Selected', 'Simulated image upload locally.');
      return;
    }

    try {
      onShowNotification('Uploading Image', 'Uploading photo to Google Drive...');
      
      const publicUrl = await googleSheetsClient.uploadFile(file);

      setFormAvatarUrl(publicUrl);
      onShowNotification('Upload Succeeded', 'Employee photo uploaded successfully.');
    } catch (err: any) {
      console.error('[Google Drive Storage] Upload error:', err);
      onShowNotification('Upload Error', `Could not upload image: ${err.message}`);
    }
  };

  const handleDetailAvatarChange = async (employeeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isGoogleConfigured) {
      // Offline fallback: Use local blob URL
      const localUrl = URL.createObjectURL(file);
      onUpdateEmployee(employeeId, { avatarUrl: localUrl });
      onShowNotification('Avatar Selected', 'Simulated avatar change locally.');
      return;
    }

    try {
      onShowNotification('Uploading Image', 'Uploading photo to Google Drive...');
      
      const publicUrl = await googleSheetsClient.uploadFile(file);

      onUpdateEmployee(employeeId, { avatarUrl: publicUrl });

      // Log update to audit log table
      await googleSheetsClient.insert('audit_logs', {
        id: `log_${Date.now()}`,
        employeeId: employeeId,
        changedBy: 'admin@acme.com',
        changeType: 'AVATAR_CHANGE',
        oldValue: '',
        newValue: publicUrl,
        createdAt: getGmt8Timestamp()
      });

      onShowNotification('Photo Updated', 'Employee photo has been updated successfully.');
    } catch (err: any) {
      console.error('[Google Drive Storage] Upload error:', err);
      onShowNotification('Upload Error', `Could not upload image: ${err.message}`);
    }
  };

  // Detail View Family editor states
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [editMaritalStatus, setEditMaritalStatus] = useState<'Single' | 'Married' | 'Divorced' | 'Widowed'>('Single');
  const [editSpouseName, setEditSpouseName] = useState('');
  const [editSpouseNric, setEditSpouseNric] = useState('');
  const [editSpouseIsWorking, setEditSpouseIsWorking] = useState<'Yes' | 'No'>('No');
  const [editSpouseCompany, setEditSpouseCompany] = useState('');
  const [editSpousePosition, setEditSpousePosition] = useState('');
  const [editHasDependants, setEditHasDependants] = useState<'Yes' | 'No'>('No');
  const [editDependants, setEditDependants] = useState<Dependant[]>([]);
  const [editEligibleForStatutory, setEditEligibleForStatutory] = useState<'Yes' | 'No'>('Yes');
  const [editTaxNumber, setEditTaxNumber] = useState('');
  const [editEpfNumber, setEditEpfNumber] = useState('');

  // Temp dependant fields for detail editor
  const [detailTempDepName, setDetailTempDepName] = useState('');
  const [detailTempDepGender, setDetailTempDepGender] = useState<'Male' | 'Female'>('Male');
  const [detailTempDepDob, setDetailTempDepDob] = useState('2018-01-01');

  // Progression Action states
  const [progressionType, setProgressionType] = useState<'Status Change' | 'Promotion' | 'Department Transfer' | 'Salary Revision' | 'Employment Type Change' | 'Subsidiary Transfer'>('Status Change');
  const [progressionValue, setProgressionValue] = useState('');
  const [progressionNotes, setProgressionNotes] = useState('');
  const [progressionDate, setProgressionDate] = useState('2026-06-29');

  // Selected Employee object (synchronized with parent state in real time)
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || null;

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    const matchesDept = deptFilter === 'All Departments' || emp.department === deptFilter;
    const matchesStatus = statusFilter === 'All Statuses' || emp.status === statusFilter;
    const matchesEntity = entityFilter === 'All Subsidiaries' || emp.entityId === entityFilter;
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesStatus && matchesEntity && matchesSearch;
  });

  const handleOpenAddModal = () => {
    setFormEntityId(entities[0]?.id || '');
    setFormName('');
    setFormEmail('');
    setFormDesignation('');
    setFormDepartment('Engineering');
    setFormStatus('Active');
    setFormBank('Maybank Berhad');
    setFormAccount('');
    setFormSalary(5000);
    setFormHousing(500);
    setFormTransport(300);
    setFormNricPassport('');
    setFormNationality('Malaysian');
    setFormContactNumber('');
    setFormTaxNumber('');
    setFormEpfNumber('');
    setFormEmploymentType('Full-Time');
    setFormMaritalStatus('Single');
    setFormEmergencyContactName('');
    setFormEmergencyContactRelation('');
    setFormEmergencyContactPhone('');
    setFormDateOfJoined('2026-06-29');

    // Reset spouse/dependant form states
    setFormSpouseName('');
    setFormSpouseNric('');
    setFormSpouseIsWorking('No');
    setFormSpouseCompany('');
    setFormSpousePosition('');
    setFormHasDependants('No');
    setFormDependants([]);
    setTempDepName('');
    setTempDepGender('Male');
    setTempDepDob('2018-01-01');

    setIsAddModalOpen(true);
  };

  // Helper functions for Form Dependants
  const handleAddFormDependant = () => {
    if (!tempDepName.trim()) {
      onShowNotification('Dependant Error', 'Please specify dependant name.');
      return;
    }
    if (formDependants.length >= 10) {
      onShowNotification('Limit Reached', 'Maximum of 10 dependants is allowed.');
      return;
    }
    setFormDependants(prev => [...prev, {
      name: tempDepName,
      gender: tempDepGender,
      dob: tempDepDob
    }]);
    setTempDepName('');
  };

  const handleRemoveFormDependant = (index: number) => {
    setFormDependants(prev => prev.filter((_, i) => i !== index));
  };

  // Helper functions for Detail Dependants
  const handleAddDetailDependant = () => {
    if (!detailTempDepName.trim()) {
      onShowNotification('Dependant Error', 'Please specify dependant name.');
      return;
    }
    if (editDependants.length >= 10) {
      onShowNotification('Limit Reached', 'Maximum of 10 dependants is allowed.');
      return;
    }
    setEditDependants(prev => [...prev, {
      id: `dep-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name: detailTempDepName,
      gender: detailTempDepGender,
      dob: detailTempDepDob
    }]);
    setDetailTempDepName('');
  };

  const handleRemoveDetailDependant = (id: string) => {
    setEditDependants(prev => prev.filter(dep => dep.id !== id));
  };

  const handleStartEditFamily = () => {
    if (!selectedEmployee) return;
    setEditMaritalStatus(selectedEmployee.maritalStatus);
    setEditSpouseName(selectedEmployee.spouseName || '');
    setEditSpouseNric(selectedEmployee.spouseNric || '');
    setEditSpouseIsWorking(selectedEmployee.spouseIsWorking || 'No');
    setEditSpouseCompany(selectedEmployee.spouseCompany || '');
    setEditSpousePosition(selectedEmployee.spousePosition || '');
    setEditHasDependants(selectedEmployee.hasDependants || 'No');
    setEditDependants(selectedEmployee.dependants || []);
    setEditEligibleForStatutory(selectedEmployee.eligibleForStatutory || 'No');
    setEditTaxNumber(selectedEmployee.taxNumber || '');
    setEditEpfNumber(selectedEmployee.epfNumber || '');
    setIsEditingFamily(true);
  };

  const handleSaveFamilyUpdates = () => {
    if (!selectedEmployee) return;
    
    const updates: Partial<Employee> = {
      maritalStatus: editMaritalStatus,
      taxNumber: editTaxNumber,
      epfNumber: editEpfNumber,
      eligibleForStatutory: editEligibleForStatutory
    };

    if (editMaritalStatus === 'Married') {
      updates.spouseName = editSpouseName;
      updates.spouseNric = editSpouseNric;
      updates.spouseIsWorking = editSpouseIsWorking;
      if (editSpouseIsWorking === 'Yes') {
        updates.spouseCompany = editSpouseCompany;
        updates.spousePosition = editSpousePosition;
      } else {
        updates.spouseCompany = '';
        updates.spousePosition = '';
      }
      
      updates.hasDependants = editHasDependants;
      if (editHasDependants === 'Yes') {
        updates.dependants = editDependants;
      } else {
        updates.dependants = [];
      }
    } else if (editMaritalStatus === 'Divorced' || editMaritalStatus === 'Widowed') {
      updates.spouseName = '';
      updates.spouseNric = '';
      updates.spouseIsWorking = 'No';
      updates.spouseCompany = '';
      updates.spousePosition = '';
      
      updates.hasDependants = editHasDependants;
      if (editHasDependants === 'Yes') {
        updates.dependants = editDependants;
      } else {
        updates.dependants = [];
      }
    } else {
      // Single
      updates.spouseName = '';
      updates.spouseNric = '';
      updates.spouseIsWorking = 'No';
      updates.spouseCompany = '';
      updates.spousePosition = '';
      updates.hasDependants = 'No';
      updates.dependants = [];
    }

    onUpdateEmployee(selectedEmployee.id, updates);
    setIsEditingFamily(false);
    onShowNotification('Profile Updated', 'Family and compliance registry updated successfully.');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formDesignation || !formAccount || !formNricPassport || !formContactNumber) {
      onShowNotification('Form Error', 'Please fill in all required corporate and NRIC/Passport fields.');
      return;
    }

    const spouseAndDependantFields: Partial<Employee> = {};
    if (formMaritalStatus === 'Married') {
      spouseAndDependantFields.spouseName = formSpouseName;
      spouseAndDependantFields.spouseNric = formSpouseNric;
      spouseAndDependantFields.spouseIsWorking = formSpouseIsWorking;
      if (formSpouseIsWorking === 'Yes') {
        spouseAndDependantFields.spouseCompany = formSpouseCompany;
        spouseAndDependantFields.spousePosition = formSpousePosition;
      } else {
        spouseAndDependantFields.spouseCompany = '';
        spouseAndDependantFields.spousePosition = '';
      }
      
      spouseAndDependantFields.hasDependants = formHasDependants;
      if (formHasDependants === 'Yes') {
        spouseAndDependantFields.dependants = formDependants.map((dep, idx) => ({
          ...dep,
          id: `dep-${Date.now()}-${idx}`
        }));
      } else {
        spouseAndDependantFields.dependants = [];
      }
    } else if (formMaritalStatus === 'Divorced' || formMaritalStatus === 'Widowed') {
      spouseAndDependantFields.spouseName = '';
      spouseAndDependantFields.spouseNric = '';
      spouseAndDependantFields.spouseIsWorking = 'No';
      spouseAndDependantFields.spouseCompany = '';
      spouseAndDependantFields.spousePosition = '';
      
      spouseAndDependantFields.hasDependants = formHasDependants;
      if (formHasDependants === 'Yes') {
        spouseAndDependantFields.dependants = formDependants.map((dep, idx) => ({
          ...dep,
          id: `dep-${Date.now()}-${idx}`
        }));
      } else {
        spouseAndDependantFields.dependants = [];
      }
    } else {
      // Single
      spouseAndDependantFields.spouseName = '';
      spouseAndDependantFields.spouseNric = '';
      spouseAndDependantFields.spouseIsWorking = 'No';
      spouseAndDependantFields.spouseCompany = '';
      spouseAndDependantFields.spousePosition = '';
      spouseAndDependantFields.hasDependants = 'No';
      spouseAndDependantFields.dependants = [];
    }

    const newEmp: Employee = {
      id: formEmail,
      entityId: formEntityId,
      name: formName,
      email: formEmail,
      designation: formDesignation,
      department: formDepartment,
      status: formStatus,
      bankName: formBank,
      accountNo: formAccount,
      basicSalary: Number(formSalary),
      housingAllowance: Number(formHousing),
      transportAllowance: Number(formTransport),
      overtime: 0,
      performanceBonus: 0,
      epfRateEmployee: 11,
      epfRateEmployer: 13,
      socsoEmployee: 19.75,
      socsoEmployer: 84.50,
      skbbkEmployee: 4.90,
      skbbkEmployer: 17.15,
      eisEmployee: 7.90,
      eisEmployer: 7.90,
      taxPcb: Math.round(Number(formSalary) * 0.1),
      unpaidLeave: 0,
      hrdCorp: 103,
      avatarUrl: formAvatarUrl || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?q=80&w=256&h=256&fit=crop`,
      
      // New fields mapping
      nricPassport: formNricPassport,
      nationality: formNationality,
      contactNumber: formContactNumber,
      taxNumber: formTaxNumber || `TX-${Math.floor(100000000 + Math.random() * 900000000)}`,
      epfNumber: formEpfNumber || `EP-${Math.floor(100000000 + Math.random() * 900000000)}`,
      employmentType: formEmploymentType,
      maritalStatus: formMaritalStatus,
      eligibleForStatutory: formEmploymentType === 'Independent Contractor / Freelance' ? formEligibleForStatutory : 'No',
      emergencyContactName: formEmergencyContactName || 'N/A',
      emergencyContactRelation: formEmergencyContactRelation || 'Spouse',
      emergencyContactPhone: formEmergencyContactPhone || 'N/A',
      dateOfJoined: formDateOfJoined,
      
      ...spouseAndDependantFields,
      
      // Initial career history entry
      careerHistory: [
        {
          id: `h-${Date.now()}`,
          date: formDateOfJoined,
          type: 'Hired',
          previousValue: '-',
          newValue: `${formDesignation} (${formEmploymentType})`,
          notes: 'Employee successfully registered and allocated staff records.'
        }
      ]
    };

     onAddEmployee(newEmp);
     setIsAddModalOpen(false);
     onShowNotification(
       'Employee Registered',
       `${formName} has been onboarded into Workforce records.`
     );
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to terminate/remove ${name} from active payroll directory?`)) {
      onDeleteEmployee(id);
      onShowNotification('Employee Deleted', `${name} removed successfully.`);
      if (selectedEmployeeId === id) {
        setIsDetailOpen(false);
      }
    }
  };

  // Execute Career Progression Event update
  const handleProgressionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!progressionValue.trim()) {
      onShowNotification('Progression Error', 'Please specify the new progression value.');
      return;
    }

    let previousVal = '';
    let newVal = progressionValue;
    const updates: Partial<Employee> = {};

    switch (progressionType) {
      case 'Status Change':
        previousVal = selectedEmployee.status;
        updates.status = progressionValue as any;
        break;
      case 'Promotion':
        previousVal = selectedEmployee.designation;
        updates.designation = progressionValue;
        break;
      case 'Department Transfer':
        previousVal = selectedEmployee.department;
        updates.department = progressionValue;
        break;
      case 'Employment Type Change':
        previousVal = selectedEmployee.employmentType;
        updates.employmentType = progressionValue as any;
        if (progressionValue === 'Independent Contractor / Freelance') {
          updates.eligibleForStatutory = 'No';
        }
        break;
      case 'Salary Revision':
        previousVal = `RM ${selectedEmployee.basicSalary.toLocaleString()}`;
        const numericSalary = Number(progressionValue);
        if (isNaN(numericSalary) || numericSalary <= 0) {
          onShowNotification('Validation Error', 'Please enter a valid numeric salary.');
          return;
        }
        updates.basicSalary = numericSalary;
        updates.taxPcb = Math.round(numericSalary * 0.1); // Auto adjust tax PCB
        newVal = `RM ${numericSalary.toLocaleString()}`;
        break;
      case 'Subsidiary Transfer':
        previousVal = entities.find(e => e.id === selectedEmployee.entityId)?.name || selectedEmployee.entityId;
        updates.entityId = progressionValue;
        newVal = entities.find(e => e.id === progressionValue)?.name || progressionValue;
        break;
    }

    const newHistoryEntry: CareerHistoryEntry = {
      id: `prog-${Date.now()}`,
      date: progressionDate,
      type: progressionType,
      previousValue: previousVal,
      newValue: newVal,
      notes: progressionNotes || 'No notes provided by Administrator.'
    };

    const currentHistory = selectedEmployee.careerHistory || [];
    updates.careerHistory = [newHistoryEntry, ...currentHistory];

    onUpdateEmployee(selectedEmployee.id, updates);
    onShowNotification(
      'Career Progression Updated',
      `${selectedEmployee.name} progression event has been recorded in the permanent log.`
    );

    // Clear progression sub-form inputs
    setProgressionValue('');
    setProgressionNotes('');
  };

  const previewEmployee = employees.find(e => e.id === previewEmployeeId) || employees[0];

  if (viewMode === 'self-service' && previewEmployee) {
    const activeSub = entities.find(e => e.id === previewEmployee.entityId) || entities[0];
    const payslipBreakdown = calculatePayslip(previewEmployee);
    
    const isEligible = 
      previewEmployee.employmentType === 'Probationary' || 
      previewEmployee.employmentType === 'Confirmation' || 
      (previewEmployee.employmentType === 'Independent Contractor / Freelance' && previewEmployee.eligibleForStatutory === 'Yes');

    const skbbkEmployeeVal = previewEmployee.skbbkEmployee !== undefined ? previewEmployee.skbbkEmployee : (isEligible ? parseFloat(((previewEmployee.socsoEmployee || 0) * 0.25).toFixed(2)) : 0);
    const skbbkEmployerVal = previewEmployee.skbbkEmployer !== undefined ? previewEmployee.skbbkEmployer : (isEligible ? parseFloat(((previewEmployee.socsoEmployer || 0) * 0.25).toFixed(2)) : 0);

    const handleSimulateUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateEmployee(previewEmployee.id, {
        contactNumber: selfServiceContactNumber,
        emergencyContactName: selfServiceEmergencyName,
        emergencyContactRelation: selfServiceEmergencyRelation,
        emergencyContactPhone: selfServiceEmergencyPhone
      });
      setIsSelfServiceEditingProfile(false);
      onShowNotification(
        'Profile Saved',
        `Contact and emergency records for ${previewEmployee.name} updated successfully in the primary directory.`
      );
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
        
        {/* Toggle and Dropdown Select header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
          <div>
            <h1 className="text-3xl font-bold text-on-background tracking-tight">Workforce Directory</h1>
            <p className="text-on-surface-variant mt-1">Preview the portal experience and check statutory records from the employee's perspective.</p>
          </div>
          
          {/* Toggle buttons */}
          <div className="flex bg-surface-container border border-neutral-border rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('admin')}
              className="px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-on-surface hover:bg-surface-container-high"
            >
              <Building2 className="w-4 h-4" /> HR Administration
            </button>
            <button
              onClick={() => setViewMode('self-service')}
              className="px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-primary text-[#f7f0e0] shadow-sm"
            >
              <UserCheck className="w-4 h-4" /> Self-Service Preview
            </button>
          </div>
        </div>

        {/* Warning Alert Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-left">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs text-amber-800">
            <span className="font-bold uppercase tracking-wider block mb-1">Interactive HR Simulation Mode Active</span>
            <p>You are previewing exactly what <strong>{previewEmployee.name}</strong> sees when logging in to their personal account. Use the selector below to switch between employees to audit and preview their statutory registries, career progression, and historical payslips.</p>
          </div>
        </div>

        {/* Employee Switcher Control Bar */}
        <div className="bg-white border border-neutral-border p-4 rounded-lg shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0">Preview Employee Perspective:</span>
            <select
              value={previewEmployeeId}
              onChange={(e) => {
                const id = e.target.value;
                setPreviewEmployeeId(id);
                const emp = employees.find(x => x.id === id);
                if (emp) {
                  setSelfServiceContactNumber(emp.contactNumber || '');
                  setSelfServiceEmergencyName(emp.emergencyContactName || '');
                  setSelfServiceEmergencyRelation(emp.emergencyContactRelation || '');
                  setSelfServiceEmergencyPhone(emp.emergencyContactPhone || '');
                  setIsSelfServiceEditingProfile(false);
                }
              }}
              className="bg-surface-container border border-neutral-border text-xs font-bold text-primary rounded-md px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id} · {emp.designation})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-md text-[11px] text-primary font-semibold">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Active Subsidiary: <strong>{activeSub.name}</strong></span>
          </div>
        </div>

        {/* Main Portal Dashboard layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: My Profile Hub (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Elegant Profile Header Header */}
            <div className="bg-white border border-neutral-border rounded-lg shadow-xs overflow-hidden text-left">
              <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/95 relative flex items-end p-6">
                <div className="absolute top-4 right-4 bg-white/20 text-[#f7f0e0] border border-white/25 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Secure Account
                </div>
              </div>
              
              <div className="px-6 pb-6 relative">
                {/* Avatar overlapping border */}
                <div className="relative -mt-12 mb-4 w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-md bg-white">
                  {previewEmployee.avatarUrl ? (
                    <img src={previewEmployee.avatarUrl} alt={previewEmployee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-2xl">
                      {previewEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface tracking-tight">{previewEmployee.name}</h2>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">{previewEmployee.designation} · {previewEmployee.department}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Portal Online
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Tabbed Details Card */}
            <div className="bg-white border border-neutral-border rounded-lg shadow-xs overflow-hidden text-left">
              
              {/* Profile Card Tabs Header */}
              <div className="bg-surface-container-low border-b border-neutral-border flex overflow-x-auto">
                <button
                  onClick={() => setSelfServiceActiveTab('personal')}
                  className={`px-4 py-3 border-b-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selfServiceActiveTab === 'personal'
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Personal Details
                </button>
                <button
                  onClick={() => setSelfServiceActiveTab('family')}
                  className={`px-4 py-3 border-b-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selfServiceActiveTab === 'family'
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Spouse & Dependants
                </button>
                <button
                  onClick={() => setSelfServiceActiveTab('financial')}
                  className={`px-4 py-3 border-b-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selfServiceActiveTab === 'financial'
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Statutory & Banking
                </button>
                <button
                  onClick={() => setSelfServiceActiveTab('history')}
                  className={`px-4 py-3 border-b-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selfServiceActiveTab === 'history'
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Career Timeline
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                
                {/* TAB: Personal Details */}
                {selfServiceActiveTab === 'personal' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="flex justify-between items-center border-b border-neutral-border pb-2.5">
                      <h3 className="text-sm font-bold text-primary">Personal Particulars</h3>
                      {!isSelfServiceEditingProfile ? (
                        <button
                          onClick={() => {
                            setSelfServiceContactNumber(previewEmployee.contactNumber || '');
                            setSelfServiceEmergencyName(previewEmployee.emergencyContactName || '');
                            setSelfServiceEmergencyRelation(previewEmployee.emergencyContactRelation || '');
                            setSelfServiceEmergencyPhone(previewEmployee.emergencyContactPhone || '');
                            setIsSelfServiceEditingProfile(true);
                          }}
                          className="text-xs font-semibold text-primary hover:bg-primary/5 px-2.5 py-1 border border-primary/20 rounded cursor-pointer"
                        >
                          Request Profile Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsSelfServiceEditingProfile(false)}
                          className="text-xs font-semibold text-on-surface-variant hover:bg-surface-container px-2.5 py-1 border border-neutral-border rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {!isSelfServiceEditingProfile ? (
                      /* VIEW PERSONAL DETAILS */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                            <span className="text-outline text-[10px] uppercase font-bold block mb-1">NRIC / Passport Number</span>
                            <span className="font-mono font-bold text-on-surface">{previewEmployee.nricPassport || 'N/A'}</span>
                          </div>
                          <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                            <span className="text-outline text-[10px] uppercase font-bold block mb-1">Nationality</span>
                            <span className="font-semibold text-on-surface">{previewEmployee.nationality || 'Malaysian'}</span>
                          </div>
                          <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                            <span className="text-outline text-[10px] uppercase font-bold block mb-1">Date Joined</span>
                            <span className="font-mono font-semibold text-on-surface">{previewEmployee.dateOfJoined || 'N/A'}</span>
                          </div>
                          <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                            <span className="text-outline text-[10px] uppercase font-bold block mb-1">Employment Category</span>
                            <span className="font-bold text-primary uppercase">{previewEmployee.employmentType || 'Confirmation'}</span>
                          </div>
                        </div>

                        <div className="p-4 border border-neutral-border rounded-lg bg-zinc-50/50 space-y-3">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Verified Contact Information</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block mb-0.5">Corporate Email</span>
                              <span className="font-semibold text-on-surface-variant flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-outline" /> {previewEmployee.email}
                              </span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block mb-0.5">Personal Contact Phone</span>
                              <span className="font-mono font-bold text-primary flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-primary" /> {previewEmployee.contactNumber || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 border border-neutral-border rounded-lg bg-zinc-50/50 space-y-3">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Emergency Contact</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block">Contact Person</span>
                              <span className="font-bold text-on-surface">{previewEmployee.emergencyContactName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block">Relationship</span>
                              <span className="font-semibold text-on-surface-variant">{previewEmployee.emergencyContactRelation || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block">Emergency Phone</span>
                              <span className="font-mono font-bold text-primary">{previewEmployee.emergencyContactPhone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* EDIT PERSONAL DETAILS */
                      <form onSubmit={handleSimulateUpdate} className="space-y-4 text-left">
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary mb-4">
                          <span className="font-bold block mb-1">Interactive Self-Service Form Simulation</span>
                          <p className="text-[11px] leading-normal text-on-surface-variant">Editing fields below and clicking Save simulates how an employee submits updates to their profile. These updates write back directly to the primary Workforce Directory registry.</p>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Personal Contact Phone *</label>
                            <input
                              type="text"
                              required
                              value={selfServiceContactNumber}
                              onChange={(e) => setSelfServiceContactNumber(e.target.value)}
                              className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>

                          <div className="border-t border-neutral-border pt-3 mt-3">
                            <span className="text-[10px] font-bold text-primary uppercase block mb-2">Simulate Emergency Contact Updates</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Emergency Contact Person</label>
                                <input
                                  type="text"
                                  required
                                  value={selfServiceEmergencyName}
                                  onChange={(e) => setSelfServiceEmergencyName(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Relationship</label>
                                <input
                                  type="text"
                                  required
                                  value={selfServiceEmergencyRelation}
                                  onChange={(e) => setSelfServiceEmergencyRelation(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Emergency Phone</label>
                                <input
                                  type="text"
                                  required
                                  value={selfServiceEmergencyPhone}
                                  onChange={(e) => setSelfServiceEmergencyPhone(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-border flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsSelfServiceEditingProfile(false)}
                            className="px-4 py-2 bg-white border border-neutral-border hover:bg-surface-container rounded text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container cursor-pointer"
                          >
                            Save Employee Changes
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* TAB: Spouse & Dependants */}
                {selfServiceActiveTab === 'family' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="border-b border-neutral-border pb-2.5">
                      <h3 className="text-sm font-bold text-primary">Spouse & Dependant Registry</h3>
                    </div>

                    <div className="text-xs space-y-4">
                      <div className="flex justify-between items-center p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                        <span className="text-outline text-[10px] uppercase font-bold">Marital Status Status</span>
                        <span className="font-bold text-on-surface bg-white border border-neutral-border px-3 py-1 rounded flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-primary" /> {previewEmployee.maritalStatus}
                        </span>
                      </div>

                      {previewEmployee.maritalStatus === 'Married' && (
                        <div className="p-4 border border-neutral-border rounded-lg bg-zinc-50/50 space-y-3">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Spouse Details</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                            <div>
                              <span className="text-outline text-[9px] font-bold block">Spouse Name</span>
                              <span className="font-bold text-on-surface">{previewEmployee.spouseName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] font-bold block">Spouse NRIC</span>
                              <span className="font-mono font-semibold text-on-surface-variant">{previewEmployee.spouseNric || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] font-bold block">Spouse Employment Status</span>
                              <span className="font-semibold text-on-surface">{previewEmployee.spouseIsWorking === 'Yes' ? `Working at ${previewEmployee.spouseCompany}` : 'Not Working / Home-Maker'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewEmployee.maritalStatus !== 'Single' && (
                        <div className="p-4 border border-neutral-border rounded-lg bg-zinc-50/50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Dependants Registered</span>
                            <span className="font-bold text-primary bg-white border border-neutral-border px-2 py-0.5 rounded">Has Dependants: {previewEmployee.hasDependants || 'No'}</span>
                          </div>

                          {previewEmployee.hasDependants === 'Yes' && previewEmployee.dependants && previewEmployee.dependants.length > 0 ? (
                            <div className="bg-white border border-neutral-border rounded-md overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-surface-container-low border-b border-neutral-border text-[9px] uppercase text-on-surface-variant font-bold">
                                  <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2 w-20">Gender</th>
                                    <th className="p-2 w-24">DOB</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-border/40">
                                  {previewEmployee.dependants.map(dep => (
                                    <tr key={dep.id} className="hover:bg-zinc-50">
                                      <td className="p-2 font-bold text-on-surface">{dep.name}</td>
                                      <td className="p-2">{dep.gender}</td>
                                      <td className="p-2 font-mono">{dep.dob}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-[11px] italic text-on-surface-variant text-center py-2">No dependants listed on verified record.</p>
                          )}
                        </div>
                      )}

                      {previewEmployee.maritalStatus === 'Single' && (
                        <div className="p-6 text-center italic text-on-surface-variant bg-zinc-50 rounded-lg border border-dashed border-neutral-border/75">
                          Single status on record. No spouse or dependant compliance declarations are registered.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: Statutory & Banking */}
                {selfServiceActiveTab === 'financial' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="border-b border-neutral-border pb-2.5">
                      <h3 className="text-sm font-bold text-primary">Statutory & Bank Registries</h3>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                          <span className="text-outline text-[10px] uppercase font-bold block mb-1">Income Tax Number (TIN)</span>
                          <span className="font-mono font-bold text-on-surface">{previewEmployee.taxNumber || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                          <span className="text-outline text-[10px] uppercase font-bold block mb-1">EPF Member Number</span>
                          <span className="font-mono font-bold text-on-surface">{previewEmployee.epfNumber || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                          <span className="text-outline text-[10px] uppercase font-bold block mb-1">EPF Employee Contribution Rate</span>
                          <span className="font-mono font-bold text-primary">{previewEmployee.epfRateEmployee}%</span>
                        </div>
                        <div className="p-3 bg-surface-container-low border border-neutral-border/50 rounded">
                          <span className="text-outline text-[10px] uppercase font-bold block mb-1">EPF Employer Contribution Rate</span>
                          <span className="font-mono font-bold text-primary">{previewEmployee.epfRateEmployer}%</span>
                        </div>
                      </div>

                      <div className="p-4 border border-neutral-border rounded-lg bg-zinc-50/50 space-y-3">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Disbursement Bank Account</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-outline text-[9px] uppercase font-bold block mb-0.5">Bank Name</span>
                            <span className="font-bold text-on-surface">{previewEmployee.bankName}</span>
                          </div>
                          <div>
                            <span className="text-outline text-[9px] uppercase font-bold block mb-0.5">Account Number</span>
                            <span className="font-mono font-bold text-primary">{previewEmployee.accountNo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Career Timeline */}
                {selfServiceActiveTab === 'history' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="border-b border-neutral-border pb-2.5">
                      <h3 className="text-sm font-bold text-primary">My Career Progression Timeline</h3>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {previewEmployee.careerHistory && previewEmployee.careerHistory.length > 0 ? (
                        previewEmployee.careerHistory.map((item, index) => {
                          let badgeColor = "bg-blue-100 text-blue-700";
                          if (item.type === 'Status Change') badgeColor = "bg-amber-100 text-amber-700";
                          if (item.type === 'Salary Revision') badgeColor = "bg-green-100 text-green-700";
                          if (item.type === 'Promotion') badgeColor = "bg-purple-100 text-purple-700";

                          return (
                            <div key={item.id || index} className="relative pl-5 border-l-2 border-neutral-border/60 text-xs text-left">
                              <div className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                              
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-on-surface text-[11px]">{item.type}</span>
                                <span className="text-[10px] text-outline font-mono">{item.date}</span>
                              </div>
                              
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded my-1.5 ${badgeColor}`}>
                                {item.previousValue} → {item.newValue}
                              </span>
                              
                              <p className="text-on-surface-variant text-[10px] leading-tight italic bg-zinc-50 p-2 rounded border border-zinc-100 mt-0.5">
                                {item.notes}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs italic text-on-surface-variant text-center py-4">No previous progression events logged in the system.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Right Column: Payslip & Compensation History (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            
            {/* Compensation Summary Panel */}
            <div className="bg-white border border-neutral-border rounded-lg p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b border-neutral-border pb-2">
                <DollarSign className="w-4 h-4 text-primary" /> Compensation Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-outline text-[9px] font-bold uppercase block mb-0.5">Basic Monthly Salary</span>
                  <span className="font-mono text-sm font-bold text-on-surface">RM {previewEmployee.basicSalary.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-outline text-[9px] font-bold uppercase block mb-0.5">Accommodation Allowance</span>
                  <span className="font-mono text-sm font-bold text-on-surface">RM {(previewEmployee.housingAllowance || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-outline text-[9px] font-bold uppercase block mb-0.5">Transport Allowance</span>
                  <span className="font-mono text-sm font-bold text-on-surface">RM {(previewEmployee.transportAllowance || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-outline text-[9px] font-bold uppercase block mb-0.5">Estimated Net Pay</span>
                  <span className="font-mono text-sm font-bold text-primary">RM {payslipBreakdown.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 border border-neutral-border rounded text-[11px] text-on-surface-variant leading-relaxed">
                <span className="font-bold text-primary block mb-0.5">Compliance Standard Enforced</span>
                Your salary and allowances are subject to standard Malaysian statutory deductions (EPF, SOCSO, EIS, and Income Tax PCB).
              </div>
            </div>

            {/* Payslip History Panel */}
            <div className="bg-white border border-neutral-border rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 bg-surface-container-low border-b border-neutral-border">
                <h3 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> My Payslip History
                </h3>
              </div>

              <div className="divide-y divide-neutral-border/50">
                {['October 2026', 'September 2026', 'August 2026'].map((month, idx) => {
                  return (
                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-zinc-50/50 transition-colors">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-on-surface block">{month}</span>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                          <span className="font-mono">Disbursed: 28th</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-primary">RM {payslipBreakdown.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setViewingPayslipMonth(month);
                          setPayslipZoom(100);
                          setPayslipRotation(0);
                        }}
                        className="bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Payslip
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Request History */}
            <div className="bg-white border border-neutral-border rounded-lg p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b border-neutral-border pb-2">
                <Users className="w-4 h-4 text-primary" /> Administrative Requests
              </h3>
              
              <div className="space-y-2.5">
                <div className="p-3 border border-neutral-border rounded-md bg-zinc-50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-on-surface block">Annual Leave (2 Days)</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">Date: 2026-06-20 · Approved</span>
                  </div>
                  <span className="bg-green-100 text-green-700 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                </div>

                <div className="p-3 border border-neutral-border rounded-md bg-zinc-50 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-on-surface block">Medical Allowance Claim</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">Date: 2026-06-15 · Under Review</span>
                  </div>
                  <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onShowNotification('Leave Calendar', `Please switch to Leave Management tab or use sidebar commands to submit real administrative leaves.`)}
                className="w-full bg-primary/5 text-primary hover:bg-primary/10 border border-primary/25 text-xs font-semibold py-2 rounded text-center transition-all cursor-pointer"
              >
                Submit New Request
              </button>
            </div>

          </div>

        </div>

        {/* HIGH-FIDELITY INTERACTIVE INLINE PAYSLIP MODAL */}
        {viewingPayslipMonth && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150 text-left">
            <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
              
              {/* Modal Toolbar Header */}
              <div className="h-14 bg-zinc-900 flex items-center justify-between px-4 shadow-md z-10 shrink-0 select-none">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setViewingPayslipMonth(null)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                    title="Close"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col text-left">
                    <span className="text-white text-xs font-semibold truncate max-w-[200px] md:max-w-[400px]">
                      {viewingPayslipMonth.replace(/\s+/g, '_')}_Payslip_{previewEmployee.name.replace(/\s+/g, '_')}.pdf
                    </span>
                    <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">
                      {activeSub.name}
                    </span>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="hidden md:flex items-center gap-3 bg-black/20 rounded px-2.5 py-1">
                  <button 
                    onClick={() => payslipZoom > 70 && setPayslipZoom(p => p - 10)}
                    className="text-white hover:bg-white/10 p-1 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white text-xs font-bold px-2 w-[45px] text-center">{payslipZoom}%</span>
                  <button 
                    onClick={() => payslipZoom < 150 && setPayslipZoom(p => p + 10)}
                    className="text-white hover:bg-white/10 p-1 rounded transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPayslipRotation(p => (p + 90) % 360)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      onShowNotification('Print Job Sent', `Sending ${viewingPayslipMonth}_Payslip to configured printer.`);
                      window.print();
                    }}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={async () => {
                      onShowNotification('Download Started', `Preparing PDF export...`);
                      const element = document.getElementById('self-service-pdf-content');
                      if (!element) {
                        onShowNotification('Error', 'Failed to find payslip document container.');
                        return;
                      }
                      try {
                        const originalTransform = element.style.transform;
                        const originalTransition = element.style.transition;
                        element.style.transform = 'none';
                        element.style.transition = 'none';

                        const canvas = await html2canvas(element, {
                          scale: 2,
                          useCORS: true,
                          backgroundColor: '#ffffff',
                          logging: false
                        });

                        element.style.transform = originalTransform;
                        element.style.transition = originalTransition;

                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF({
                          orientation: 'portrait',
                          unit: 'mm',
                          format: 'a4'
                        });

                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const imgWidth = canvas.width;
                        const imgHeight = canvas.height;
                        const ratio = imgWidth / pdfWidth;
                        const imgHeightInPdf = imgHeight / ratio;

                        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeightInPdf);
                        const fileName = `${viewingPayslipMonth.replace(/\s+/g, '_')}_Payslip_${previewEmployee.name.replace(/\s+/g, '_')}.pdf`;
                        pdf.save(fileName);
                        onShowNotification('Download Complete', `${fileName} saved successfully.`);
                      } catch (error) {
                        console.error(error);
                        onShowNotification('Error', 'PDF render error.');
                      }
                    }}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer" 
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Canvas (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start bg-neutral-100">
                
                {/* A4 Payslip Page Container */}
                <div 
                  id="self-service-pdf-content"
                  style={{ 
                    transform: `scale(${payslipZoom / 100}) rotate(${payslipRotation}deg)`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="bg-white w-full max-w-[800px] min-h-[960px] shadow-2xl my-4 p-8 md:p-12 border border-neutral-border text-left relative"
                >
                  <div className="absolute top-2 right-4 text-[9px] text-on-surface-variant/30 font-mono select-none">
                    ACME-CONFIDENTIAL-STRICTLY-PRIVATE
                  </div>

                  {/* Payslip Branding Header */}
                  <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-6">
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-14 h-14 rounded-lg bg-white border border-neutral-border/40 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {activeSub.logoUrl ? (
                          <img src={activeSub.logoUrl} alt={activeSub.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 className="w-7 h-7 text-primary" />
                        )}
                      </div>

                      <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight font-sans">
                          {activeSub.name}
                        </h1>
                        <p className="text-[10px] text-on-surface-variant font-mono font-semibold">
                          Co. Reg: {activeSub.registrationNumber}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-[400px]">
                          {activeSub.address}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <h2 className="text-lg font-bold text-primary-container uppercase tracking-widest font-sans">Payslip</h2>
                      <p className="text-sm text-on-surface mt-1 font-medium">{viewingPayslipMonth}</p>
                    </div>
                  </div>

                  {/* Employee Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-surface-container-low p-4 border border-neutral-border rounded text-xs leading-relaxed">
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">Employee Name</p>
                      <p className="text-on-surface font-semibold text-sm">{previewEmployee.name}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">Email Address</p>
                      <p className="text-on-surface font-semibold text-sm truncate" title={previewEmployee.email}>{previewEmployee.email}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">Department</p>
                      <p className="text-on-surface font-semibold text-sm">{previewEmployee.department}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">Designation</p>
                      <p className="text-on-surface font-semibold text-sm">{previewEmployee.designation}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">TIN / Tax Number</p>
                      <p className="text-on-surface font-semibold text-sm font-mono">{previewEmployee.taxNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">EPF Member Number</p>
                      <p className="text-on-surface font-semibold text-sm font-mono">{previewEmployee.epfNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">NRIC / Passport</p>
                      <p className="text-on-surface font-semibold text-sm font-mono">{previewEmployee.nricPassport || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant mb-1 font-medium">Bank Account</p>
                      <p className="text-on-surface font-semibold text-sm font-mono">{previewEmployee.bankName} - {previewEmployee.accountNo}</p>
                    </div>
                  </div>

                  {/* Financial Data Table split */}
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Earnings Table */}
                    <div>
                      <h3 className="text-base text-primary font-bold mb-4 border-b border-neutral-border pb-2">
                        Earnings & Additions
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-outline-variant/30">
                            <td className="py-2 text-on-surface text-left">{getPayslipLabel(previewEmployee.employmentType)}</td>
                            <td className="py-2 text-right text-on-surface font-mono">RM {previewEmployee.basicSalary.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>

                          {/* Allowances */}
                          {(previewEmployee.allowanceGeneral || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">General Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {(previewEmployee.allowanceGeneral || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.allowanceTransport !== undefined ? previewEmployee.allowanceTransport : previewEmployee.transportAllowance) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Transport Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {Number(previewEmployee.allowanceTransport !== undefined ? previewEmployee.allowanceTransport : previewEmployee.transportAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.allowanceParking || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Parking Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {(previewEmployee.allowanceParking || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.allowanceMeal || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Meal Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {(previewEmployee.allowanceMeal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.allowanceAccommodation !== undefined ? previewEmployee.allowanceAccommodation : previewEmployee.housingAllowance) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Accommodation Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {Number(previewEmployee.allowanceAccommodation !== undefined ? previewEmployee.allowanceAccommodation : previewEmployee.housingAllowance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.allowancePhone || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Phone Allowance</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {(previewEmployee.allowancePhone || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}

                          {previewEmployee.overtime > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Overtime</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {previewEmployee.overtime.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}

                          {/* Supplemental Payments */}
                          {((previewEmployee.bonusAmount !== undefined ? previewEmployee.bonusAmount : previewEmployee.performanceBonus) || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">Performance Bonus</td>
                              <td className="py-2 text-right text-on-surface font-mono">RM {Number(previewEmployee.bonusAmount !== undefined ? previewEmployee.bonusAmount : previewEmployee.performanceBonus).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          {(previewEmployee.commissionAmount || 0) > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left font-mono">Commissions</td>
                              <td className="py-2 text-right text-on-surface">RM {(previewEmployee.commissionAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}

                          <tr className="font-bold text-primary">
                            <td className="py-3 text-on-surface text-left font-bold">Total Earnings & Additions</td>
                            <td className="py-3 text-right font-mono">RM {(payslipBreakdown.grossEarnings + payslipBreakdown.reimbursementsSum).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions Table */}
                    <div>
                      <h3 className="text-base text-primary font-bold mb-4 border-b border-neutral-border pb-2">
                        Deductions
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-outline-variant/30">
                            <td className="py-2 text-on-surface text-left">EPF (Employee {previewEmployee.epfRateEmployee}%)</td>
                            <td className="py-2 text-right text-error font-mono">RM {payslipBreakdown.epfEmployeeValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="border-b border-outline-variant/30">
                            <td className="py-2 text-on-surface text-left">SOCSO</td>
                            <td className="py-2 text-right text-error font-mono">RM {(previewEmployee.socsoEmployee || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>
                          {skbbkEmployeeVal > 0 && (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-2 text-on-surface text-left">SOCSO (SKBBK)</td>
                              <td className="py-2 text-right text-error font-mono">RM {skbbkEmployeeVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            </tr>
                          )}
                          <tr className="border-b border-outline-variant/30">
                            <td className="py-2 text-on-surface text-left">EIS</td>
                            <td className="py-2 text-right text-error font-mono">RM {(previewEmployee.eisEmployee || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="border-b border-outline-variant/30">
                            <td className="py-2 text-on-surface text-left">Income Tax (PCB)</td>
                            <td className="py-2 text-right text-error font-mono">RM {(previewEmployee.taxPcb || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>

                          <tr className="font-bold text-error">
                            <td className="py-3 text-on-surface text-left font-bold">Total Deductions</td>
                            <td className="py-3 text-right font-mono">RM {payslipBreakdown.totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Employer Contributions Info Only */}
                  <div className="mb-12 bg-surface-container-low p-4 border border-neutral-border rounded text-xs space-y-3">
                    <h3 className="font-bold text-on-surface-variant uppercase tracking-wider">
                      Employer Contributions (Not paid to employee)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono font-medium text-on-surface">
                      <div>
                        <span className="text-on-surface-variant text-[10px] uppercase block mb-1">EPF ({previewEmployee.epfRateEmployer}%)</span>
                        <span>RM {Math.round(previewEmployee.basicSalary * previewEmployee.epfRateEmployer / 100).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant text-[10px] uppercase block mb-1">SOCSO</span>
                        <span>RM {previewEmployee.socsoEmployer.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                      {skbbkEmployerVal > 0 && (
                        <div>
                          <span className="text-on-surface-variant text-[10px] uppercase block mb-1">SOCSO (SKBBK)</span>
                          <span>RM {skbbkEmployerVal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-on-surface-variant text-[10px] uppercase block mb-1">EIS</span>
                        <span>RM {previewEmployee.eisEmployer.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay and signature footer */}
                  <div className="border-t-2 border-primary-container pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div className="text-xs text-on-surface-variant space-y-1">
                      <p className="font-medium">This is a computer generated document. No signature is required.</p>
                      <p>Generated on: 28 Oct 2026, 09:41 AM</p>
                      <p>Security hash: <span className="font-mono text-[10px]">SHA256:7a90b4cf22...</span></p>
                    </div>
                    <div className="text-right bg-primary-container/5 px-6 py-4 rounded border border-primary-container/20 min-w-[200px]">
                      <p className="text-xs text-primary-container font-bold uppercase tracking-widest mb-1">Net Pay</p>
                      <p className="text-2xl font-bold text-on-surface font-mono">
                        RM {payslipBreakdown.netPay.toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-neutral-border flex justify-end bg-surface-container-low shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingPayslipMonth(null)}
                  className="px-5 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
                >
                  Close Payslip View
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-background tracking-tight">Workforce Directory</h1>
          <p className="text-on-surface-variant mt-1">Manage personnel compliance details, NRIC database, and track career progression history.</p>
        </div>
        
        {/* Mode Switcher Toggle Block inside Administrative Mode */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-surface-container border border-neutral-border rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('admin')}
              className="px-3 py-1.5 rounded bg-primary text-[#f7f0e0] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" /> HR Admin
            </button>
            <button
              onClick={() => {
                setViewMode('self-service');
                // Auto-select first employee to begin simulation
                const sarah = employees.find(e => e.id === 'EMP-84729') || employees[0];
                if (sarah) {
                  setPreviewEmployeeId(sarah.id);
                  setSelfServiceContactNumber(sarah.contactNumber || '');
                  setSelfServiceEmergencyName(sarah.emergencyContactName || '');
                  setSelfServiceEmergencyRelation(sarah.emergencyContactRelation || '');
                  setSelfServiceEmergencyPhone(sarah.emergencyContactPhone || '');
                }
              }}
              className="px-3 py-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Self-Service View
            </button>
          </div>

          <button 
            onClick={handleOpenAddModal}
            className="bg-primary text-[#f7f0e0] text-xs font-semibold py-2 px-4 rounded shadow-sm hover:bg-primary-container transition-colors flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add New Employee
          </button>
        </div>
      </div>

      {/* Directory Content Table Card */}
      <div className="bg-white border border-neutral-border rounded-lg shadow-sm overflow-hidden">
        
        {employees.length === 0 ? (
          <div className="p-12 text-center bg-white space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">No Employee Records Found</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-1">
                {entities.length === 0 
                  ? "You need to register at least one Corporate Subsidiary in the 'Subsidiaries' view before you can enroll employees."
                  : "Your workforce directory is empty. Register your first employee to get started."}
              </p>
            </div>
            {entities.length > 0 && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-[#f7f0e0] font-bold text-xs rounded hover:bg-primary-dark transition-all shadow-xs cursor-pointer mx-auto"
              >
                <UserPlus className="w-4 h-4" /> Register New Employee
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Complex Filters Panel */}
            <div className="p-4 bg-surface-container-low border-b border-neutral-border flex flex-col md:flex-row gap-4 items-center justify-between text-sm">
              
              <div className="flex flex-wrap flex-1 gap-3 w-full">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-outline" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Employee name, email, NRIC, or ID..."
                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-neutral-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                {/* Department select */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="rounded border border-neutral-border bg-white p-1.5 text-xs outline-none"
                >
                  <option>All Departments</option>
                  <option>Product & Engineering</option>
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>Human Resources</option>
                </select>

                {/* Subsidiary select */}
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="rounded border border-primary/30 bg-white p-1.5 text-xs outline-none font-semibold text-primary"
                >
                  <option value="All Subsidiaries">All Subsidiaries</option>
                  {entities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                  ))}
                </select>

                {/* Status select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-neutral-border bg-white p-1.5 text-xs outline-none"
                >
                  <option>All Statuses</option>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Terminated</option>
                  <option>Suspended</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-on-surface-variant shrink-0">
                Directory Registry count: <span className="text-primary font-bold">{filteredEmployees.length} personnel found</span>
              </div>
            </div>

            {/* Directory spreadsheet grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-neutral-border text-on-surface-variant font-bold uppercase tracking-wider select-none">
                    <th className="p-4">Personnel Info</th>
                    <th className="p-4">Subsidiary</th>
                    <th className="p-4">Type & NRIC/Passport</th>
                    <th className="p-4">Department & Designation</th>
                    <th className="p-4">Salary Base (RM)</th>
                    <th className="p-4">Date of Joined</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Administrative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border/50">
                  {filteredEmployees.map((emp) => {
                    const isActive = emp.status === 'Active';
                    const isOnLeave = emp.status === 'On Leave';
                    const isSuspended = emp.status === 'Suspended';
                    
                    return (
                      <tr 
                        key={emp.id} 
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setIsDetailOpen(true);
                        }}
                        className={`hover:bg-surface-container/60 transition-colors cursor-pointer ${selectedEmployeeId === emp.id ? 'bg-surface-container-low border-l-4 border-primary' : ''}`}
                      >
                        
                        {/* Column 1: Personnel Info */}
                        <td className="p-4 flex items-center gap-3">
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.name} className="w-9 h-9 rounded-full object-cover border border-neutral-border shadow-xs" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-on-surface">{emp.name}</div>
                            <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-outline" /> {emp.email}
                            </div>
                          </div>
                        </td>



                        {/* Column 2b: Subsidiary */}
                        <td className="p-4">
                          <span className="font-semibold text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded shadow-xs block w-fit truncate max-w-[140px]" title={entities.find(e => e.id === emp.entityId)?.name || emp.entityId}>
                            {entities.find(e => e.id === emp.entityId)?.name || emp.entityId}
                          </span>
                        </td>

                        {/* Column 3: Type & NRIC */}
                        <td className="p-4">
                          <span className="text-[10px] font-bold text-secondary uppercase bg-surface-container-high px-1.5 py-0.5 rounded block w-fit mb-1">
                            {emp.employmentType || 'Full-Time'}
                          </span>
                          <div className="font-mono text-xs font-semibold text-on-surface">{emp.nricPassport || 'N/A'}</div>
                        </td>

                        {/* Column 4: Department */}
                        <td className="p-4">
                          <div className="font-semibold text-on-surface">{emp.designation}</div>
                          <div className="text-[10px] text-on-surface-variant mt-0.5">{emp.department}</div>
                        </td>

                        {/* Column 5: Base Salary */}
                        <td className="p-4 font-mono font-semibold text-primary">
                          RM {emp.basicSalary.toLocaleString()}
                        </td>

                        {/* Column 6: Date Joined */}
                        <td className="p-4 text-on-surface-variant font-mono">
                          {emp.dateOfJoined || 'N/A'}
                        </td>

                        {/* Column 7: Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isActive 
                              ? 'bg-green-100 text-green-700' 
                              : isOnLeave 
                              ? 'bg-amber-100 text-amber-700' 
                              : isSuspended 
                              ? 'bg-zinc-100 text-zinc-600'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-green-600' : isOnLeave ? 'bg-amber-500' : isSuspended ? 'bg-zinc-400' : 'bg-red-600'
                            }`} />
                            {emp.status}
                          </span>
                        </td>

                        {/* Column 8: Delete / Admin */}
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setSelectedEmployeeId(emp.id);
                                setIsDetailOpen(true);
                              }}
                              className="text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors text-xs font-semibold cursor-pointer"
                            >
                              View Details
                            </button>
                            <button 
                              onClick={() => handleDelete(emp.id, emp.name)}
                              className="text-error hover:text-red-700 hover:bg-error/10 p-1.5 rounded transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                              title="Remove Employee"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length === 0 && (
              <div className="p-12 text-center text-on-surface-variant">
                <Users className="w-12 h-12 text-outline mx-auto mb-4 opacity-50" />
                <h4 className="font-bold text-sm">No Employees Found</h4>
                <p className="text-xs text-outline mt-1">Try adjusting your filters or search criteria.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interactive Detail Panel & Career Progression History */}
      {isDetailOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-primary text-[#f7f0e0]">
              <div className="flex items-center gap-3">
                <div className="relative group shrink-0 w-12 h-12">
                  {selectedEmployee.avatarUrl ? (
                    <img src={selectedEmployee.avatarUrl} alt={selectedEmployee.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-lg">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  {/* Photo Edit overlay */}
                  <label className="absolute inset-0 w-full h-full rounded-full bg-black/55 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[7px] text-white font-extrabold uppercase tracking-wider">Change</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleDetailAvatarChange(selectedEmployee.id, e)} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight leading-none text-[#f7f0e0]">{selectedEmployee.name}</h3>
                  <p className="text-xs text-[#f7f0e0]/70 mt-1">{selectedEmployee.designation}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDetailOpen(false);
                  setIsEditingGeneralInfo(false);
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5 text-[#f7f0e0]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-border text-left">
              
              {/* Left Column: Comprehensive Compliance Profile */}
              <div className="lg:col-span-7 p-6 space-y-6">
                
                {/* Section title */}
                <div className="border-b border-neutral-border pb-3 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" /> Statutory Compliance & Personal Profile
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {isEditingGeneralInfo ? 'Edit corporate personnel registration details.' : 'Verified corporate personnel registration details.'}
                    </p>
                  </div>
                  {!isEditingGeneralInfo ? (
                    <button 
                      type="button"
                      onClick={handleStartEditGeneralInfo}
                      className="bg-primary text-[#f7f0e0] hover:bg-primary-container px-3 py-1.5 rounded transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      Edit Employee Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setIsEditingGeneralInfo(false)}
                        className="text-on-surface-variant hover:bg-surface-container px-3 py-1.5 rounded transition-colors text-xs font-semibold cursor-pointer border border-neutral-border"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={handleSaveGeneralInfoUpdates}
                        className="bg-primary text-[#f7f0e0] hover:opacity-95 px-3 py-1.5 rounded transition-colors text-xs font-semibold cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingGeneralInfo ? (
                  <>
                    {/* Primary Data Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      
                      {/* Row 1 */}
                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">NRIC / Passport Number</div>
                        <div className="font-mono text-sm font-semibold text-on-surface">{selectedEmployee.nricPassport || 'N/A'}</div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Nationality</div>
                        <div className="font-semibold text-sm text-on-surface flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-primary" /> {selectedEmployee.nationality || 'Malaysian'}
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Contact Number</div>
                        <div className="font-mono text-sm font-semibold text-on-surface flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-primary" /> {selectedEmployee.contactNumber || 'N/A'}
                        </div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Income Tax Number</div>
                        <div className="font-mono text-sm font-semibold text-on-surface">{selectedEmployee.taxNumber || 'N/A'}</div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">EPF Member Number</div>
                        <div className="font-mono text-sm font-semibold text-on-surface">{selectedEmployee.epfNumber || 'N/A'}</div>
                      </div>

                      {/* Row 3 */}
                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Type of Employment</div>
                        <div className="font-semibold text-sm text-primary uppercase">{selectedEmployee.employmentType || 'Full-Time'}</div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Marital Status</div>
                        <div className="font-semibold text-sm text-on-surface flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-primary" /> {selectedEmployee.maritalStatus || 'Single'}
                        </div>
                      </div>

                      {/* Row 4 */}
                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Date of Joined</div>
                        <div className="font-mono text-sm font-semibold text-on-surface flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" /> {selectedEmployee.dateOfJoined || 'N/A'}
                        </div>
                      </div>

                      <div className="p-3 bg-surface-container-low rounded border border-neutral-border">
                        <div className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider mb-0.5">Payroll Registry Status</div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            selectedEmployee.status === 'Active' 
                              ? 'bg-green-100 text-green-700' 
                              : selectedEmployee.status === 'On Leave'
                              ? 'bg-amber-100 text-amber-700'
                              : selectedEmployee.status === 'Suspended'
                              ? 'bg-zinc-100 text-zinc-600'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedEmployee.status}
                          </span>
                        </div>
                      </div>

                      {/* Row 5: Subsidiary Mapping */}
                      <div className="p-3 bg-primary/5 rounded border border-primary/20 sm:col-span-2">
                        <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-0.5">Corporate Subsidiary / Entity</div>
                        <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                          <span className="bg-primary text-[#f7f0e0] text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">OFFICIAL REGISTER</span>
                          {entities.find(e => e.id === selectedEmployee.entityId)?.name || selectedEmployee.entityId}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts Card */}
                    <div className="p-4 bg-zinc-50 border border-neutral-border rounded-lg space-y-3">
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-error" /> EMERGENCY CONTACT INFORMATION
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-outline text-[10px] block font-bold">Contact Person Name</span>
                          <span className="font-bold text-on-surface">{selectedEmployee.emergencyContactName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-outline text-[10px] block font-bold">Relationship</span>
                          <span className="font-semibold text-on-surface-variant">{selectedEmployee.emergencyContactRelation || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-outline text-[10px] block font-bold">Contact Phone Number</span>
                          <span className="font-mono font-bold text-primary">{selectedEmployee.emergencyContactPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Baseline Information */}
                    <div className="p-4 border border-neutral-border rounded-lg bg-surface-container-low/30 space-y-3">
                      <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-primary" /> BASELINE COMPENSATION STRUCTURE
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-outline text-[9px] block uppercase font-bold">Basic Monthly Base</span>
                          <span className="font-mono font-bold text-sm text-primary">RM {selectedEmployee.basicSalary.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-outline text-[9px] block uppercase font-bold">Housing Allowance</span>
                          <span className="font-mono text-on-surface">RM {selectedEmployee.housingAllowance.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-outline text-[9px] block uppercase font-bold">Transport Allowance</span>
                          <span className="font-mono text-on-surface">RM {selectedEmployee.transportAllowance.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-outline text-[9px] block uppercase font-bold">Statutory Tax PCB</span>
                          <span className="font-mono text-on-surface">RM {selectedEmployee.taxPcb.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* General Details Section */}
                    <div className="bg-neutral-50 p-4 border border-neutral-border rounded-lg space-y-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Corporate & Personal Particulars</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Employee Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Email Address</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Role / Designation</label>
                          <input
                            type="text"
                            value={editDesignation}
                            onChange={(e) => setEditDesignation(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Department</label>
                          <select
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          >
                            <option value="Engineering">Engineering</option>
                            <option value="Product">Product</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Operations">Operations</option>
                            <option value="HR">HR</option>
                            <option value="Finance">Finance</option>
                            <option value="Legal">Legal</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Corporate Subsidiary</label>
                          <select
                            value={editEntityId}
                            onChange={(e) => setEditEntityId(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          >
                            {entities.map(ent => (
                              <option key={ent.id} value={ent.id}>{ent.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          >
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Terminated">Terminated</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">NRIC / Passport</label>
                          <input
                            type="text"
                            value={editNricPassport}
                            onChange={(e) => setEditNricPassport(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Nationality</label>
                          <input
                            type="text"
                            value={editNationality}
                            onChange={(e) => setEditNationality(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Contact Number</label>
                          <input
                            type="text"
                            value={editContactNumber}
                            onChange={(e) => setEditContactNumber(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Employment Type</label>
                          <select
                            value={editEmploymentType}
                            onChange={(e) => setEditEmploymentType(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          >
                            <option value="Confirmation">Confirmation</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Independent Contractor / Freelance">Independent Contractor / Freelance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Date Joined</label>
                          <input
                            type="date"
                            value={editDateOfJoined}
                            onChange={(e) => setEditDateOfJoined(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial & Allowances Details Section */}
                    <div className="bg-neutral-50 p-4 border border-neutral-border rounded-lg space-y-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Baseline Compensation & Allowances</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Basic Monthly Base (RM)</label>
                          <input
                            type="number"
                            value={editBasicSalary}
                            onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Housing Allowance (RM)</label>
                          <input
                            type="number"
                            value={editHousingAllowance}
                            onChange={(e) => setEditHousingAllowance(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Transport Allowance (RM)</label>
                          <input
                            type="number"
                            value={editTransportAllowance}
                            onChange={(e) => setEditTransportAllowance(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">General Allowance (RM)</label>
                          <input
                            type="number"
                            value={editAllowanceGeneral}
                            onChange={(e) => setEditAllowanceGeneral(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Parking Allowance (RM)</label>
                          <input
                            type="number"
                            value={editAllowanceParking}
                            onChange={(e) => setEditAllowanceParking(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Meal Allowance (RM)</label>
                          <input
                            type="number"
                            value={editAllowanceMeal}
                            onChange={(e) => setEditAllowanceMeal(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Phone Allowance (RM)</label>
                          <input
                            type="number"
                            value={editAllowancePhone}
                            onChange={(e) => setEditAllowancePhone(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Tax PCB override (RM)</label>
                          <input
                            type="number"
                            value={editTaxPcb}
                            onChange={(e) => setEditTaxPcb(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Employee EPF Rate (%)</label>
                          <input
                            type="number"
                            value={editEpfRateEmployee}
                            onChange={(e) => setEditEpfRateEmployee(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Employer EPF Rate (%)</label>
                          <input
                            type="number"
                            value={editEpfRateEmployer}
                            onChange={(e) => setEditEpfRateEmployer(Number(e.target.value))}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={editBankName}
                            onChange={(e) => setEditBankName(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Bank Account Number</label>
                          <input
                            type="text"
                            value={editAccountNo}
                            onChange={(e) => setEditAccountNo(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts Section */}
                    <div className="bg-neutral-50 p-4 border border-neutral-border rounded-lg space-y-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Emergency Contacts</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Person Name</label>
                          <input
                            type="text"
                            value={editEmergencyContactName}
                            onChange={(e) => setEditEmergencyContactName(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Relationship</label>
                          <input
                            type="text"
                            value={editEmergencyContactRelation}
                            onChange={(e) => setEditEmergencyContactRelation(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editEmergencyContactPhone}
                            onChange={(e) => setEditEmergencyContactPhone(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Spouse & Dependants Registry Card */}
                <div className="p-4 border border-neutral-border rounded-lg bg-surface-container-low/35 space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-border/50 pb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" /> Spouse & Dependant Compliance Registry
                    </h4>
                    {!isEditingFamily ? (
                      <button 
                        type="button"
                        onClick={handleStartEditFamily}
                        className="text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors text-xs font-semibold cursor-pointer border border-primary/20"
                      >
                        Edit Family Info
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setIsEditingFamily(false)}
                          className="text-on-surface-variant hover:bg-surface-container px-2 py-1 rounded transition-colors text-xs font-semibold cursor-pointer border border-neutral-border"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveFamilyUpdates}
                          className="bg-primary text-white hover:bg-primary-container px-2 py-1 rounded transition-colors text-xs font-semibold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingFamily ? (
                    /* VIEW MODE */
                    <div className="space-y-4 text-xs">
                      {/* Marital Status and summary */}
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Marital Status Status</span>
                        <span className="font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded flex items-center gap-1">
                          <Heart className="w-3 h-3 text-primary fill-primary" /> {selectedEmployee.maritalStatus || 'Single'}
                        </span>
                      </div>

                      {/* For Independent Contractor or freelancer, display statutory eligibility */}
                      {selectedEmployee.employmentType === 'Independent Contractor / Freelance' && (
                        <div className="flex justify-between items-center border border-primary/20 bg-primary/5 p-2 rounded-md">
                          <span className="text-primary font-bold text-[10px] uppercase tracking-wider">Eligible for Statutory Payment?</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                            selectedEmployee.eligibleForStatutory === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {selectedEmployee.eligibleForStatutory === 'Yes' ? 'Yes (Y)' : 'No (N)'}
                          </span>
                        </div>
                      )}

                      {/* Married -> Spouse Details */}
                      {selectedEmployee.maritalStatus === 'Married' ? (
                        <div className="p-3 bg-white border border-neutral-border/60 rounded-md space-y-2">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5" /> Spouse Details
                          </span>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block">Spouse Name</span>
                              <span className="font-semibold text-on-surface">{selectedEmployee.spouseName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-outline text-[9px] uppercase font-bold block">Spouse NRIC</span>
                              <span className="font-mono font-semibold text-on-surface">{selectedEmployee.spouseNric || 'N/A'}</span>
                            </div>
                            <div className="col-span-2 border-t border-neutral-border/30 pt-1.5 mt-1">
                              <span className="text-outline text-[9px] uppercase font-bold block mb-0.5">Employment Status</span>
                              <span className={`inline-block font-bold px-1.5 py-0.25 rounded text-[10px] ${
                                selectedEmployee.spouseIsWorking === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                {selectedEmployee.spouseIsWorking === 'Yes' ? 'Working' : 'Not Working'}
                              </span>
                            </div>
                            {selectedEmployee.spouseIsWorking === 'Yes' && (
                              <>
                                <div>
                                  <span className="text-outline text-[9px] uppercase font-bold block">Company</span>
                                  <span className="font-semibold text-on-surface flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-outline shrink-0" /> {selectedEmployee.spouseCompany || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-outline text-[9px] uppercase font-bold block">Position Title</span>
                                  <span className="font-semibold text-on-surface-variant">{selectedEmployee.spousePosition || 'N/A'}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Married, Divorced, Widowed -> Dependants */}
                      {(selectedEmployee.maritalStatus === 'Married' || selectedEmployee.maritalStatus === 'Divorced' || selectedEmployee.maritalStatus === 'Widowed') ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">Has Dependants?</span>
                            <span className={`font-bold px-2 py-0.25 rounded text-[10px] ${
                              selectedEmployee.hasDependants === 'Yes' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {selectedEmployee.hasDependants === 'Yes' ? 'Yes' : 'No'}
                            </span>
                          </div>

                          {selectedEmployee.hasDependants === 'Yes' && (
                            <div className="bg-white border border-neutral-border/60 rounded-md overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-light border-b border-neutral-border text-[10px] uppercase text-on-surface-variant font-bold">
                                  <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2 w-20">Gender</th>
                                    <th className="p-2 w-24">DOB</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-border/30">
                                  {selectedEmployee.dependants && selectedEmployee.dependants.length > 0 ? (
                                    selectedEmployee.dependants.map((dep) => (
                                      <tr key={dep.id} className="hover:bg-neutral-light/20">
                                        <td className="p-2 font-semibold text-on-surface">{dep.name}</td>
                                        <td className="p-2">{dep.gender}</td>
                                        <td className="p-2 font-mono">{dep.dob}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={3} className="p-3 text-center italic text-on-surface-variant">
                                        No dependants listed
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Single */
                        <div className="p-3 bg-zinc-50 border border-neutral-border/40 rounded text-center text-on-surface-variant italic">
                          Single status. Spouse & Dependant details are not applicable for this profile category.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* EDIT MODE */
                    <div className="space-y-4 text-xs">
                      {/* Marital Status select */}
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Marital Status Status</label>
                        <select
                          value={editMaritalStatus} onChange={(e) => setEditMaritalStatus(e.target.value as any)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-semibold"
                        >
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>

                      {/* Statutory Numbers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Income Tax Number</label>
                          <input
                            type="text"
                            value={editTaxNumber}
                            onChange={(e) => setEditTaxNumber(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">EPF Member Number</label>
                          <input
                            type="text"
                            value={editEpfNumber}
                            onChange={(e) => setEditEpfNumber(e.target.value)}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>

                      {/* For Independent Contractor or freelancer, enable for section > Eligible for Statutory Payment ? (Y / N) */}
                      {selectedEmployee.employmentType === 'Independent Contractor / Freelance' && (
                        <div className="p-3 bg-primary/5 border border-primary/25 rounded-md space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <label className="block text-[10px] font-bold text-primary uppercase mb-1">
                            Eligible for Statutory Payment ? (Y / N)
                          </label>
                          <select
                            value={editEligibleForStatutory}
                            onChange={(e) => setEditEligibleForStatutory(e.target.value as 'Yes' | 'No')}
                            className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none font-semibold"
                          >
                            <option value="Yes">Yes (Y)</option>
                            <option value="No">No (N)</option>
                          </select>
                        </div>
                      )}

                      {/* Married -> Spouse Details */}
                      {editMaritalStatus === 'Married' && (
                        <div className="p-3 bg-primary/5 border border-primary/25 rounded-md space-y-3 animate-in fade-in duration-150">
                          <span className="text-xs font-bold text-primary block">Spouse Details Form</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Spouse Name</label>
                              <input 
                                type="text"
                                value={editSpouseName} onChange={(e) => setEditSpouseName(e.target.value)}
                                className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                placeholder="Name"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Spouse NRIC</label>
                              <input 
                                type="text"
                                value={editSpouseNric} onChange={(e) => setEditSpouseNric(e.target.value)}
                                className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                placeholder="NRIC"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Spouse Working?</label>
                              <select
                                value={editSpouseIsWorking} onChange={(e) => setEditSpouseIsWorking(e.target.value as any)}
                                className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none font-semibold"
                              >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                          </div>

                          {editSpouseIsWorking === 'Yes' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-primary/10 animate-in slide-in-from-top-1">
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Working Company</label>
                                <input 
                                  type="text"
                                  value={editSpouseCompany} onChange={(e) => setEditSpouseCompany(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                  placeholder="Company"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Position Title</label>
                                <input 
                                  type="text"
                                  value={editSpousePosition} onChange={(e) => setEditSpousePosition(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                  placeholder="Position"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Married, Divorced, Widowed -> Dependants */}
                      {(editMaritalStatus === 'Married' || editMaritalStatus === 'Divorced' || editMaritalStatus === 'Widowed') && (
                        <div className="p-3 bg-zinc-50 border border-neutral-border rounded-md space-y-3 animate-in fade-in duration-150">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">Do you have dependants?</span>
                            <select
                              value={editHasDependants} onChange={(e) => setEditHasDependants(e.target.value as any)}
                              className="bg-white border border-neutral-border rounded p-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>

                          {editHasDependants === 'Yes' && (
                            <div className="space-y-2 pt-2 border-t border-neutral-border/60">
                              <span className="text-[10px] font-bold text-primary uppercase block">Dependants (Max 10 Pax)</span>
                              
                              {editDependants.length > 0 ? (
                                <div className="border border-neutral-border/50 rounded overflow-hidden max-h-[140px] overflow-y-auto">
                                  <table className="w-full text-xs text-left bg-white">
                                    <thead className="bg-neutral-light border-b border-neutral-border text-[10px] text-on-surface-variant font-bold">
                                      <tr>
                                        <th className="p-1.5">Name</th>
                                        <th className="p-1.5 w-16">Gender</th>
                                        <th className="p-1.5 w-20">DOB</th>
                                        <th className="p-1.5 text-right w-10"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-border/30">
                                      {editDependants.map((dep) => (
                                        <tr key={dep.id} className="hover:bg-neutral-light/10">
                                          <td className="p-1.5 font-semibold text-on-surface">{dep.name}</td>
                                          <td className="p-1.5">{dep.gender}</td>
                                          <td className="p-1.5 font-mono">{dep.dob}</td>
                                          <td className="p-1.5 text-right">
                                            <button 
                                              type="button"
                                              onClick={() => handleRemoveDetailDependant(dep.id)}
                                              className="text-error hover:text-red-700 p-0.5 cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-[11px] italic text-on-surface-variant bg-white p-2 rounded border border-neutral-border/40 text-center">
                                  No dependants added yet. Specify fields below to add.
                                </div>
                              )}

                              {editDependants.length < 10 && (
                                <div className="bg-white p-2.5 rounded border border-neutral-border/40 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                    <div>
                                      <label className="block text-[8px] font-bold text-on-surface-variant uppercase mb-0.5">Name</label>
                                      <input 
                                        type="text"
                                        value={detailTempDepName} onChange={(e) => setDetailTempDepName(e.target.value)}
                                        placeholder="Sally"
                                        className="w-full bg-white border border-neutral-border rounded p-1 text-[10px] outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-on-surface-variant uppercase mb-0.5">Gender</label>
                                      <select
                                        value={detailTempDepGender} onChange={(e) => setDetailTempDepGender(e.target.value as any)}
                                        className="w-full bg-white border border-neutral-border rounded p-1 text-[10px] outline-none"
                                      >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] font-bold text-on-surface-variant uppercase mb-0.5">DOB</label>
                                      <input 
                                        type="date"
                                        value={detailTempDepDob} onChange={(e) => setDetailTempDepDob(e.target.value)}
                                        className="w-full bg-white border border-neutral-border rounded p-1 text-[10px] outline-none"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleAddDetailDependant}
                                    className="px-2.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold hover:bg-primary/20 transition-all cursor-pointer block ml-auto"
                                  >
                                    + Add Dependant ({editDependants.length}/10)
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Single status view inside edit */}
                      {editMaritalStatus === 'Single' && (
                        <div className="p-3 bg-zinc-100 border border-neutral-border/50 rounded text-center text-on-surface-variant italic">
                          Single status active. Spouse & Dependant details are bypassed.
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-2 border-t border-neutral-border/40 font-semibold">
                        <button 
                          type="button"
                          onClick={() => setIsEditingFamily(false)}
                          className="px-3 py-1.5 text-on-surface-variant hover:bg-surface-container rounded text-xs cursor-pointer border border-neutral-border"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveFamilyUpdates}
                          className="px-3 py-1.5 bg-primary text-white hover:bg-primary-container rounded text-xs cursor-pointer"
                        >
                          Save Family Registry
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Career Progression Form & Historic Timeline */}
              <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
                
                {/* Section 1: Change Employment Status (The Action) */}
                <div className="bg-surface-container-low border border-neutral-border p-4 rounded-lg space-y-4">
                  <div className="border-b border-neutral-border pb-2">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary" /> Log Career Progression & Status
                    </h4>
                    <p className="text-[10px] text-on-surface-variant">Update active status, promotion, transfers, or base salary revisions.</p>
                  </div>

                  <form onSubmit={handleProgressionSubmit} className="space-y-3 text-xs">
                    
                    {/* Progression Event Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Progression Event Type</label>
                      <select 
                        value={progressionType} 
                        onChange={(e) => {
                          setProgressionType(e.target.value as any);
                          setProgressionValue('');
                        }}
                        className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                      >
                        <option value="Status Change">Status Change</option>
                        <option value="Promotion">Promotion (Designation)</option>
                        <option value="Department Transfer">Department Transfer</option>
                        <option value="Employment Type Change">Employment Type Change</option>
                        <option value="Salary Revision">Salary Revision</option>
                        <option value="Subsidiary Transfer">Subsidiary Transfer</option>
                      </select>
                    </div>

                    {/* New Value input dependent on the Selection Type */}
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                        New Value / Assignment *
                      </label>
                      
                      {progressionType === 'Status Change' && (
                        <select 
                          value={progressionValue} 
                          onChange={(e) => setProgressionValue(e.target.value)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                          required
                        >
                          <option value="">-- Choose Status --</option>
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Terminated">Terminated</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      )}

                      {progressionType === 'Promotion' && (
                        <input 
                          type="text" 
                          required
                          value={progressionValue} 
                          onChange={(e) => setProgressionValue(e.target.value)}
                          placeholder="e.g. Lead Product Architect"
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                        />
                      )}

                      {progressionType === 'Department Transfer' && (
                        <select 
                          value={progressionValue} 
                          onChange={(e) => setProgressionValue(e.target.value)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                          required
                        >
                          <option value="">-- Choose Department --</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Product">Product</option>
                          <option value="Product & Engineering">Product & Engineering</option>
                          <option value="Human Resources">Human Resources</option>
                        </select>
                      )}

                      {progressionType === 'Employment Type Change' && (
                        <select 
                          value={progressionValue} 
                          onChange={(e) => setProgressionValue(e.target.value)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none font-semibold text-primary"
                          required
                        >
                          <option value="">-- Choose Employment Type --</option>
                          <option value="Probationary">Probationary</option>
                          <option value="Confirmation">Confirmation</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Internship">Internship</option>
                          <option value="Independent Contractor / Freelance">Independent Contractor / Freelance</option>
                        </select>
                      )}

                      {progressionType === 'Subsidiary Transfer' && (
                        <select 
                          value={progressionValue} 
                          onChange={(e) => setProgressionValue(e.target.value)}
                          className="w-full bg-white border border-primary/40 rounded p-1.5 text-xs outline-none font-semibold text-primary"
                          required
                        >
                          <option value="">-- Choose New Subsidiary --</option>
                          {entities.map(ent => (
                            <option key={ent.id} value={ent.id}>{ent.name}</option>
                          ))}
                        </select>
                      )}

                      {progressionType === 'Salary Revision' && (
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-outline text-[10px]">RM</span>
                          <input 
                            type="number" 
                            required 
                            min="1000"
                            value={progressionValue} 
                            onChange={(e) => setProgressionValue(e.target.value)}
                            placeholder="e.g. 10500"
                            className="w-full bg-white border border-neutral-border rounded pl-8 pr-2 py-1.5 text-xs outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Effective Date & Notes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Effective Date</label>
                        <input 
                          type="date" 
                          required
                          value={progressionDate} 
                          onChange={(e) => setProgressionDate(e.target.value)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Administrative Notes</label>
                        <input 
                          type="text" 
                          value={progressionNotes} 
                          onChange={(e) => setProgressionNotes(e.target.value)}
                          placeholder="e.g. Approved by Director"
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-primary text-white py-2 rounded text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <History className="w-4 h-4" /> Save Career Progression Event
                    </button>

                  </form>
                </div>

                {/* Section 2: Progression History Log Timeline */}
                <div className="flex-1 space-y-3 min-h-[160px] overflow-hidden flex flex-col">
                  <div className="border-b border-neutral-border pb-2 shrink-0">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-primary" /> Career Progression Timeline History
                    </h4>
                  </div>

                  <div className="overflow-y-auto max-h-[180px] pr-1 space-y-3 flex-1">
                    {selectedEmployee.careerHistory && selectedEmployee.careerHistory.length > 0 ? (
                      selectedEmployee.careerHistory.map((item, index) => {
                        let badgeColor = "bg-blue-100 text-blue-700";
                        if (item.type === 'Status Change') badgeColor = "bg-amber-100 text-amber-700";
                        if (item.type === 'Salary Revision') badgeColor = "bg-green-100 text-green-700";
                        if (item.type === 'Promotion') badgeColor = "bg-purple-100 text-purple-700";

                        return (
                          <div key={item.id || index} className="relative pl-5 border-l-2 border-neutral-border/60 text-xs">
                            {/* Dot indicator */}
                            <div className="absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                            
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-on-surface text-[11px]">{item.type}</span>
                              <span className="text-[10px] text-outline font-mono">{item.date}</span>
                            </div>
                            
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.25 rounded my-1 ${badgeColor}`}>
                              {item.previousValue} → {item.newValue}
                            </span>
                            
                            <p className="text-on-surface-variant text-[10px] leading-tight italic bg-zinc-50 p-1.5 rounded border border-zinc-100 mt-1">
                              {item.notes}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-on-surface-variant italic text-xs">
                        No previous progression events logged. Use the form above to record changes.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-border flex justify-end bg-surface-container-low shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
              >
                Close Profile File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: Add Employee Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-primary text-white">
              <h3 className="font-bold text-base text-[#f7f0e0] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#f7f0e0]" /> Register New Enterprise Employee Profile
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-4 h-4 text-[#f7f0e0]" />
              </button>
            </div>

            {/* Modal Form Submit */}
            <form onSubmit={handleAddSubmit} className="flex-1 flex flex-col overflow-hidden text-left">
              <div className="p-6 overflow-y-auto space-y-4 text-sm">
                
                {/* SECTION 1: Personal Particulars */}
                <div className="border-b border-neutral-border pb-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">1. PERSONAL PARTICULARS</span>
                </div>

                {/* Profile Graphic Upload */}
                <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg border border-neutral-border/60">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-200 border border-neutral-border shrink-0 flex items-center justify-center">
                    {formAvatarUrl ? (
                      <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">No Photo</span>
                    )}
                  </div>
                  <div className="text-left">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
                      Upload Profile Graphic (Photo)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="text-xs text-zinc-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                    />
                    <span className="block text-[9px] text-zinc-400 mt-1">
                      Supports JPEG, PNG, or GIF. Max 5MB.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Employee Name *</label>
                    <input 
                      type="text" required
                      value={formName} onChange={(e) => setFormName(e.target.value)}
                      placeholder="Jane Cooper"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">NRIC / Passport Number *</label>
                    <input 
                      type="text" required
                      value={formNricPassport} onChange={(e) => setFormNricPassport(e.target.value)}
                      placeholder="950124-14-5226 / Passport ID"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Nationality *</label>
                    <input 
                      type="text" required
                      value={formNationality} onChange={(e) => setFormNationality(e.target.value)}
                      placeholder="e.g. Malaysian"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Contact Number *</label>
                    <input 
                      type="text" required
                      value={formContactNumber} onChange={(e) => setFormContactNumber(e.target.value)}
                      placeholder="+60 12-345 6789"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Marital Status</label>
                    <select
                      value={formMaritalStatus} onChange={(e) => setFormMaritalStatus(e.target.value as any)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option>Single</option>
                      <option>Married</option>
                      <option>Divorced</option>
                      <option>Widowed</option>
                    </select>
                  </div>
                </div>

                {/* Spouse Details (Only if Marital Status = Married) */}
                {formMaritalStatus === 'Married' && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3 animate-in fade-in duration-200">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block">Spouse Details</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Spouse Name *</label>
                        <input 
                          type="text" required
                          value={formSpouseName} onChange={(e) => setFormSpouseName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Spouse NRIC *</label>
                        <input 
                          type="text" required
                          value={formSpouseNric} onChange={(e) => setFormSpouseNric(e.target.value)}
                          placeholder="e.g. 850320-14-1123"
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Spouse Working?</label>
                        <select
                          value={formSpouseIsWorking} onChange={(e) => setFormSpouseIsWorking(e.target.value as any)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    {/* Enable Column for Working Company and Position Title only if Spouse Working = Yes */}
                    {formSpouseIsWorking === 'Yes' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in slide-in-from-top-1 duration-150">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Working Company *</label>
                          <input 
                            type="text" required
                            value={formSpouseCompany} onChange={(e) => setFormSpouseCompany(e.target.value)}
                            placeholder="e.g. Tech Corp Sdn Bhd"
                            className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Position Title *</label>
                          <input 
                            type="text" required
                            value={formSpousePosition} onChange={(e) => setFormSpousePosition(e.target.value)}
                            placeholder="e.g. Software Engineer"
                            className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Do you have dependants? (Only if Marital Status = Married, Divorced, or Widowed) */}
                {(formMaritalStatus === 'Married' || formMaritalStatus === 'Divorced' || formMaritalStatus === 'Widowed') && (
                  <div className="p-4 bg-zinc-50 border border-neutral-border rounded-lg space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">Do you have dependants?</span>
                      <select
                        value={formHasDependants} onChange={(e) => setFormHasDependants(e.target.value as any)}
                        className="bg-white border border-neutral-border rounded p-1 text-xs focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    {/* Dependant list & addition if Has Dependants = Yes */}
                    {formHasDependants === 'Yes' && (
                      <div className="space-y-3 pt-2 border-t border-neutral-border/60 animate-in slide-in-from-top-1 duration-150">
                        <span className="text-[11px] font-bold text-primary uppercase block">Dependants Registry (Max. 10 Pax)</span>
                        
                        {/* Dynamic List */}
                        {formDependants.length > 0 ? (
                          <div className="border border-neutral-border/50 rounded overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-neutral-light border-b border-neutral-border">
                                <tr>
                                  <th className="p-2 font-bold text-on-surface-variant">Name</th>
                                  <th className="p-2 font-bold text-on-surface-variant w-24">Gender</th>
                                  <th className="p-2 font-bold text-on-surface-variant w-28">DOB</th>
                                  <th className="p-2 text-right w-12"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-border/40">
                                {formDependants.map((dep, idx) => (
                                  <tr key={idx} className="bg-white hover:bg-neutral-light/30">
                                    <td className="p-2 font-semibold text-on-surface">{dep.name}</td>
                                    <td className="p-2">{dep.gender}</td>
                                    <td className="p-2 font-mono">{dep.dob}</td>
                                    <td className="p-2 text-right">
                                      <button 
                                        type="button"
                                        onClick={() => handleRemoveFormDependant(idx)}
                                        className="text-error hover:text-red-700 p-1 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs italic text-on-surface-variant bg-white p-3 rounded border border-neutral-border/40 text-center">
                            No dependants added yet. Please specify details below to add.
                          </div>
                        )}

                        {/* Interactive addition fields */}
                        {formDependants.length < 10 && (
                          <div className="bg-white p-3 rounded border border-neutral-border/40 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Dependant Name</label>
                                <input 
                                  type="text"
                                  value={tempDepName} onChange={(e) => setTempDepName(e.target.value)}
                                  placeholder="e.g. Sally Doe"
                                  className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Gender</label>
                                <select
                                  value={tempDepGender} onChange={(e) => setTempDepGender(e.target.value as any)}
                                  className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Date of Birth</label>
                                <input 
                                  type="date"
                                  value={tempDepDob} onChange={(e) => setTempDepDob(e.target.value)}
                                  className="w-full bg-white border border-neutral-border rounded p-1 text-[11px] outline-none"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddFormDependant}
                              className="px-3 py-1 bg-primary/10 text-primary rounded text-[11px] font-bold hover:bg-primary/20 transition-all cursor-pointer block ml-auto"
                            >
                              + Add Dependant ({formDependants.length}/10)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: Corporate & Contract Mapping */}
                <div className="border-b border-neutral-border pb-2 pt-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">2. CORPORATE REGISTRY</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Corporate Email Address *</label>
                    <input 
                      type="email" required
                      value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="j.cooper@enterprise.com"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Tax PCB Income Number</label>
                    <input 
                      type="text"
                      value={formTaxNumber} onChange={(e) => setFormTaxNumber(e.target.value)}
                      placeholder="SG 29481729010 (or auto-gen)"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">EPF Member Number</label>
                    <input 
                      type="text"
                      value={formEpfNumber} onChange={(e) => setFormEpfNumber(e.target.value)}
                      placeholder="EP-29481729010 (or auto-gen)"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Subsidiary *</label>
                    <select
                      value={formEntityId} onChange={(e) => setFormEntityId(e.target.value)}
                      className="w-full bg-white border border-primary/30 rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none font-semibold text-primary"
                    >
                      {entities.map(ent => (
                        <option key={ent.id} value={ent.id}>{ent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Department</label>
                    <select
                      value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option>Engineering</option>
                      <option>Product & Engineering</option>
                      <option>Product</option>
                      <option>Human Resources</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Designation / Role *</label>
                    <input 
                      type="text" required
                      value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)}
                      placeholder="QA Automation Engineer"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Type of Employment</label>
                    <select
                      value={formEmploymentType} onChange={(e) => setFormEmploymentType(e.target.value as any)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none font-semibold text-primary"
                    >
                      <option value="Probationary">Probationary</option>
                      <option value="Confirmation">Confirmation</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Independent Contractor / Freelance">Independent Contractor / Freelance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Date Joined</label>
                    <input 
                      type="date"
                      value={formDateOfJoined} onChange={(e) => setFormDateOfJoined(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Initial Status</label>
                    <select
                      value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {formEmploymentType === 'Independent Contractor / Freelance' && (
                  <div className="p-3 bg-primary/5 border border-primary/25 rounded-md animate-in slide-in-from-top-1 duration-150">
                    <label className="block text-xs font-bold text-primary uppercase mb-1">Eligible for Statutory Payment ? (Y / N)</label>
                    <select
                      value={formEligibleForStatutory} onChange={(e) => setFormEligibleForStatutory(e.target.value as 'Yes' | 'No')}
                      className="w-full bg-white border border-primary/40 rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none font-semibold"
                    >
                      <option value="Yes">Yes (Y)</option>
                      <option value="No">No (N)</option>
                    </select>
                  </div>
                )}

                {/* SECTION 3: Financials & Bank */}
                <div className="border-b border-neutral-border pb-2 pt-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">3. FINANCIAL & BANK BASELINE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Recipient Bank Name</label>
                    <select
                      value={formBank} onChange={(e) => setFormBank(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option>Maybank Berhad</option>
                      <option>CIMB Bank Berhad</option>
                      <option>Citibank Berhad</option>
                      <option>Public Bank Berhad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Bank Account Number *</label>
                    <input 
                      type="text" required
                      value={formAccount} onChange={(e) => setFormAccount(e.target.value)}
                      placeholder="1642 9845 2210"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Basic Salary *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] text-outline">RM</span>
                      <input 
                        type="number" required min="1000"
                        value={formSalary} onChange={(e) => setFormSalary(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-border rounded pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Housing</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] text-outline">RM</span>
                      <input 
                        type="number" min="0"
                        value={formHousing} onChange={(e) => setFormHousing(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-border rounded pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Transport</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] text-outline">RM</span>
                      <input 
                        type="number" min="0"
                        value={formTransport} onChange={(e) => setFormTransport(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-border rounded pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Emergency Contacts */}
                <div className="border-b border-neutral-border pb-2 pt-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">4. STATUTORY EMERGENCY CONTACT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Emergency Name *</label>
                    <input 
                      type="text" required
                      value={formEmergencyContactName} onChange={(e) => setFormEmergencyContactName(e.target.value)}
                      placeholder="Emma Jenkins"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Relationship *</label>
                    <input 
                      type="text" required
                      value={formEmergencyContactRelation} onChange={(e) => setFormEmergencyContactRelation(e.target.value)}
                      placeholder="e.g. Spouse / Mother"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Emergency Phone *</label>
                    <input 
                      type="text" required
                      value={formEmergencyContactPhone} onChange={(e) => setFormEmergencyContactPhone(e.target.value)}
                      placeholder="+60 12-987 6543"
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-neutral-border flex justify-end gap-2 bg-surface-container-low shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white border border-neutral-border hover:bg-surface-container rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
                >
                  Enlist & Enroll Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
