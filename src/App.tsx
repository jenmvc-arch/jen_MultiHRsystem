/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  User, 
  X, 
  Settings, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Briefcase,
  FileText,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';
import { AppTab, Employee, EmployeePerformance, ReviewCycle, CorporateEntity, Candidate } from './types';
import { 
  INITIAL_EMPLOYEES, 
  INITIAL_REVIEW_CYCLES, 
  INITIAL_PERFORMANCES,
  INITIAL_ENTITIES,
  INITIAL_CANDIDATES,
  UserAccount
} from './data';

import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import PayrollView from './components/PayrollView';
import PayslipDocumentView from './components/PayslipDocumentView';
import PerformanceView from './components/PerformanceView';
import EmployeeDirectoryView from './components/EmployeeDirectoryView';
import ReportsView from './components/ReportsView';
import EntitiesView from './components/EntitiesView';
import TaxSettingsView from './components/TaxSettingsView';
import LeaveManagementView from './components/LeaveManagementView';
import FormsDirectoryView from './components/FormsDirectoryView';
import HireOnboardingView from './components/HireOnboardingView';
import LoginView from './components/LoginView';
import JobApplicationForm from './components/JobApplicationForm';
import OnboardingForm from './components/OnboardingForm';

import { googleSheetsClient, isGoogleConfigured } from './lib/googleSheetsClient';

export default function App() {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('EMP-84729'); // Sarah Jenkins by default
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check if we are in print/Puppeteer mode
  const isPrintMode = window.location.search.includes('print=true');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const handleLoginSuccess = (user: UserAccount) => {
    localStorage.setItem('hr-nexus-auth', 'true');
    localStorage.setItem('hr-nexus-user-email', user.email);
    localStorage.setItem('hr-nexus-user-name', user.name);
    localStorage.setItem('hr-nexus-user-role', user.role);
    setIsAuthenticated(true);
    setCurrentUserEmail(user.email);
    setCurrentUserName(user.name);
    setCurrentUserRole(user.role);
  };

  const handleSignOut = () => {
    localStorage.removeItem('hr-nexus-auth');
    localStorage.removeItem('hr-nexus-user-email');
    localStorage.removeItem('hr-nexus-user-name');
    localStorage.removeItem('hr-nexus-user-role');
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    setCurrentUserName(null);
    setCurrentUserRole(null);
  };

  // Core Database States
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [performances, setPerformances] = useState<EmployeePerformance[]>(INITIAL_PERFORMANCES);
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>(INITIAL_REVIEW_CYCLES);
  const [entities, setEntities] = useState<CorporateEntity[]>(INITIAL_ENTITIES);
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);

  // Load session from local storage on mount
  useEffect(() => {
    const auth = localStorage.getItem('hr-nexus-auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      setCurrentUserEmail(localStorage.getItem('hr-nexus-user-email'));
      setCurrentUserName(localStorage.getItem('hr-nexus-user-name'));
      setCurrentUserRole(localStorage.getItem('hr-nexus-user-role'));
    }
  }, []);

  // Load data from Google Sheets dynamically if configured
  useEffect(() => {
    if (!isGoogleConfigured) return;

    async function loadData() {
      try {
        const payload = await googleSheetsClient.loadData();
        
        // 1. Fetch corporate entities
        if (payload.corporate_entities && payload.corporate_entities.length > 0) {
          setEntities(payload.corporate_entities.map((e: any) => ({
            id: e.id,
            name: e.name,
            registrationNumber: e.registrationNumber || '',
            address: e.address || '',
            taxReferenceNo: e.taxReferenceNo || '',
            epfReferenceNo: e.epfReferenceNo || '',
            socsoReferenceNo: e.socsoReferenceNo || '',
            currency: e.currency || 'RM',
            isActive: String(e.isActive) !== 'false' && e.isActive !== false,
            theme: e.theme as any
          })));
        }

        // 2. Fetch employees
        if (payload.employees && payload.employees.length > 0) {
          setEmployees(payload.employees.map((e: any) => {
            let careerHistory = [];
            let dependants = [];
            try {
              if (e.careerHistory && typeof e.careerHistory === 'string') {
                careerHistory = JSON.parse(e.careerHistory);
              } else if (Array.isArray(e.careerHistory)) {
                careerHistory = e.careerHistory;
              }
            } catch (err) {
              console.error('Error parsing career history for employee', e.id, err);
            }
            try {
              if (e.dependants && typeof e.dependants === 'string') {
                dependants = JSON.parse(e.dependants);
              } else if (Array.isArray(e.dependants)) {
                dependants = e.dependants;
              }
            } catch (err) {
              console.error('Error parsing dependants for employee', e.id, err);
            }
            return {
              id: e.id,
              entityId: e.entityId,
              name: e.name,
              email: e.email,
              designation: e.designation,
              department: e.department,
              status: e.status as any,
              bankName: e.bankName,
              accountNo: e.accountNo,
              basicSalary: Number(e.basicSalary || 0),
              housingAllowance: Number(e.housingAllowance || 0),
              transportAllowance: Number(e.transportAllowance || 0),
              overtime: Number(e.overtime || 0),
              performanceBonus: Number(e.performanceBonus || 0),
              epfRateEmployee: Number(e.epfRateEmployee || 11),
              epfRateEmployer: Number(e.epfRateEmployer || 13),
              socsoEmployee: Number(e.socsoEmployee || 0),
              socsoEmployer: Number(e.socsoEmployer || 0),
              eisEmployee: Number(e.eisEmployee || 0),
              eisEmployer: Number(e.eisEmployer || 0),
              taxPcb: Number(e.taxPcb || 0),
              unpaidLeave: Number(e.unpaidLeave || 0),
              hrdCorp: Number(e.hrdCorp || 0),
              avatarUrl: e.avatarUrl || undefined,
              nricPassport: e.nricPassport || '',
              nationality: e.nationality || '',
              contactNumber: e.contactNumber || '',
              taxNumber: e.taxNumber || '',
              epfNumber: e.epfNumber || '',
              employmentType: e.employmentType || 'Confirmation',
              maritalStatus: e.maritalStatus || 'Single',
              eligibleForStatutory: e.eligibleForStatutory || 'Yes',
              emergencyContactName: e.emergencyContactName || '',
              emergencyContactRelation: e.emergencyContactRelation || '',
              emergencyContactPhone: e.emergencyContactPhone || '',
              dateOfJoined: e.dateOfJoined || '',
              careerHistory,
              dependants
            };
          }));
        }

        // 3. Fetch appraisal / performances
        if (payload.performances && payload.performances.length > 0) {
          setPerformances(payload.performances.map((p: any) => {
            let goals = [];
            try {
              if (p.goals && typeof p.goals === 'string') {
                goals = JSON.parse(p.goals);
              } else if (Array.isArray(p.goals)) {
                goals = p.goals;
              }
            } catch (err) {
              console.error('Error parsing goals for performance', p.employeeId, err);
            }
            return {
              employeeId: p.employeeId,
              reviewCycleId: p.reviewCycleId,
              managerName: p.managerName || '',
              reviewStatus: p.reviewStatus || 'Not Started',
              rating: Number(p.rating || 0),
              teamworkScore: Number(p.teamworkScore || 0),
              communicationScore: Number(p.communicationScore || 0),
              problemSolvingScore: Number(p.problemSolvingScore || 0),
              selfEvaluation: p.selfEvaluation || '',
              managerComments: p.managerComments || '',
              goals
            };
          }));
        }

        // 4. Fetch candidates
        if (payload.candidates && payload.candidates.length > 0) {
          setCandidates(payload.candidates.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            designation: c.designation,
            department: c.department || 'Engineering',
            entityId: c.entityId || 'ENT-01',
            stage: c.stage as any,
            progress: Number(c.progress || 0),
            dateJoined: c.dateJoined || ''
          })));
        }
      } catch (err) {
        console.error('[Google Sheets Load] Error loading database tables:', err);
      }
    }

    loadData();
  }, []);

  // Active corporate views
  const [activeEntityId, setActiveEntityId] = useState<string>('ENT-01');
  const activeEntity = entities.find(e => e.id === activeEntityId) || entities[0];

  // Dynamic Theme style provider
  const getThemeStyles = (themeName?: 'theme1' | 'theme2' | 'theme3') => {
    if (themeName === 'theme2') {
      return {
        '--color-primary': '#B30000',
        '--color-primary-container': '#8B0000',
        '--color-on-primary-container': '#FFFFFF',
        '--color-secondary': '#8B0000',
        '--color-secondary-container': '#F2D7C5',
        '--color-on-secondary-container': '#B30000',
        '--color-background': '#F7EBDD',
        '--color-on-background': '#222222',
        '--color-surface': '#FFF8F0',
        '--color-surface-container-lowest': '#FFF8F0',
        '--color-surface-container-low': '#FFF8F0',
        '--color-surface-container': '#F2D7C5',
        '--color-on-surface': '#B30000',
        '--color-on-surface-variant': '#222222',
        '--color-neutral-border': '#F2D7C5',
        '--color-parchment': '#FFF8F0',
      } as React.CSSProperties;
    }
    if (themeName === 'theme3') {
      return {
        '--color-primary': '#D4AF37',
        '--color-primary-container': '#1E1E1E',
        '--color-on-primary-container': '#D4AF37',
        '--color-secondary': '#FFD700',
        '--color-secondary-container': '#2A2A2A',
        '--color-on-secondary-container': '#D4AF37',
        '--color-background': '#121212',
        '--color-on-background': '#FFFFFF',
        '--color-surface': '#1E1E1E',
        '--color-surface-container-lowest': '#121212',
        '--color-surface-container-low': '#1A1A1A',
        '--color-surface-container': '#2A2A2A',
        '--color-on-surface': '#D4AF37',
        '--color-on-surface-variant': '#E5E5E5',
        '--color-neutral-border': '#3A3A3A',
        '--color-parchment': '#2A2A2A',
      } as React.CSSProperties;
    }
    return {} as React.CSSProperties;
  };

  // Global Interactive Settings (State-driven for extra precision)
  const [companyName, setCompanyName] = useState('Acme Global Enterprise');
  const [currencySymbol, setCurrencySymbol] = useState('RM');
  const [taxRate, setTaxRate] = useState(11);

  // Toast System
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  // New Request Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('Annual Leave');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestDate, setRequestDate] = useState('2026-11-01');

  // Trigger toast helper
  const triggerNotification = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    setToast({ show: true, title, message, type });
  };

  // Dismiss toast after timeout
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Database Action Mutators
  const handleAddCandidate = async (newCandidate: Candidate) => {
    setCandidates(prev => [...prev, newCandidate]);

    if (isGoogleConfigured) {
      try {
        await googleSheetsClient.insert('candidates', {
          id: newCandidate.id,
          name: newCandidate.name,
          email: newCandidate.email,
          phone: newCandidate.phone,
          designation: newCandidate.designation,
          department: newCandidate.department,
          entityId: newCandidate.entityId,
          stage: newCandidate.stage,
          progress: newCandidate.progress,
          dateJoined: newCandidate.dateJoined
        });
      } catch (err) {
        console.error('[Google Sheets Candidate Insert] Failed:', err);
        triggerNotification('Sync Failed', 'Could not save new candidate to Google Sheets.', 'info');
      }
    }
  };

  const handleUpdateCandidate = async (id: string, updates: Partial<Candidate>) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    if (isGoogleConfigured) {
      try {
        await googleSheetsClient.update('candidates', id, updates, 'id');
      } catch (err) {
        console.error('[Google Sheets Candidate Update] Failed:', err);
        triggerNotification('Sync Failed', 'Could not update candidate in Google Sheets.', 'info');
      }
    }
  };

  const handleAddEmployee = async (newEmployee: Employee) => {
    setEmployees(prev => [newEmployee, ...prev]);

    if (isGoogleConfigured) {
      try {
        await googleSheetsClient.insert('employees', {
          id: newEmployee.id,
          entityId: newEmployee.entityId,
          name: newEmployee.name,
          email: newEmployee.email,
          designation: newEmployee.designation,
          department: newEmployee.department,
          status: newEmployee.status,
          bankName: newEmployee.bankName,
          accountNo: newEmployee.accountNo,
          basicSalary: newEmployee.basicSalary,
          housingAllowance: newEmployee.housingAllowance,
          transportAllowance: newEmployee.transportAllowance,
          overtime: newEmployee.overtime,
          performanceBonus: newEmployee.performanceBonus,
          epfRateEmployee: newEmployee.epfRateEmployee,
          epfRateEmployer: newEmployee.epfRateEmployer,
          socsoEmployee: newEmployee.socsoEmployee,
          socsoEmployer: newEmployee.socsoEmployer,
          eisEmployee: newEmployee.eisEmployee,
          eisEmployer: newEmployee.eisEmployer,
          taxPcb: newEmployee.taxPcb,
          unpaidLeave: newEmployee.unpaidLeave,
          hrdCorp: newEmployee.hrdCorp,
          avatarUrl: newEmployee.avatarUrl || '',
          nricPassport: newEmployee.nricPassport,
          nationality: newEmployee.nationality,
          contactNumber: newEmployee.contactNumber,
          taxNumber: newEmployee.taxNumber,
          epfNumber: newEmployee.epfNumber || '',
          employmentType: newEmployee.employmentType,
          maritalStatus: newEmployee.maritalStatus,
          eligibleForStatutory: newEmployee.eligibleForStatutory || 'Yes',
          emergencyContactName: newEmployee.emergencyContactName,
          emergencyContactRelation: newEmployee.emergencyContactRelation,
          emergencyContactPhone: newEmployee.emergencyContactPhone,
          dateOfJoined: newEmployee.dateOfJoined,
          careerHistory: JSON.stringify(newEmployee.careerHistory || []),
          dependants: JSON.stringify(newEmployee.dependants || [])
        });

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeId: newEmployee.id,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'CREATE_EMPLOYEE',
          oldValue: '',
          newValue: JSON.stringify(newEmployee),
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Google Sheets Insert] Failed to insert employee:', err);
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setPerformances(prev => prev.filter(p => p.employeeId !== id));

    if (isGoogleConfigured) {
      try {
        await googleSheetsClient.delete('employees', id, 'id');

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeId: id,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'DELETE_EMPLOYEE',
          oldValue: `Employee ID: ${id}`,
          newValue: '',
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Google Sheets Delete] Failed to delete employee:', err);
      }
    }
  };

  const handleUpdateEmployeeSalary = async (id: string, updates: Partial<Employee>) => {
    const oldEmp = employees.find(e => e.id === id);
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

    if (isGoogleConfigured) {
      try {
        const payloadUpdates: any = {};
        if (updates.name !== undefined) payloadUpdates.name = updates.name;
        if (updates.designation !== undefined) payloadUpdates.designation = updates.designation;
        if (updates.department !== undefined) payloadUpdates.department = updates.department;
        if (updates.email !== undefined) payloadUpdates.email = updates.email;
        if (updates.basicSalary !== undefined) payloadUpdates.basicSalary = updates.basicSalary;
        if (updates.bankName !== undefined) payloadUpdates.bankName = updates.bankName;
        if (updates.accountNo !== undefined) payloadUpdates.accountNo = updates.accountNo;
        if (updates.epfRateEmployee !== undefined) payloadUpdates.epfRateEmployee = updates.epfRateEmployee;
        if (updates.epfRateEmployer !== undefined) payloadUpdates.epfRateEmployer = updates.epfRateEmployer;
        if (updates.socsoEmployee !== undefined) payloadUpdates.socsoEmployee = updates.socsoEmployee;
        if (updates.socsoEmployer !== undefined) payloadUpdates.socsoEmployer = updates.socsoEmployer;
        if (updates.eisEmployee !== undefined) payloadUpdates.eisEmployee = updates.eisEmployee;
        if (updates.eisEmployer !== undefined) payloadUpdates.eisEmployer = updates.eisEmployer;
        if (updates.taxPcb !== undefined) payloadUpdates.taxPcb = updates.taxPcb;
        if (updates.unpaidLeave !== undefined) payloadUpdates.unpaidLeave = updates.unpaidLeave;
        if (updates.status !== undefined) payloadUpdates.status = updates.status;
        if (updates.entityId !== undefined) payloadUpdates.entityId = updates.entityId;
        if (updates.avatarUrl !== undefined) payloadUpdates.avatarUrl = updates.avatarUrl;
        if (updates.nricPassport !== undefined) payloadUpdates.nricPassport = updates.nricPassport;
        if (updates.nationality !== undefined) payloadUpdates.nationality = updates.nationality;
        if (updates.contactNumber !== undefined) payloadUpdates.contactNumber = updates.contactNumber;
        if (updates.taxNumber !== undefined) payloadUpdates.taxNumber = updates.taxNumber;
        if (updates.epfNumber !== undefined) payloadUpdates.epfNumber = updates.epfNumber;
        if (updates.employmentType !== undefined) payloadUpdates.employmentType = updates.employmentType;
        if (updates.maritalStatus !== undefined) payloadUpdates.maritalStatus = updates.maritalStatus;
        if (updates.eligibleForStatutory !== undefined) payloadUpdates.eligibleForStatutory = updates.eligibleForStatutory;
        if (updates.emergencyContactName !== undefined) payloadUpdates.emergencyContactName = updates.emergencyContactName;
        if (updates.emergencyContactRelation !== undefined) payloadUpdates.emergencyContactRelation = updates.emergencyContactRelation;
        if (updates.emergencyContactPhone !== undefined) payloadUpdates.emergencyContactPhone = updates.emergencyContactPhone;
        if (updates.dateOfJoined !== undefined) payloadUpdates.dateOfJoined = updates.dateOfJoined;
        if (updates.careerHistory !== undefined) payloadUpdates.careerHistory = JSON.stringify(updates.careerHistory);
        if (updates.dependants !== undefined) payloadUpdates.dependants = JSON.stringify(updates.dependants);

        await googleSheetsClient.update('employees', id, payloadUpdates, 'id');

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeId: id,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'UPDATE_EMPLOYEE',
          oldValue: JSON.stringify(oldEmp),
          newValue: JSON.stringify(updates),
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Google Sheets Update] Failed to update employee:', err);
      }
    }
  };

  const handleSavePerformance = async (updatedPerf: EmployeePerformance) => {
    setPerformances(prev => {
      const exists = prev.some(p => p.employeeId === updatedPerf.employeeId && p.reviewCycleId === updatedPerf.reviewCycleId);
      if (exists) {
        return prev.map(p => (p.employeeId === updatedPerf.employeeId && p.reviewCycleId === updatedPerf.reviewCycleId) ? updatedPerf : p);
      } else {
        return [updatedPerf, ...prev];
      }
    });

    if (isGoogleConfigured) {
      try {
        const payloadPerf = {
          employeeId: updatedPerf.employeeId,
          reviewCycleId: updatedPerf.reviewCycleId,
          managerName: updatedPerf.managerName,
          reviewStatus: updatedPerf.reviewStatus,
          rating: updatedPerf.rating,
          teamworkScore: updatedPerf.teamworkScore,
          communicationScore: updatedPerf.communicationScore,
          problemSolvingScore: updatedPerf.problemSolvingScore,
          selfEvaluation: updatedPerf.selfEvaluation,
          managerComments: updatedPerf.managerComments,
          goals: JSON.stringify(updatedPerf.goals)
        };

        await googleSheetsClient.upsert('performances', {
          employeeId: updatedPerf.employeeId,
          reviewCycleId: updatedPerf.reviewCycleId
        }, payloadPerf);
      } catch (err) {
        console.error('[Google Sheets Save Performance] Failed:', err);
      }
    }
  };

  const handleAddEntity = async (newEntity: CorporateEntity) => {
    setEntities(prev => [...prev, newEntity]);

    if (isGoogleConfigured) {
      try {
        await googleSheetsClient.insert('corporate_entities', {
          id: newEntity.id,
          name: newEntity.name,
          registrationNumber: newEntity.registrationNumber,
          address: newEntity.address,
          taxReferenceNo: newEntity.taxReferenceNo,
          epfReferenceNo: newEntity.epfReferenceNo,
          socsoReferenceNo: newEntity.socsoReferenceNo,
          currency: newEntity.currency,
          isActive: newEntity.isActive,
          theme: newEntity.theme
        });
      } catch (err) {
        console.error('[Google Sheets Entity Insert] Failed:', err);
      }
    }
  };

  const handleUpdateEntity = async (id: string, updates: Partial<CorporateEntity>) => {
    setEntities(prev => prev.map(ent => ent.id === id ? { ...ent, ...updates } : ent));

    if (isGoogleConfigured) {
      try {
        const payloadUpdates: any = {};
        if (updates.name !== undefined) payloadUpdates.name = updates.name;
        if (updates.registrationNumber !== undefined) payloadUpdates.registrationNumber = updates.registrationNumber;
        if (updates.address !== undefined) payloadUpdates.address = updates.address;
        if (updates.taxReferenceNo !== undefined) payloadUpdates.taxReferenceNo = updates.taxReferenceNo;
        if (updates.epfReferenceNo !== undefined) payloadUpdates.epfReferenceNo = updates.epfReferenceNo;
        if (updates.socsoReferenceNo !== undefined) payloadUpdates.socsoReferenceNo = updates.socsoReferenceNo;
        if (updates.currency !== undefined) payloadUpdates.currency = updates.currency;
        if (updates.isActive !== undefined) payloadUpdates.isActive = updates.isActive;
        if (updates.theme !== undefined) payloadUpdates.theme = updates.theme;

        await googleSheetsClient.update('corporate_entities', id, payloadUpdates, 'id');
      } catch (err) {
        console.error('[Google Sheets Entity Update] Failed:', err);
      }
    }
  };

  // Navigate to document utility
  const handleNavigateToDocument = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setCurrentTab('payslip-viewer');
  };

  // New request submission
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDesc.trim()) {
      triggerNotification('Request Error', 'Please specify details for your administrative request.', 'info');
      return;
    }
    setIsRequestModalOpen(false);
    setRequestDesc('');
    triggerNotification(
      'Request Submitted',
      `Your administrative request for ${requestType} on ${requestDate} is queued for Director approval.`
    );
  };

  if (isPrintMode) {
    const params = new URLSearchParams(window.location.search);
    const empId = params.get('employeeId') || selectedEmployeeId;
    return (
      <div style={getThemeStyles(activeEntity?.theme)} className="bg-white min-h-screen p-0">
        <PayslipDocumentView 
          employees={employees}
          selectedEmployeeId={empId}
          onBack={() => {}}
          onShowNotification={() => {}}
          activeEntity={activeEntity}
          isPrintView={true}
        />
      </div>
    );
  }

  const isJobApplyMode = window.location.search.includes('form=job-apply');
  const isOnboardingMode = window.location.search.includes('form=onboarding');

  if (isJobApplyMode) {
    return (
      <div style={getThemeStyles(activeEntity?.theme)} className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 md:p-8 select-text overflow-y-auto">
        <div className="w-full max-w-4xl bg-white border border-neutral-border rounded-xl shadow-md p-2">
          <JobApplicationForm 
            onShowNotification={triggerNotification}
            onApplicationSubmit={handleAddCandidate}
          />
        </div>
      </div>
    );
  }

  if (isOnboardingMode) {
    return (
      <div style={getThemeStyles(activeEntity?.theme)} className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 md:p-8 select-text overflow-y-auto">
        <div className="w-full max-w-4xl bg-white border border-neutral-border rounded-xl shadow-md p-2">
          <OnboardingForm 
            candidates={candidates}
            entities={entities}
            onShowNotification={triggerNotification}
            onOnboardingComplete={handleAddEmployee}
            onAdvanceCandidateStage={(id, stage) => handleUpdateCandidate(id, { stage, progress: 100 })}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={getThemeStyles(activeEntity?.theme)} className="flex h-screen bg-background overflow-hidden relative font-sans text-on-background select-none">
      
      {/* Toast Notification HUD */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-neutral-border shadow-2xl rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 text-left text-xs">
            <h4 className="font-bold text-on-background leading-tight">{toast.title}</h4>
            <p className="text-on-surface-variant mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Responsive Left Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        onNewRequest={() => setIsRequestModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        entities={entities}
        activeEntityId={activeEntityId}
        onChangeActiveEntity={(id) => {
          setActiveEntityId(id);
          const matched = entities.find(e => e.id === id);
          if (matched) {
            triggerNotification(
              'Corporate View Switched',
              `Now viewing as ${matched.name}. App branding, colors, and logo have synced.`,
              'success'
            );
          }
        }}
      />

      {/* Right Column Layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top bar (for search results & system status indicators) */}
        <header className="h-16 border-b border-neutral-border bg-surface px-6 flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle Button */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded hover:bg-surface-container transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 text-primary" />
            </button>
            <span className="text-xs font-bold text-primary bg-primary/10 py-1 px-3 rounded-full hidden sm:inline-block">
              {companyName} Core Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock Date Widget */}
            <div className="text-right hidden md:block">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Active UTC Standard</span>
              <span className="text-xs font-mono font-bold text-on-surface">2026-06-29 18:17 UTC</span>
            </div>

            <div className="w-px h-8 bg-neutral-border/40 hidden md:block" />

            {/* Notifications Alert Bell */}
            <button 
              onClick={() => triggerNotification('HR Directives', 'You have 142 outstanding performance reviews due by Nov 5th.', 'info')}
              className="p-2 rounded-full hover:bg-surface-container relative transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-on-surface" />
            </button>
            {/* User Account context */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-border/40">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary-container font-bold text-xs flex items-center justify-center border border-neutral-border">
                {currentUserName 
                  ? currentUserName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() 
                  : 'HR'}
              </div>
              <div className="text-left hidden sm:block leading-none">
                <span className="font-bold text-xs text-on-surface block">{currentUserName || 'Jenny Law'}</span>
                <span className="text-[10px] text-on-surface-variant mt-0.5 block">{currentUserRole || 'Global Administrator'}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-[10px] font-bold text-primary hover:text-primary-container ml-2.5 pl-2.5 border-l border-neutral-border/40 cursor-pointer uppercase transition-colors"
                title="Sign Out of Console"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Core Main Scrollable Content Pane */}
        <main className="flex-1 overflow-y-auto bg-surface-container-low p-6 md:p-8 select-text">
          {currentTab === 'dashboard' && (
            <DashboardView 
              employees={employees}
              entities={entities}
              reviewCycles={reviewCycles}
              onNavigate={setCurrentTab}
              onOpenNewEmployeeModal={() => {
                setCurrentTab('directory');
                triggerNotification('Directory Navigated', 'Click Add New Employee to register custom personnel.', 'info');
              }}
              onOpenRequestModal={() => setIsRequestModalOpen(true)}
            />
          )}

          {currentTab === 'payroll' && (
            <PayrollView 
              employees={employees}
              entities={entities}
              onUpdateEmployeeSalary={handleUpdateEmployeeSalary}
              onNavigateToDocument={handleNavigateToDocument}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'payslip-viewer' && (
            <PayslipDocumentView 
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              onBack={() => setCurrentTab('payroll')}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'performance' && (
            <PerformanceView 
              employees={employees}
              performances={performances}
              reviewCycles={reviewCycles}
              onSavePerformance={handleSavePerformance}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'directory' && (
            <EmployeeDirectoryView 
              employees={employees}
              entities={entities}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onUpdateEmployee={handleUpdateEmployeeSalary}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'entities' && (
            <EntitiesView 
              entities={entities}
              employees={employees}
              onAddEntity={handleAddEntity}
              onUpdateEntity={handleUpdateEntity}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'tax-settings' && (
            <TaxSettingsView 
              employees={employees}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView 
              employees={employees}
              performances={performances}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'leave-management' && (
            <LeaveManagementView 
              employees={employees}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'forms-directory' && (
            <FormsDirectoryView 
              employees={employees}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'hire-onboarding' && (
            <HireOnboardingView 
              entities={entities}
              onShowNotification={triggerNotification}
              onAddEmployee={handleAddEmployee}
              candidates={candidates}
              onAddCandidate={handleAddCandidate}
              onUpdateCandidate={handleUpdateCandidate}
            />
          )}

          {/* Tab: Settings Panel */}
          {currentTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-white border border-neutral-border rounded-lg p-6 shadow-sm text-left animate-in fade-in duration-200 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight">System Settings</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Customize global calculations constants, brand properties, and metadata.</p>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Legal Entity Name</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Currency Symbol</label>
                    <select
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="RM">Malaysian Ringgit (RM)</option>
                      <option value="$">US Dollar ($)</option>
                      <option value="£">British Pound (£)</option>
                      <option value="€">Euro (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Standard EPF Employee Rate</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none pr-8"
                      />
                      <span className="absolute right-2 top-2 text-xs font-bold text-outline">%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-parchment/40 rounded border border-neutral-border text-xs leading-relaxed">
                  <h4 className="font-bold text-primary mb-1">Enterprise Configuration Standard</h4>
                  <p className="text-on-surface-variant text-[11px]">These global overrides apply automatically across the dynamic payslip calculators, report generators, and directory sheets in real-time.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-border flex justify-end">
                <button 
                  onClick={() => {
                    triggerNotification('Settings Saved', 'Global override variables recalculated successfully.');
                    setCurrentTab('dashboard');
                  }}
                  className="bg-primary text-white text-xs font-semibold py-2 px-6 rounded hover:bg-primary-container"
                >
                  Apply System Changes
                </button>
              </div>
            </div>
          )}

          {/* Tab: Help Support */}
          {currentTab === 'help' && (
            <div className="max-w-2xl mx-auto bg-white border border-neutral-border rounded-lg p-6 shadow-sm text-left animate-in fade-in duration-200 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight">Support Documentation & Guides</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Statutory compliance frameworks, EPF calculations, and directory procedures.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-container-low rounded border-l-4 border-primary">
                  <h3 className="font-bold text-sm text-on-surface mb-1">How is EPF and SOCSO calculated?</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    EPF (Employees Provident Fund) is calculated at a standard rate of 11% for employees under 60 years old. SOCSO and EIS contributions are tiered matching statutory schedules for local payroll.
                  </p>
                </div>

                <div className="p-4 bg-surface-container-low rounded border-l-4 border-primary">
                  <h3 className="font-bold text-sm text-on-surface mb-1">Adding New Employees</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Registering a new employee in the Workforce Directory dynamically inserts their record into active memory. They immediately appear in the Payroll previews and evaluation scorecards for Oct 2026.
                  </p>
                </div>

                <div className="p-4 bg-surface-container-low rounded border-l-4 border-primary">
                  <h3 className="font-bold text-sm text-on-surface mb-1">Who do I contact for payroll audit changes?</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    For manual overrides, use the Adjust Salary options directly inside the active payslip preview or contact administrative support at <strong>support@acme-global.com</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Modal: New Request Form */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-border rounded-lg shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border flex justify-between items-center bg-surface-container-low text-left">
              <h3 className="font-bold text-base text-primary">Submit Administrative Request</h3>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRequestSubmit} className="p-6 text-left space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Request Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  <option>Annual Leave</option>
                  <option>Travel Expense Reimbursement</option>
                  <option>Medical Allowance Claim</option>
                  <option>Corporate IT Hardware Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Target Effective Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Justification Details *</label>
                <textarea
                  rows={3}
                  required
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  placeholder="Provide brief details/justification for your request..."
                  className="w-full bg-white border border-neutral-border rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-neutral-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 bg-white border border-neutral-border hover:bg-surface-container rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded text-xs font-semibold hover:bg-primary-container"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
