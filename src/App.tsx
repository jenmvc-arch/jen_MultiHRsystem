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
import { AppTab, Employee, EmployeePerformance, ReviewCycle, CorporateEntity, Candidate, PayrollRecord2026 } from './types';
import { 
  INITIAL_EMPLOYEES, 
  INITIAL_REVIEW_CYCLES, 
  INITIAL_PERFORMANCES,
  INITIAL_ENTITIES,
  INITIAL_CANDIDATES,
  UserAccount,
  MOCK_USERS,
  SEED_EMPLOYEES,
  SEED_ENTITIES,
  SEED_PERFORMANCES,
  SEED_CANDIDATES,
  SEED_REVIEW_CYCLES,
  seedSocsoConfigurationsAndBrackets
} from './data';
import { getGmt8Timestamp, getGmt8DateString } from './lib/dateUtils';

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
import DepartmentRoleView from './components/DepartmentRoleView';
import SocsoConfigAdminView from './components/SocsoConfigAdminView';
import LoginView from './components/LoginView';
import JobApplicationForm from './components/JobApplicationForm';
import OnboardingForm from './components/OnboardingForm';
import { EntityContextProvider } from './context/EntityContext';

import { googleSheetsClient, isGoogleConfigured, SheetsDataPayload } from './lib/googleSheetsClient';

export default function App() {
  // Navigation & View States
  const [activeEntityId, setActiveEntityId] = useState<string>(() => {
    return localStorage.getItem('active_corporate_entity_id') || (isGoogleConfigured ? '' : 'Red Point Sdn Bhd');
  });
  const [isSwitchingEntity, setIsSwitchingEntity] = useState<boolean>(false);
  const [switchingToEntityName, setSwitchingToEntityName] = useState<string>('');

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

    // Read and restore preferences
    const prefJson = localStorage.getItem(`user_entity_preferences_${user.email}`);
    if (prefJson) {
      try {
        const pref = JSON.parse(prefJson);
        if (pref && pref.last_selected_entity_id) {
          const matched = entities.find(e => e.id === pref.last_selected_entity_id && e.isActive);
          if (matched) {
            setActiveEntityId(pref.last_selected_entity_id);
            return;
          }
        }
      } catch (e) {}
    }
    const activeEntities = entities.filter(e => e.isActive);
    if (activeEntities.length > 0) {
      setActiveEntityId(activeEntities[0].id);
    }
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
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (!isGoogleConfigured) {
      const saved = localStorage.getItem('offline_employees');
      if (saved) return JSON.parse(saved);
      return SEED_EMPLOYEES;
    }
    return INITIAL_EMPLOYEES;
  });
  const [performances, setPerformances] = useState<EmployeePerformance[]>(() => {
    if (!isGoogleConfigured) {
      const saved = localStorage.getItem('offline_performances');
      if (saved) return JSON.parse(saved);
      return SEED_PERFORMANCES;
    }
    return INITIAL_PERFORMANCES;
  });
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>(() => {
    if (!isGoogleConfigured) {
      const saved = localStorage.getItem('offline_review_cycles');
      if (saved) return JSON.parse(saved);
      return SEED_REVIEW_CYCLES;
    }
    return INITIAL_REVIEW_CYCLES;
  });
  const [entities, setEntities] = useState<CorporateEntity[]>(() => {
    if (!isGoogleConfigured) {
      const saved = localStorage.getItem('offline_entities');
      if (saved) return JSON.parse(saved);
      return SEED_ENTITIES;
    }
    return INITIAL_ENTITIES;
  });
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (!isGoogleConfigured) {
      const saved = localStorage.getItem('offline_candidates');
      if (saved) return JSON.parse(saved);
      return SEED_CANDIDATES;
    }
    return INITIAL_CANDIDATES;
  });
  const [payrollRecords2026, setPayrollRecords2026] = useState<PayrollRecord2026[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(isGoogleConfigured);

  // Offline persistence sync
  React.useEffect(() => {
    if (!isGoogleConfigured) {
      localStorage.setItem('offline_entities', JSON.stringify(entities));
    }
  }, [entities]);

  React.useEffect(() => {
    if (!isGoogleConfigured) {
      localStorage.setItem('offline_employees', JSON.stringify(employees));
    }
  }, [employees]);

  React.useEffect(() => {
    if (!isGoogleConfigured) {
      localStorage.setItem('offline_performances', JSON.stringify(performances));
    }
  }, [performances]);

  React.useEffect(() => {
    if (!isGoogleConfigured) {
      localStorage.setItem('offline_review_cycles', JSON.stringify(reviewCycles));
    }
  }, [reviewCycles]);

  React.useEffect(() => {
    if (!isGoogleConfigured) {
      localStorage.setItem('offline_candidates', JSON.stringify(candidates));
    }
  }, [candidates]);

  const employeesWithHistory = React.useMemo(() => {
    return employees.map(emp => {
      const records = (payrollRecords2026 || []).filter(r => r && r.employeeEmail && emp.email && r.employeeEmail.toLowerCase() === emp.email.toLowerCase());
      const mapped = records.map(r => ({
        payrollMonth: r.payrollMonth,
        basicSalary: r.basicSalary,
        allowanceGeneral: r.allowanceGeneral,
        allowanceTransport: r.allowanceTransport,
        allowanceParking: r.allowanceParking,
        allowanceMeal: r.allowanceMeal,
        allowanceAccommodation: r.allowanceAccommodation,
        allowancePhone: r.allowancePhone,
        overtime: r.overtime,
        bonusAmount: r.bonusAmount,
        commissionAmount: r.commissionAmount,
        actualPCBDeducted: r.actualPCBDeducted,
        epfEmployee: r.epfEmployee,
        zakat: r.zakat,
        cp38: r.deductionCp38
      }));
      return {
        ...emp,
        historicalPayrollRecords: mapped.sort((a, b) => a.payrollMonth - b.payrollMonth)
      };
    });
  }, [employees, payrollRecords2026]);

  // Corporate scopes data isolation filters
  const filteredEmployees = React.useMemo(() => {
    return employees.filter(e => e.entityId === activeEntityId);
  }, [employees, activeEntityId]);

  const filteredEmployeesWithHistory = React.useMemo(() => {
    return employeesWithHistory.filter(e => e.entityId === activeEntityId);
  }, [employeesWithHistory, activeEntityId]);

  const filteredPerformances = React.useMemo(() => {
    return performances.filter(p => filteredEmployees.some(e => e.id === p.employeeId));
  }, [performances, filteredEmployees]);

  const filteredCandidates = React.useMemo(() => {
    return candidates.filter(c => c.entityId === activeEntityId);
  }, [candidates, activeEntityId]);

  const filteredPayrollRecords2026 = React.useMemo(() => {
    return payrollRecords2026.filter(r => filteredEmployees.some(e => e.email.toLowerCase() === r.employeeEmail.toLowerCase()));
  }, [payrollRecords2026, filteredEmployees]);

  // Reset selectedEmployeeId if the employee doesn't belong to the active entity
  React.useEffect(() => {
    if (selectedEmployeeId) {
      const match = employees.find(e => e.id === selectedEmployeeId);
      if (match && match.entityId !== activeEntityId) {
        const entityEmployees = employees.filter(e => e.entityId === activeEntityId);
        if (entityEmployees.length > 0) {
          setSelectedEmployeeId(entityEmployees[0].id);
        } else {
          setSelectedEmployeeId('');
        }
      }
    }
  }, [activeEntityId, employees, selectedEmployeeId]);

  // Persist user entity switching preferences
  React.useEffect(() => {
    if (currentUserEmail && activeEntityId) {
      localStorage.setItem(
        `user_entity_preferences_${currentUserEmail}`,
        JSON.stringify({
          user_id: currentUserEmail,
          last_selected_entity_id: activeEntityId,
          updated_at: new Date().toISOString()
        })
      );
    }
  }, [activeEntityId, currentUserEmail]);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    triggerNotification('Seeding Database', 'Syncing preset data with your Google Sheets...', 'info');
    try {
      // 1. Seed corporate entities
      for (const ent of SEED_ENTITIES) {
        await googleSheetsClient.insert('corporate_entities', {
          id: ent.id,
          name: ent.name,
          registrationNumber: ent.registrationNumber,
          address: ent.address,
          taxReferenceNo: ent.taxReferenceNo,
          epfReferenceNo: ent.epfReferenceNo,
          socsoReferenceNo: ent.socsoReferenceNo,
          currency: ent.currency,
          isActive: ent.isActive,
          theme: ent.theme,
          logoUrl: ent.logoUrl || ''
        });
      }

      // 2. Seed employees
      for (const emp of SEED_EMPLOYEES) {
        await googleSheetsClient.insert('employees', {
          id: emp.id,
          entityId: emp.entityId,
          entityName: emp.entityId === 'ENT-02' ? 'YSYD Sdn Bhd' : 'Red Point Sdn Bhd',
          name: emp.name,
          email: emp.email,
          designation: emp.designation,
          department: emp.department,
          status: emp.status,
          bankName: emp.bankName,
          accountNo: emp.accountNo,
          basicSalary: emp.basicSalary,
          housingAllowance: emp.housingAllowance,
          transportAllowance: emp.transportAllowance,
          overtime: emp.overtime,
          performanceBonus: emp.performanceBonus,
          epfRateEmployee: emp.epfRateEmployee,
          epfRateEmployer: emp.epfRateEmployer,
          socsoEmployee: emp.socsoEmployee,
          socsoEmployer: emp.socsoEmployer,
          eisEmployee: emp.eisEmployee,
          eisEmployer: emp.eisEmployer,
          taxPcb: emp.taxPcb,
          unpaidLeave: emp.unpaidLeave,
          hrdCorp: emp.hrdCorp,
          avatarUrl: emp.avatarUrl || '',
          nricPassport: emp.nricPassport,
          nationality: emp.nationality,
          contactNumber: emp.contactNumber,
          taxNumber: emp.taxNumber,
          epfNumber: emp.epfNumber || '',
          employmentType: emp.employmentType,
          maritalStatus: emp.maritalStatus,
          eligibleForStatutory: emp.eligibleForStatutory || 'Yes',
          emergencyContactName: emp.emergencyContactName,
          emergencyContactRelation: emp.emergencyContactRelation,
          emergencyContactPhone: emp.emergencyContactPhone,
          dateOfJoined: emp.dateOfJoined,
          allowanceGeneral: emp.allowanceGeneral || 0,
          allowanceTransport: emp.allowanceTransport !== undefined ? emp.allowanceTransport : emp.transportAllowance || 0,
          allowanceParking: emp.allowanceParking || 0,
          allowanceMeal: emp.allowanceMeal || 0,
          allowanceAccommodation: emp.allowanceAccommodation !== undefined ? emp.allowanceAccommodation : emp.housingAllowance || 0,
          allowancePhone: emp.allowancePhone || 0,
          reimbursementAmount: emp.reimbursementAmount || 0,
          reimbursementDesc: emp.reimbursementDesc || '',
          bonusAmount: emp.bonusAmount !== undefined ? emp.bonusAmount : emp.performanceBonus || 0,
          bonusDesc: emp.bonusDesc || '',
          commissionAmount: emp.commissionAmount || 0,
          commissionDesc: emp.commissionDesc || '',
          backPayAmount: emp.backPayAmount || 0,
          backPayDesc: emp.backPayDesc || '',
          awsAmount: emp.awsAmount || 0,
          awsDesc: emp.awsDesc || '',
          compensationAmount: emp.compensationAmount || 0,
          compensationDesc: emp.compensationDesc || '',
          deductionInLieu: emp.deductionInLieu || 0,
          deductionCp38: emp.deductionCp38 || 0,
          deductionOthers: emp.deductionOthers || 0,
          deductionOthersDesc: emp.deductionOthersDesc || '',
          spouseName: emp.spouseName || '',
          spouseNric: emp.spouseNric || '',
          spouseIsWorking: emp.spouseIsWorking || 'No',
          spouseCompany: emp.spouseCompany || '',
          spousePosition: emp.spousePosition || '',
          hasDependants: emp.hasDependants || 'No',
          icFrontUrl: emp.icFrontUrl || '',
          icBackUrl: emp.icBackUrl || '',
          educationCertUrl: emp.educationCertUrl || '',
          skbbkEmployee: emp.skbbkEmployee || 0,
          skbbkEmployer: emp.skbbkEmployer || 0,
          careerHistory: JSON.stringify(emp.careerHistory || []),
          dependants: JSON.stringify(emp.dependants || [])
        });
      }

      // 3. Seed users
      for (const usr of MOCK_USERS) {
        await googleSheetsClient.insert('users', {
          email: usr.email,
          password: usr.password,
          name: usr.name,
          role: usr.role
        });
      }

      // 4. Seed candidates
      for (const cand of SEED_CANDIDATES) {
        await googleSheetsClient.insert('candidates', {
          id: cand.id,
          name: cand.name,
          email: cand.email,
          phone: cand.phone,
          designation: cand.designation,
          department: cand.department,
          entityId: cand.entityId,
          entityName: cand.entityId === 'ENT-02' ? 'YSYD Sdn Bhd' : 'Red Point Sdn Bhd',
          stage: cand.stage,
          progress: cand.progress,
          dateJoined: cand.dateJoined
        });
      }

      // 5. Seed performances
      for (const perf of SEED_PERFORMANCES) {
        await googleSheetsClient.insert('performances', {
          employeeId: perf.employeeId,
          employeeEmail: SEED_EMPLOYEES.find(emp => emp.id === perf.employeeId)?.email || '',
          reviewCycleId: perf.reviewCycleId,
          managerName: perf.managerName,
          reviewStatus: perf.reviewStatus,
          rating: perf.rating,
          teamworkScore: perf.teamworkScore,
          communicationScore: perf.communicationScore,
          problemSolvingScore: perf.problemSolvingScore,
          selfEvaluation: perf.selfEvaluation,
          managerComments: perf.managerComments,
          goals: JSON.stringify(perf.goals || [])
        });
      }

      triggerNotification('Seeding Complete', 'Database seeded successfully. Refreshing page...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('[Google Sheets Seeding] Failed:', err);
      triggerNotification('Seed Failed', `Could not seed database: ${err.message || err}`, 'info');
    } finally {
      setIsSeeding(false);
    }
  };

  // Load session from local storage on mount
  useEffect(() => {
    const auth = localStorage.getItem('hr-nexus-auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      const email = localStorage.getItem('hr-nexus-user-email');
      setCurrentUserEmail(email);
      setCurrentUserName(localStorage.getItem('hr-nexus-user-name'));
      setCurrentUserRole(localStorage.getItem('hr-nexus-user-role'));

      // Preferences are managed strictly by active_corporate_entity_id state
    }
    // Seed statutory configurations and brackets on mount
    seedSocsoConfigurationsAndBrackets();
  }, []);

  // Load data from Google Sheets dynamically if configured
  useEffect(() => {
    if (!isGoogleConfigured) {
      setIsLoadingDb(false);
      return;
    }

    async function loadData() {
      try {
        const mainPayload = await googleSheetsClient.loadData();

        // Auto-seed if corporate entities is empty (fresh spreadsheet database)
        if (!mainPayload.corporate_entities || mainPayload.corporate_entities.length === 0) {
          await handleSeedDatabase();
          return;
        }
        
        // 1. Fetch corporate entities
        let loadedEntities: CorporateEntity[] = [];
        if (mainPayload.corporate_entities) {
          loadedEntities = mainPayload.corporate_entities.map((e: any) => ({
            id: e.id || e.name || '',
            name: e.name || '',
            registrationNumber: e.registrationNumber || '',
            address: e.address || '',
            taxReferenceNo: e.taxReferenceNo || '',
            epfReferenceNo: e.epfReferenceNo || '',
            socsoReferenceNo: e.socsoReferenceNo || '',
            currency: e.currency || 'RM',
            isActive: String(e.isActive) !== 'false' && e.isActive !== false,
            theme: e.theme as any,
            logoUrl: e.logoUrl || '',
            googleScriptUrl: e.googleScriptUrl || ''
          }));
          setEntities(loadedEntities);
          if (loadedEntities.length > 0) {
            const savedEntityId = localStorage.getItem('active_corporate_entity_id');
            const exists = loadedEntities.some(e => e.id === savedEntityId);
            setActiveEntityId(exists && savedEntityId ? savedEntityId : loadedEntities[0].id);
          }
        }

        // 1.5. Group and load other payloads from individual scripts
        const payloadsByUrl: Record<string, SheetsDataPayload> = {};
        payloadsByUrl['default'] = mainPayload;

        const customUrlFetchPromises = loadedEntities
          .filter(e => e.googleScriptUrl && e.googleScriptUrl.trim() !== '')
          .map(async (ent) => {
            const url = ent.googleScriptUrl!.trim();
            if (payloadsByUrl[url]) return;
            try {
              console.log(`[Multi-Script] Fetching data for entity ${ent.name} from:`, url);
              const customPayload = await googleSheetsClient.loadData(url);
              payloadsByUrl[url] = customPayload;
            } catch (fetchErr) {
              console.error(`[Multi-Script] Failed to load data for entity ${ent.name} from:`, url, fetchErr);
            }
          });

        await Promise.all(customUrlFetchPromises);

        const allRawEmployees: any[] = [];
        const allRawPerformances: any[] = [];
        const allRawPayrollRecords: any[] = [];
        const allRawCandidates: any[] = [];

        for (const [url, payload] of Object.entries(payloadsByUrl)) {
          const isDefault = url === 'default';

          if (payload.employees) {
            payload.employees.forEach((e: any) => {
              let resolvedEntity = e.entityName || e.entityId || '';
              if (resolvedEntity === 'ENT-01' || resolvedEntity === 'ENT-92') {
                resolvedEntity = 'Red Point Sdn Bhd';
              } else if (resolvedEntity === 'ENT-02' || resolvedEntity === 'ENT-86') {
                resolvedEntity = 'YSYD Sdn Bhd';
              }

              const expectedEnt = loadedEntities.find(ent => ent.name === resolvedEntity);
              const expectedUrl = expectedEnt?.googleScriptUrl || '';

              const matchesUrl = isDefault 
                ? (expectedUrl.trim() === '') 
                : (expectedUrl.trim() === url);

              if (matchesUrl) {
                allRawEmployees.push(e);
              }
            });
          }

          if (payload.performances) {
            payload.performances.forEach((p: any) => {
              allRawPerformances.push(p);
            });
          }

          if (payload.payroll_records_2026) {
            payload.payroll_records_2026.forEach((r: any) => {
              allRawPayrollRecords.push(r);
            });
          }

          if (payload.candidates) {
            payload.candidates.forEach((c: any) => {
              allRawCandidates.push(c);
            });
          }
        }

        // Deduplicate using Map to ensure zero overlap/duplicate keys
        const uniqueEmployees = Array.from(new Map(allRawEmployees.map(e => [String(e.email || '').toLowerCase(), e])).values());
        const uniquePerformances = Array.from(new Map(allRawPerformances.map(p => [`${String(p.employeeEmail || p.employeeId || '').toLowerCase()}_${p.reviewCycleId}`, p])).values());
        const uniquePayrollRecords = Array.from(new Map(allRawPayrollRecords.map(r => [r.id || `${r.employeeEmail}_${r.payrollMonth}_${r.payrollYear}`, r])).values());
        const uniqueCandidates = Array.from(new Map(allRawCandidates.map(c => [c.id || c.email || c.name, c])).values());

        // Parse employees
        setEmployees(uniqueEmployees.map((e: any) => {
          let careerHistory = [];
          let dependants = [];
          let historicalPayrollRecords = [];
          let effectiveDatedProfiles = [];
          let historicalPcbResults = [];
          let historicalVariances = [];
          let tp1Declarations = [];
          let tp3Data = undefined;
          
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
          try {
            if (e.historicalPayrollRecords && typeof e.historicalPayrollRecords === 'string') {
              historicalPayrollRecords = JSON.parse(e.historicalPayrollRecords);
            } else if (Array.isArray(e.historicalPayrollRecords)) {
              historicalPayrollRecords = e.historicalPayrollRecords;
            }
          } catch (err) {
            console.error('Error parsing historicalPayrollRecords for employee', e.id, err);
          }
          try {
            if (e.effectiveDatedProfiles && typeof e.effectiveDatedProfiles === 'string') {
              effectiveDatedProfiles = JSON.parse(e.effectiveDatedProfiles);
            } else if (Array.isArray(e.effectiveDatedProfiles)) {
              effectiveDatedProfiles = e.effectiveDatedProfiles;
            }
          } catch (err) {
            console.error('Error parsing effectiveDatedProfiles for employee', e.id, err);
          }
          try {
            if (e.historicalPcbResults && typeof e.historicalPcbResults === 'string') {
              historicalPcbResults = JSON.parse(e.historicalPcbResults);
            } else if (Array.isArray(e.historicalPcbResults)) {
              historicalPcbResults = e.historicalPcbResults;
            }
          } catch (err) {
            console.error('Error parsing historicalPcbResults for employee', e.id, err);
          }
          try {
            if (e.historicalVariances && typeof e.historicalVariances === 'string') {
              historicalVariances = JSON.parse(e.historicalVariances);
            } else if (Array.isArray(e.historicalVariances)) {
              historicalVariances = e.historicalVariances;
            }
          } catch (err) {
            console.error('Error parsing historicalVariances for employee', e.id, err);
          }
          try {
            if (e.tp1Declarations && typeof e.tp1Declarations === 'string') {
              tp1Declarations = JSON.parse(e.tp1Declarations);
            } else if (Array.isArray(e.tp1Declarations)) {
              tp1Declarations = e.tp1Declarations;
            }
          } catch (err) {
            console.error('Error parsing tp1Declarations for employee', e.id, err);
          }
          try {
            if (e.tp3Data && typeof e.tp3Data === 'string') {
              tp3Data = JSON.parse(e.tp3Data);
            } else if (typeof e.tp3Data === 'object' && e.tp3Data !== null) {
              tp3Data = e.tp3Data;
            }
          } catch (err) {
            console.error('Error parsing tp3Data for employee', e.id, err);
          }
          let salaryAdjustments = [];
          try {
            if (e.salaryAdjustments && typeof e.salaryAdjustments === 'string') {
              salaryAdjustments = JSON.parse(e.salaryAdjustments);
            } else if (Array.isArray(e.salaryAdjustments)) {
              salaryAdjustments = e.salaryAdjustments;
            }
          } catch (err) {
            console.error('Error parsing salaryAdjustments for employee', e.id, err);
          }
          let resolvedEntityId = e.entityName || e.entityId || '';
          if (resolvedEntityId === 'Red Point Sdn Bhd' || resolvedEntityId === 'ENT-92' || resolvedEntityId === 'ENT-01') {
            resolvedEntityId = 'ENT-92';
          } else if (resolvedEntityId === 'YSYD Sdn Bhd' || resolvedEntityId === 'ENT-86' || resolvedEntityId === 'ENT-02') {
            resolvedEntityId = 'ENT-86';
          }

          return {
            id: e.email || '',
            entityId: resolvedEntityId,
            name: e.name || '',
            email: e.email || '',
            designation: e.designation || '',
            department: e.department || '',
            status: (e.status || 'Active') as any,
            bankName: e.bankName || '',
            accountNo: e.accountNo || '',
            basicSalary: Number(e.basicSalary || 0),
            housingAllowance: Number(e.housingAllowance || 0),
            transportAllowance: Number(e.transportAllowance || 0),
            overtime: Number(e.overtime || 0),
            performanceBonus: Number(e.performanceBonus || 0),
            epfRateEmployee: Number(e.epfRateEmployee !== undefined ? e.epfRateEmployee : 11),
            epfRateEmployer: Number(e.epfRateEmployer !== undefined ? e.epfRateEmployer : 13),
            socsoEmployee: Number(e.socsoEmployee || 0),
            socsoEmployer: Number(e.socsoEmployer || 0),
            eisEmployee: Number(e.eisEmployee || 0),
            eisEmployer: Number(e.eisEmployer || 0),
            taxPcb: Number(e.taxPcb || 0),
            unpaidLeave: Number(e.unpaidLeave || 0),
            hrdCorp: Number(e.hrdCorp || 0),
            avatarUrl: e.avatarUrl || '',
            gender: e.gender || 'Male',
            nricPassport: e.nricPassport || '',
            nationality: e.nationality || 'Malaysian',
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
            dateOfConfirmation: e.dateOfConfirmation || '',
            careerHistory,
            dependants,
            allowanceGeneral: Number(e.allowanceGeneral || 0),
            allowanceTransport: Number(e.allowanceTransport || 0),
            allowanceParking: Number(e.allowanceParking || 0),
            allowanceMeal: Number(e.allowanceMeal || 0),
            allowanceAccommodation: Number(e.allowanceAccommodation || 0),
            allowancePhone: Number(e.allowancePhone || 0),
            reimbursementAmount: Number(e.reimbursementAmount || 0),
            reimbursementDesc: e.reimbursementDesc || '',
            bonusAmount: Number(e.bonusAmount || 0),
            bonusDesc: e.bonusDesc || '',
            commissionAmount: Number(e.commissionAmount || 0),
            commissionDesc: e.commissionDesc || '',
            backPayAmount: Number(e.backPayAmount || 0),
            backPayDesc: e.backPayDesc || '',
            awsAmount: Number(e.awsAmount || 0),
            awsDesc: e.awsDesc || '',
            compensationAmount: Number(e.compensationAmount || 0),
            compensationDesc: e.compensationDesc || '',
            deductionInLieu: Number(e.deductionInLieu || 0),
            deductionCp38: Number(e.deductionCp38 || 0),
            deductionOthers: Number(e.deductionOthers || 0),
            deductionOthersDesc: e.deductionOthersDesc || '',
            spouseName: e.spouseName || '',
            spouseNric: e.spouseNric || '',
            spouseIsWorking: e.spouseIsWorking || 'No',
            spouseCompany: e.spouseCompany || '',
            spousePosition: e.spousePosition || '',
            hasDependants: e.hasDependants || 'No',
            icFrontUrl: e.icFrontUrl || '',
            icBackUrl: e.icBackUrl || '',
            educationCertUrl: e.educationCertUrl || '',
            skbbkEmployee: Number(e.skbbkEmployee || 0),
            skbbkEmployer: Number(e.skbbkEmployer || 0),
            historicalPayrollRecords,
            effectiveDatedProfiles,
            historicalPcbResults,
            historicalVariances,
            tp1Declarations,
            tp3Data,
            salaryAdjustments
          };
        }));

        // Parse performances
        setPerformances(uniquePerformances.map((p: any) => ({
          employeeId: p.employeeEmail || p.employeeId || '',
          reviewCycleId: p.reviewCycleId || '',
          managerName: p.managerName || '',
          reviewStatus: p.reviewStatus || 'Not Started',
          rating: Number(p.rating || 0),
          teamworkScore: Number(p.teamworkScore || 0),
          communicationScore: Number(p.communicationScore || 0),
          problemSolvingScore: Number(p.problemSolvingScore || 0),
          selfEvaluation: p.selfEvaluation || '',
          managerComments: p.managerComments || '',
          goals: (() => {
            try {
              if (p.goals && typeof p.goals === 'string') {
                return JSON.parse(p.goals);
              }
              return Array.isArray(p.goals) ? p.goals : [];
            } catch (err) {
              return [];
            }
          })()
        })));

        // Parse candidates
        setCandidates(uniqueCandidates.map((c: any) => {
          let resolvedEntityId = c.entityName || c.entityId || '';
          if (resolvedEntityId === 'Red Point Sdn Bhd' || resolvedEntityId === 'ENT-92' || resolvedEntityId === 'ENT-01') {
            resolvedEntityId = 'ENT-92';
          } else if (resolvedEntityId === 'YSYD Sdn Bhd' || resolvedEntityId === 'ENT-86' || resolvedEntityId === 'ENT-02') {
            resolvedEntityId = 'ENT-86';
          }
          return {
            id: c.id || '',
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            designation: c.designation || '',
            department: c.department || 'Engineering',
            entityId: resolvedEntityId,
            stage: c.stage as any,
            progress: Number(c.progress || 0),
            dateJoined: c.dateJoined || ''
          };
        }));

        // Parse payroll records
        setPayrollRecords2026(uniquePayrollRecords.map((r: any) => ({
          id: r.id || '',
          employeeEmail: r.employeeEmail || '',
          payrollMonth: Number(r.payrollMonth || 1),
          payrollYear: Number(r.payrollYear || 2026),
          basicSalary: Number(r.basicSalary || 0),
          allowanceGeneral: Number(r.allowanceGeneral || 0),
          allowanceTransport: Number(r.allowanceTransport || 0),
          allowanceParking: Number(r.allowanceParking || 0),
          allowanceMeal: Number(r.allowanceMeal || 0),
          allowanceAccommodation: Number(r.allowanceAccommodation || 0),
          allowancePhone: Number(r.allowancePhone || 0),
          overtime: Number(r.overtime || 0),
          bonusAmount: Number(r.bonusAmount || 0),
          commissionAmount: Number(r.commissionAmount || 0),
          backPayAmount: Number(r.backPayAmount || 0),
          awsAmount: Number(r.awsAmount || 0),
          compensationAmount: Number(r.compensationAmount || 0),
          reimbursementAmount: Number(r.reimbursementAmount || 0),
          unpaidLeave: Number(r.unpaidLeave || 0),
          deductionInLieu: Number(r.deductionInLieu || 0),
          deductionCp38: Number(r.deductionCp38 || 0),
          deductionOthers: Number(r.deductionOthers || 0),
          actualPCBDeducted: Number(r.actualPCBDeducted || 0),
          epfEmployee: Number(r.epfEmployee || 0),
          epfEmployer: Number(r.epfEmployer || 0),
          socsoEmployee: Number(r.socsoEmployee || 0),
          socsoEmployer: Number(r.socsoEmployer || 0),
          eisEmployee: Number(r.eisEmployee || 0),
          eisEmployer: Number(r.eisEmployer || 0),
          netPay: Number(r.netPay || 0),
          createdAt: r.createdAt || ''
        })));
      } catch (err) {
        console.error('[Google Sheets Load] Error loading database tables:', err);
      } finally {
        setIsLoadingDb(false);
      }
    }

    loadData();
  }, []);

  // Active corporate views
  const activeEntity = entities.find(e => e.id === activeEntityId) || entities[0];

  const handleCorporateSwitch = (id: string) => {
    const matched = entities.find(e => e.id === id);
    if (matched) {
      setSwitchingToEntityName(matched.name);
      setIsSwitchingEntity(true);
      localStorage.setItem('active_corporate_entity_id', id);

      // Step 1: Update active entity ID in the background (hidden under solid cover) after mount
      setTimeout(() => {
        setActiveEntityId(id);
        setIsMobileSidebarOpen(false);

        // Step 2: Smoothly dismiss loader after layout updates have settled
        setTimeout(() => {
          setIsSwitchingEntity(false);

          triggerNotification(
            'Corporate View Switched',
            `Now viewing as ${matched.name}. App branding, colors, and logo have synced.`,
            'success'
          );
        }, 300);
      }, 200);
    }
  };

  const handleTabChange = (tab: AppTab) => {
    setCurrentTab(tab);
    if (activeEntityId) {
      localStorage.setItem(`active_tab_${activeEntityId}`, tab);
    }
  };

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
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [taxRate, setTaxRate] = useState(() => {
    const saved = localStorage.getItem('company_tax_rate');
    return saved ? Number(saved) : 11;
  });

  // Keep settings states in sync with active subsidiary (activeEntity)
  useEffect(() => {
    if (activeEntity) {
      setCompanyName(activeEntity.name);
      setCurrencySymbol(activeEntity.currency);
      setCompanyLogoUrl(activeEntity.logoUrl || '');
    }
  }, [activeEntityId, activeEntity]);

  // Restore persisted tab per-entity on entity switch
  useEffect(() => {
    if (activeEntityId) {
      const persistedTab = localStorage.getItem(`active_tab_${activeEntityId}`);
      if (persistedTab) {
        setCurrentTab(persistedTab as AppTab);
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [activeEntityId]);

  // GMT+8 Real-Time Clock
  const [gmt8TimeStr, setGmt8TimeStr] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now);
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      setGmt8TimeStr(`${dateStr} ${timeStr}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const getScriptUrlForEntity = (entityNameOrId?: string): string | undefined => {
    if (!entityNameOrId) return undefined;
    
    let name = entityNameOrId;
    if (name === 'ENT-01' || name === 'ENT-92') {
      name = 'Red Point Sdn Bhd';
    } else if (name === 'ENT-02' || name === 'ENT-86') {
      name = 'YSYD Sdn Bhd';
    }

    const ent = entities.find(e => e.name === name || e.id === name);
    return ent?.googleScriptUrl && ent.googleScriptUrl.trim() !== '' 
      ? ent.googleScriptUrl.trim() 
      : undefined;
  };

  // Database Action Mutators
  const handleAddCandidate = async (newCandidate: Candidate) => {
    setCandidates(prev => [...prev, newCandidate]);

    if (isGoogleConfigured) {
      try {
        const scriptUrl = getScriptUrlForEntity(newCandidate.entityId);
        await googleSheetsClient.insert('candidates', {
          id: newCandidate.id,
          name: newCandidate.name,
          email: newCandidate.email,
          phone: newCandidate.phone,
          designation: newCandidate.designation,
          department: newCandidate.department,
          entityName: newCandidate.entityId === 'ENT-92' ? 'Red Point Sdn Bhd' : (newCandidate.entityId === 'ENT-86' ? 'YSYD Sdn Bhd' : newCandidate.entityId),
          stage: newCandidate.stage,
          progress: newCandidate.progress,
          dateJoined: newCandidate.dateJoined
        }, scriptUrl);
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
        const candidateObj = candidates.find(c => c.id === id);
        const scriptUrl = getScriptUrlForEntity(updates.entityId || candidateObj?.entityId);
        const payloadUpdates: any = { ...updates };
        if (updates.entityId !== undefined) {
          payloadUpdates.entityName = updates.entityId;
          delete payloadUpdates.entityId;
        }
        await googleSheetsClient.update('candidates', id, payloadUpdates, 'id', scriptUrl);
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
        const scriptUrl = getScriptUrlForEntity(newEmployee.entityId);
        await googleSheetsClient.insert('employees', {
          entityName: newEmployee.entityId === 'ENT-92' ? 'Red Point Sdn Bhd' : (newEmployee.entityId === 'ENT-86' ? 'YSYD Sdn Bhd' : newEmployee.entityId),
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
          gender: newEmployee.gender || 'Male',
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
          dateOfConfirmation: newEmployee.dateOfConfirmation || '',
          allowanceGeneral: newEmployee.allowanceGeneral || 0,
          allowanceTransport: newEmployee.allowanceTransport !== undefined ? newEmployee.allowanceTransport : newEmployee.transportAllowance || 0,
          allowanceParking: newEmployee.allowanceParking || 0,
          allowanceMeal: newEmployee.allowanceMeal || 0,
          allowanceAccommodation: newEmployee.allowanceAccommodation !== undefined ? newEmployee.allowanceAccommodation : newEmployee.housingAllowance || 0,
          allowancePhone: newEmployee.allowancePhone || 0,
          reimbursementAmount: newEmployee.reimbursementAmount || 0,
          reimbursementDesc: newEmployee.reimbursementDesc || '',
          bonusAmount: newEmployee.bonusAmount !== undefined ? newEmployee.bonusAmount : newEmployee.performanceBonus || 0,
          bonusDesc: newEmployee.bonusDesc || '',
          commissionAmount: newEmployee.commissionAmount || 0,
          commissionDesc: newEmployee.commissionDesc || '',
          backPayAmount: newEmployee.backPayAmount || 0,
          backPayDesc: newEmployee.backPayDesc || '',
          awsAmount: newEmployee.awsAmount || 0,
          awsDesc: newEmployee.awsDesc || '',
          compensationAmount: newEmployee.compensationAmount || 0,
          compensationDesc: newEmployee.compensationDesc || '',
          deductionInLieu: newEmployee.deductionInLieu || 0,
          deductionCp38: newEmployee.deductionCp38 || 0,
          deductionOthers: newEmployee.deductionOthers || 0,
          deductionOthersDesc: newEmployee.deductionOthersDesc || '',
          spouseName: newEmployee.spouseName || '',
          spouseNric: newEmployee.spouseNric || '',
          spouseIsWorking: newEmployee.spouseIsWorking || 'No',
          spouseCompany: newEmployee.spouseCompany || '',
          spousePosition: newEmployee.spousePosition || '',
          hasDependants: newEmployee.hasDependants || 'No',
          icFrontUrl: newEmployee.icFrontUrl || '',
          icBackUrl: newEmployee.icBackUrl || '',
          educationCertUrl: newEmployee.educationCertUrl || '',
          skbbkEmployee: newEmployee.skbbkEmployee || 0,
          skbbkEmployer: newEmployee.skbbkEmployer || 0,
          careerHistory: JSON.stringify(newEmployee.careerHistory || []),
          dependants: JSON.stringify(newEmployee.dependants || []),
          salaryAdjustments: JSON.stringify(newEmployee.salaryAdjustments || [])
        }, scriptUrl);

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeEmail: newEmployee.email,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'CREATE_EMPLOYEE',
          oldValue: '',
          newValue: JSON.stringify(newEmployee),
          createdAt: getGmt8Timestamp()
        }, scriptUrl);
      } catch (err: any) {
        console.error('[Google Sheets Insert] Failed to insert employee:', err);
        triggerNotification('Sync Failed', `Could not save new employee: ${err.message || err}`, 'info');
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const targetEmp = employees.find(e => e.id === id);
    const lookupKey = targetEmp?.name || id;
    setEmployees(prev => prev.filter(e => e.id !== id));
    setPerformances(prev => prev.filter(p => p.employeeId !== id));

    if (isGoogleConfigured) {
      try {
        const scriptUrl = getScriptUrlForEntity(targetEmp?.entityId);
        await googleSheetsClient.delete('employees', lookupKey, 'name', scriptUrl);

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeEmail: lookupKey,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'DELETE_EMPLOYEE',
          oldValue: `Employee Email: ${lookupKey}`,
          newValue: '',
          createdAt: getGmt8Timestamp()
        }, scriptUrl);
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
        if (updates.entityId !== undefined) payloadUpdates.entityName = updates.entityId;
        if (updates.avatarUrl !== undefined) payloadUpdates.avatarUrl = updates.avatarUrl;
        if (updates.gender !== undefined) payloadUpdates.gender = updates.gender;
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
        if (updates.dateOfConfirmation !== undefined) payloadUpdates.dateOfConfirmation = updates.dateOfConfirmation;
        if (updates.housingAllowance !== undefined) payloadUpdates.housingAllowance = updates.housingAllowance;
        if (updates.transportAllowance !== undefined) payloadUpdates.transportAllowance = updates.transportAllowance;
        if (updates.overtime !== undefined) payloadUpdates.overtime = updates.overtime;
        if (updates.performanceBonus !== undefined) payloadUpdates.performanceBonus = updates.performanceBonus;
        if (updates.allowanceGeneral !== undefined) payloadUpdates.allowanceGeneral = updates.allowanceGeneral;
        if (updates.allowanceTransport !== undefined) payloadUpdates.allowanceTransport = updates.allowanceTransport;
        if (updates.allowanceParking !== undefined) payloadUpdates.allowanceParking = updates.allowanceParking;
        if (updates.allowanceMeal !== undefined) payloadUpdates.allowanceMeal = updates.allowanceMeal;
        if (updates.allowanceAccommodation !== undefined) payloadUpdates.allowanceAccommodation = updates.allowanceAccommodation;
        if (updates.allowancePhone !== undefined) payloadUpdates.allowancePhone = updates.allowancePhone;
        if (updates.reimbursementAmount !== undefined) payloadUpdates.reimbursementAmount = updates.reimbursementAmount;
        if (updates.reimbursementDesc !== undefined) payloadUpdates.reimbursementDesc = updates.reimbursementDesc;
        if (updates.bonusAmount !== undefined) payloadUpdates.bonusAmount = updates.bonusAmount;
        if (updates.bonusDesc !== undefined) payloadUpdates.bonusDesc = updates.bonusDesc;
        if (updates.commissionAmount !== undefined) payloadUpdates.commissionAmount = updates.commissionAmount;
        if (updates.commissionDesc !== undefined) payloadUpdates.commissionDesc = updates.commissionDesc;
        if (updates.backPayAmount !== undefined) payloadUpdates.backPayAmount = updates.backPayAmount;
        if (updates.backPayDesc !== undefined) payloadUpdates.backPayDesc = updates.backPayDesc;
        if (updates.awsAmount !== undefined) payloadUpdates.awsAmount = updates.awsAmount;
        if (updates.awsDesc !== undefined) payloadUpdates.awsDesc = updates.awsDesc;
        if (updates.compensationAmount !== undefined) payloadUpdates.compensationAmount = updates.compensationAmount;
        if (updates.compensationDesc !== undefined) payloadUpdates.compensationDesc = updates.compensationDesc;
        if (updates.deductionInLieu !== undefined) payloadUpdates.deductionInLieu = updates.deductionInLieu;
        if (updates.deductionCp38 !== undefined) payloadUpdates.deductionCp38 = updates.deductionCp38;
        if (updates.deductionOthers !== undefined) payloadUpdates.deductionOthers = updates.deductionOthers;
        if (updates.deductionOthersDesc !== undefined) payloadUpdates.deductionOthersDesc = updates.deductionOthersDesc;
        if (updates.spouseName !== undefined) payloadUpdates.spouseName = updates.spouseName;
        if (updates.spouseNric !== undefined) payloadUpdates.spouseNric = updates.spouseNric;
        if (updates.spouseIsWorking !== undefined) payloadUpdates.spouseIsWorking = updates.spouseIsWorking;
        if (updates.spouseCompany !== undefined) payloadUpdates.spouseCompany = updates.spouseCompany;
        if (updates.spousePosition !== undefined) payloadUpdates.spousePosition = updates.spousePosition;
        if (updates.hasDependants !== undefined) payloadUpdates.hasDependants = updates.hasDependants;
        if (updates.icFrontUrl !== undefined) payloadUpdates.icFrontUrl = updates.icFrontUrl;
        if (updates.icBackUrl !== undefined) payloadUpdates.icBackUrl = updates.icBackUrl;
        if (updates.educationCertUrl !== undefined) payloadUpdates.educationCertUrl = updates.educationCertUrl;
        if (updates.skbbkEmployee !== undefined) payloadUpdates.skbbkEmployee = updates.skbbkEmployee;
        if (updates.skbbkEmployer !== undefined) payloadUpdates.skbbkEmployer = updates.skbbkEmployer;
        if (updates.careerHistory !== undefined) payloadUpdates.careerHistory = JSON.stringify(updates.careerHistory);
        if (updates.dependants !== undefined) payloadUpdates.dependants = JSON.stringify(updates.dependants);
        if (updates.historicalPayrollRecords !== undefined) payloadUpdates.historicalPayrollRecords = JSON.stringify(updates.historicalPayrollRecords);
        if (updates.effectiveDatedProfiles !== undefined) payloadUpdates.effectiveDatedProfiles = JSON.stringify(updates.effectiveDatedProfiles);
        if (updates.historicalPcbResults !== undefined) payloadUpdates.historicalPcbResults = JSON.stringify(updates.historicalPcbResults);
        if (updates.historicalVariances !== undefined) payloadUpdates.historicalVariances = JSON.stringify(updates.historicalVariances);
        if (updates.tp1Declarations !== undefined) payloadUpdates.tp1Declarations = JSON.stringify(updates.tp1Declarations);
        if (updates.tp3Data !== undefined) payloadUpdates.tp3Data = JSON.stringify(updates.tp3Data);
        if (updates.salaryAdjustments !== undefined) payloadUpdates.salaryAdjustments = JSON.stringify(updates.salaryAdjustments);

        const lookupKey = oldEmp?.name || id;
        const scriptUrl = getScriptUrlForEntity(updates.entityId || oldEmp?.entityId);
        await googleSheetsClient.update('employees', lookupKey, payloadUpdates, 'name', scriptUrl);

        await googleSheetsClient.insert('audit_logs', {
          id: `log_${Date.now()}`,
          employeeEmail: lookupKey,
          changedBy: currentUserEmail || 'admin@acme.com',
          changeType: 'UPDATE_EMPLOYEE',
          oldValue: JSON.stringify(oldEmp),
          newValue: JSON.stringify(updates),
          createdAt: getGmt8Timestamp()
        }, scriptUrl);
      } catch (err: any) {
        console.error('[Google Sheets Update] Failed to update employee:', err);
        triggerNotification('Sync Failed', `Could not update employee: ${err.message || err}`, 'info');
      }
    }
  };

  const handleSavePayrollRecord2026 = async (record: PayrollRecord2026) => {
    setPayrollRecords2026(prev => {
      const filtered = prev.filter(r => 
        r.id !== record.id && 
        !(r.employeeEmail.toLowerCase() === record.employeeEmail.toLowerCase() && 
          r.payrollMonth === record.payrollMonth && 
          r.payrollYear === record.payrollYear)
      );
      return [...filtered, record];
    });

    if (isGoogleConfigured) {
      try {
        const emp = employees.find(e => e.email?.toLowerCase() === record.employeeEmail?.toLowerCase());
        const scriptUrl = getScriptUrlForEntity(emp?.entityId);
        try {
          await googleSheetsClient.update('payroll_records_2026', record.id, record, 'id', scriptUrl);
          console.log('[Google Sheets] Updated payroll record successfully:', record.id);
        } catch (updateErr: any) {
          console.warn('[Google Sheets] Update failed or record not found, inserting:', updateErr);
          await googleSheetsClient.insert('payroll_records_2026', record, scriptUrl);
          console.log('[Google Sheets] Inserted payroll record successfully:', record.id);
        }
      } catch (err: any) {
        console.error('[Google Sheets] Failed to save payroll record 2026:', err);
        triggerNotification('Sync Failed', `Could not save payroll record: ${err.message || err}`, 'info');
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
        const emp = employees.find(e => e.email?.toLowerCase() === updatedPerf.employeeId?.toLowerCase());
        const scriptUrl = getScriptUrlForEntity(emp?.entityId);
        const payloadPerf = {
          employeeEmail: updatedPerf.employeeId,
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
          employeeEmail: updatedPerf.employeeId,
          reviewCycleId: updatedPerf.reviewCycleId
        }, payloadPerf, scriptUrl);
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
          name: newEntity.name,
          registrationNumber: newEntity.registrationNumber,
          address: newEntity.address,
          taxReferenceNo: newEntity.taxReferenceNo,
          epfReferenceNo: newEntity.epfReferenceNo,
          socsoReferenceNo: newEntity.socsoReferenceNo,
          currency: newEntity.currency,
          isActive: newEntity.isActive,
          theme: newEntity.theme,
          logoUrl: newEntity.logoUrl || '',
          googleScriptUrl: newEntity.googleScriptUrl || ''
        });
      } catch (err: any) {
        console.error('[Google Sheets Entity Insert] Failed:', err);
        triggerNotification('Sync Failed', `Could not save new entity: ${err.message || err}`, 'info');
      }
    }
  };

  const handleUpdateEntity = async (id: string, updates: Partial<CorporateEntity>) => {
    setEntities(prev => prev.map(ent => {
      if (ent.id === id) {
        const updated = { ...ent, ...updates };
        if (updates.name !== undefined) {
          updated.id = updates.name;
        }
        return updated;
      }
      return ent;
    }));

    if (updates.name !== undefined) {
      if (activeEntityId === id) {
        setActiveEntityId(updates.name);
      }
      setEmployees(prev => prev.map(emp => emp.entityId === id ? { ...emp, entityId: updates.name! } : emp));
      setCandidates(prev => prev.map(cand => cand.entityId === id ? { ...cand, entityId: updates.name! } : cand));
    }

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
        if (updates.logoUrl !== undefined) payloadUpdates.logoUrl = updates.logoUrl;
        if (updates.googleScriptUrl !== undefined) payloadUpdates.googleScriptUrl = updates.googleScriptUrl;

        await googleSheetsClient.update('corporate_entities', id, payloadUpdates, 'name');
      } catch (err: any) {
        console.error('[Google Sheets Entity Update] Failed:', err);
        triggerNotification('Sync Failed', `Could not update entity: ${err.message || err}`, 'info');
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

  if (isLoadingDb) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-[#3A2E2B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono font-bold text-[#3A2E2B] uppercase tracking-widest animate-pulse">Synchronizing HR Database...</p>
        </div>
      </div>
    );
  }

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
    <EntityContextProvider
      entities={entities}
      activeEntityId={activeEntityId}
      isSwitchingEntity={isSwitchingEntity}
      onSwitchEntity={async (id) => handleCorporateSwitch(id)}
    >
      <div style={getThemeStyles(activeEntity?.theme)} className="flex h-screen bg-background overflow-hidden relative font-sans text-on-background select-none">
      
      {/* Premium Glassmorphic Loading Overlay */}
      {isSwitchingEntity && (
        <div className="fixed inset-0 bg-[#121212] z-[9999] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in font-sans">
          <div className="relative flex flex-col items-center max-w-md w-full animate-fade-in">
            {/* Double Rotating Glowing Rings */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-b-transparent border-[#f7f0e0]/20 animate-spin-slow"></div>
              <div className="absolute inset-2 rounded-full border-4 border-r-transparent border-l-transparent border-[#f7f0e0] animate-spin-reverse-slow"></div>
              
              {/* Central Glowing Core Symbol */}
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 animate-pulse-glow shadow-lg">
                <span className="text-white font-bold text-sm tracking-widest uppercase">HR</span>
              </div>
            </div>

            {/* Entity Switch Metadata Info */}
            <h2 className="text-xl font-bold mt-8 tracking-wider text-white uppercase font-display">
              Corporate Context Switch
            </h2>
            <div className="w-12 h-0.5 bg-[#f7f0e0] mt-3 mb-4 rounded-full opacity-60"></div>
            
            <p className="text-sm text-neutral-300 tracking-wide">
              Transitioning secure ledger references and statutory profiles to:
            </p>
            <p className="text-lg font-bold text-white mt-1 shadow-sm font-display tracking-tight">
              {switchingToEntityName}
            </p>

            <div className="mt-8 flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold animate-pulse">
                Synchronizing Google sheets...
              </span>
            </div>
          </div>
        </div>
      )}

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
        onTabChange={handleTabChange} 
        onNewRequest={() => setIsRequestModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        entities={entities}
        activeEntityId={activeEntityId}
        onChangeActiveEntity={handleCorporateSwitch}
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
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Local Time (Kuala Lumpur)</span>
              <span className="text-xs font-mono font-bold text-on-surface">{gmt8TimeStr || 'Loading clock...'}</span>
            </div>

            <div className="w-px h-8 bg-neutral-border/40 hidden md:block" />

            {/* Notifications Alert Bell */}
            <button 
              onClick={() => {
                const currentCycleId = reviewCycles[0]?.id || 'cycle-2026-annual';
                const completedCount = performances.filter(p => p.reviewCycleId === currentCycleId && p.reviewStatus === 'Completed').length;
                const pendingCount = Math.max(0, employees.length - completedCount);
                triggerNotification('HR Directives', `You have ${pendingCount} outstanding performance reviews due.`, 'info');
              }}
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
              employees={filteredEmployeesWithHistory}
              entities={entities}
              reviewCycles={reviewCycles}
              performances={filteredPerformances}
              onNavigate={setCurrentTab}
              onOpenNewEmployeeModal={() => {
                setCurrentTab('directory');
                triggerNotification('Directory Navigated', 'Click Add New Employee to register custom personnel.', 'info');
              }}
              onOpenRequestModal={() => setIsRequestModalOpen(true)}
              activeEntityId={activeEntityId}
              onChangeActiveEntity={handleCorporateSwitch}
            />
          )}

          {currentTab === 'payroll' && (
            <PayrollView 
              employees={filteredEmployeesWithHistory}
              entities={entities}
              payrollRecords2026={filteredPayrollRecords2026}
              onSavePayrollRecord2026={handleSavePayrollRecord2026}
              onUpdateEmployeeSalary={handleUpdateEmployeeSalary}
              onNavigateToDocument={handleNavigateToDocument}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'payslip-viewer' && (
            <PayslipDocumentView 
              employees={filteredEmployeesWithHistory}
              selectedEmployeeId={selectedEmployeeId}
              onBack={() => setCurrentTab('payroll')}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'performance' && (
            <PerformanceView 
              employees={filteredEmployees}
              performances={filteredPerformances}
              reviewCycles={reviewCycles}
              onSavePerformance={handleSavePerformance}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'directory' && (
            <EmployeeDirectoryView 
              employees={filteredEmployees}
              entities={entities}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onUpdateEmployee={handleUpdateEmployeeSalary}
              onShowNotification={triggerNotification}
              activeEntityId={activeEntityId}
            />
          )}

          {currentTab === 'entities' && (
            <EntitiesView 
              entities={entities}
              employees={filteredEmployees}
              onAddEntity={handleAddEntity}
              onUpdateEntity={handleUpdateEntity}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'tax-settings' && (
            <TaxSettingsView 
              employees={filteredEmployees}
              onUpdateEmployee={handleUpdateEmployeeSalary}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView 
              employees={filteredEmployeesWithHistory}
              performances={filteredPerformances}
              onShowNotification={triggerNotification}
            />
          )}

          {currentTab === 'leave-management' && (
            <LeaveManagementView 
              employees={filteredEmployees}
              onShowNotification={triggerNotification}
              activeEntityId={activeEntityId}
            />
          )}

          {currentTab === 'forms-directory' && (
            <FormsDirectoryView 
              employees={filteredEmployees}
              onShowNotification={triggerNotification}
              activeEntity={activeEntity}
            />
          )}

          {currentTab === 'hire-onboarding' && (
            <HireOnboardingView 
              entities={entities}
              onShowNotification={triggerNotification}
              onAddEmployee={handleAddEmployee}
              candidates={filteredCandidates}
              onAddCandidate={handleAddCandidate}
              onUpdateCandidate={handleUpdateCandidate}
            />
          )}

          {currentTab === 'department-role' && (
            <DepartmentRoleView 
              onShowNotification={triggerNotification}
              activeEntityId={activeEntityId}
            />
          )}

          {/* Tab: Settings Panel */}
          {currentTab === 'settings' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="max-w-2xl mx-auto bg-white border border-neutral-border rounded-lg p-6 shadow-sm space-y-6">
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

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Company Logo</label>
                    <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded border border-neutral-border/60">
                      <div className="w-12 h-12 rounded border border-neutral-border bg-white flex items-center justify-center overflow-hidden shrink-0 relative">
                        {companyLogoUrl && !companyLogoUrl.includes('placeholder') && !companyLogoUrl.includes('example.com') ? (
                          <>
                            <img 
                              src={companyLogoUrl} 
                              alt="Logo preview" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs uppercase">
                              {activeEntity?.name ? activeEntity.name.substring(0, 2) : 'HR'}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs uppercase">
                            {activeEntity?.name ? activeEntity.name.substring(0, 2) : 'HR'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5 text-left">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!isGoogleConfigured) {
                              // Offline fallback
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setCompanyLogoUrl(reader.result as string);
                                triggerNotification('Logo Uploaded', 'New company logo loaded in preview. Click Apply System Changes to save.', 'success');
                              };
                              reader.readAsDataURL(file);
                              return;
                            }

                            try {
                              triggerNotification('Uploading Logo', 'Uploading company logo to Google Drive...', 'info');
                              const scriptUrl = getScriptUrlForEntity(activeEntity?.id);
                              const publicUrl = await googleSheetsClient.uploadFile(file, scriptUrl);
                              setCompanyLogoUrl(publicUrl);
                              triggerNotification('Logo Uploaded', 'New company logo uploaded successfully. Click Apply System Changes to save.', 'success');
                            } catch (err: any) {
                              console.error('[Google Drive Logo Upload] Error:', err);
                              triggerNotification('Upload Error', `Could not upload logo: ${err.message}`, 'info');
                            }
                          }}
                          className="w-full text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder="Or enter logo image URL..."
                          value={companyLogoUrl}
                          onChange={(e) => setCompanyLogoUrl(e.target.value)}
                          className="w-full bg-white border border-neutral-border rounded p-1.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
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

                  {isGoogleConfigured && (
                    <div className="pt-6 border-t border-neutral-border space-y-4">
                      <div>
                        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Google Sheets Database Administration</h3>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">Initialize or seed your Google Spreadsheet with default corporate entities, mock employee records, appraisal data, and login credentials.</p>
                      </div>
                      <div>
                        <button
                          onClick={handleSeedDatabase}
                          disabled={isSeeding}
                          className="bg-primary text-white text-xs font-semibold py-2 px-4 rounded hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSeeding ? 'Seeding Database...' : 'Seed Database with Default Presets'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-neutral-border flex justify-end">
                  <button 
                    onClick={async () => {
                      localStorage.setItem('company_tax_rate', String(taxRate));
                      if (activeEntity) {
                        await handleUpdateEntity(activeEntity.id, {
                          name: companyName,
                          currency: currencySymbol,
                          logoUrl: companyLogoUrl
                        });
                        triggerNotification('Settings Saved', 'Company settings and global variables synchronized successfully.');
                      } else {
                        triggerNotification('Settings Saved', 'Global override variables recalculated successfully.');
                      }
                      setCurrentTab('dashboard');
                    }}
                    className="bg-primary text-white text-xs font-semibold py-2 px-6 rounded hover:bg-primary-container"
                  >
                    Apply System Changes
                  </button>
                </div>
              </div>

              {/* Card 2: PERKESO Statutory Configuration */}
              <div className="max-w-6xl mx-auto bg-white border border-neutral-border rounded-lg p-6 shadow-sm space-y-4">
                <div className="border-b border-neutral-border pb-3">
                  <h2 className="text-base font-bold text-primary uppercase tracking-wider">PERKESO Statutory Contribution Configuration</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Manage rules, brackets, and phase compliance matrices for PERKESO.</p>
                </div>
                <SocsoConfigAdminView />
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
    </EntityContextProvider>
  );
}
