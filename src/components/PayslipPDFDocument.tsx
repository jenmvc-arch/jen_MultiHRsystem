import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel, getDirectLogoUrl, getAdjustedBasicSalary, calculateSocsoContribution } from '../data';
import { formatToDDMMMYYYY } from '../lib/dateUtils';

// Create styles for React PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingHorizontal: 30,
    paddingVertical: 25,
    lineHeight: 1.35,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 10,
    right: 30,
    fontSize: 6,
    color: '#d1d5db',
    fontFamily: 'Helvetica-Bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    borderBottomWidth: 3,
    borderBottomColor: '#A32626',
    paddingBottom: 8,
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholder: {
    width: 120,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 44,
    objectFit: 'contain',
    borderRadius: 4,
  },
  logoText: {
    fontSize: 12,
    color: '#A32626',
    fontFamily: 'Helvetica-Bold',
  },
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
  },
  companyReg: {
    fontSize: 7,
    color: '#333333',
    fontFamily: 'Helvetica-Bold',
    marginTop: 1,
  },
  companyAddress: {
    fontSize: 7,
    color: '#333333',
    marginTop: 2,
    maxWidth: 240,
  },
  rightHeaderBlock: {
    backgroundColor: '#A32626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    minWidth: 90,
  },
  rightHeaderLabel: {
    color: '#F2E8D8',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  rightHeaderMonth: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginTop: 1,
  },
  detailsCard: {
    backgroundColor: '#F2E8D8',
    borderWidth: 1,
    borderColor: '#E5DED5',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  detailsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DED5',
    paddingBottom: 2,
    marginBottom: 4,
  },
  detailsTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
    textTransform: 'uppercase',
  },
  employeeName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsCol: {
    width: '32%',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabelLeft: {
    width: 80,
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
  },
  detailLabelMiddle: {
    width: 60,
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
  },
  detailLabel: {
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
  },
  detailValue: {
    flex: 1,
    fontSize: 7,
    color: '#333333',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'left',
  },
  bankTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
    marginBottom: 3,
  },
  bankBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: '#E5DED5',
    borderRadius: 3,
    padding: 3,
  },
  bankText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  tableContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tableCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5DED5',
    borderRadius: 5,
    padding: 6,
    backgroundColor: '#ffffff',
  },
  tableHeaderBlock: {
    backgroundColor: '#A32626',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  tableHeaderTitle: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tableThRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DED5',
    paddingBottom: 2,
    marginBottom: 3,
  },
  tableThText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#A32626',
    paddingVertical: 3,
    marginTop: 4,
  },
  tableTotalText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
  },
  tableRowSocsoTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    backgroundColor: '#F2E8D8',
    paddingHorizontal: 3,
    borderRadius: 2,
    marginVertical: 1,
  },
  itemName: {
    fontSize: 7,
    color: '#333333',
  },
  itemVal: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    textAlign: 'right',
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F2E8D8',
    borderWidth: 1,
    borderColor: '#E5DED5',
    borderRadius: 5,
    padding: 6,
    flexDirection: 'column',
    justifyContent: 'center',
    height: 38,
  },
  summaryCardNetPay: {
    flex: 1,
    backgroundColor: '#A32626',
    borderRadius: 5,
    padding: 6,
    flexDirection: 'column',
    justifyContent: 'center',
    height: 38,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  summaryLabelNetPay: {
    fontSize: 7,
    color: '#F2E8D8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    marginTop: 1,
  },
  summaryValueNetPay: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 1,
  },
  contributionsCard: {
    backgroundColor: '#F2E8D8',
    borderWidth: 1.5,
    borderColor: '#D8CFC4',
    borderRadius: 5,
    padding: 6,
    marginBottom: 10,
  },
  contributionsTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  contributionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributionCol: {
    flex: 1,
    alignItems: 'center',
  },
  contributionDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: '#D8CFC4',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5DED5',
    paddingTop: 6,
    marginBottom: 6,
  },
  footerCol: {
    width: '48%',
  },
  footerTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#A32626',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  footerText: {
    fontSize: 7,
    color: '#6b7280',
    lineHeight: 1.25,
  },
  footerTextBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  confidentialBar: {
    backgroundColor: '#A32626',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidentialBarText: {
    color: '#ffffff',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  confidentialBarLabel: {
    color: '#F2E8D8',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});

interface PayslipPDFDocumentProps {
  employee: Employee;
  entity: CorporateEntity;
  month?: number;
  year?: number;
}

export const PayslipPDFDocument = ({ employee, entity, month = 10, year = 2026 }: PayslipPDFDocumentProps) => {
  const breakdown = calculatePayslip(employee, month, year);

  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isEligible = 
    employee.employmentType === 'Probationary' || 
    employee.employmentType === 'Confirmation' || 
    (employee.employmentType === 'Independent Contractor / Freelance' && employee.eligibleForStatutory === 'Yes');

  // Complete allowances list matching the HTML Payslip preview
  const allowanceGen = employee.allowanceGeneral || 0;
  const allowanceTrans = employee.allowanceTransport !== undefined ? employee.allowanceTransport : (employee.transportAllowance || 0);
  const allowanceAccom = employee.allowanceAccommodation !== undefined ? employee.allowanceAccommodation : (employee.housingAllowance || 0);
  const allowancePark = employee.allowanceParking || 0;
  const allowanceMeal = employee.allowanceMeal || 0;
  const allowancePhone = employee.allowancePhone || 0;

  const overtimeVal = employee.overtime || 0;
  const bonusVal = employee.bonusAmount !== undefined ? employee.bonusAmount : (employee.performanceBonus || 0);
  const commissionVal = employee.commissionAmount || 0;
  const backPayVal = employee.backPayAmount || 0;
  const awsVal = employee.awsAmount || 0;
  const compensationVal = employee.compensationAmount || 0;
  const reimbursementVal = employee.reimbursementAmount || 0;
  const unpaidLeaveVal = employee.unpaidLeave || 0;

  const basicSalaryForSocso = getAdjustedBasicSalary(employee, month, year);
  const payrollItemsForSocso = [
    { code: 'basic_salary', amount: basicSalaryForSocso },
    { code: 'overtime', amount: overtimeVal },
    { code: 'commission', amount: commissionVal },
    { code: 'allowance_general', amount: allowanceGen },
    { code: 'allowance_transport', amount: allowanceTrans },
    { code: 'allowance_parking', amount: allowancePark },
    { code: 'allowance_meal', amount: allowanceMeal },
    { code: 'allowance_accommodation', amount: allowanceAccom },
    { code: 'allowance_phone', amount: allowancePhone },
    { code: 'backpay', amount: backPayVal }
  ];
  if (unpaidLeaveVal > 0) {
    payrollItemsForSocso.push({ code: 'unpaid_leave', amount: unpaidLeaveVal });
  }

  const socsoRes = calculateSocsoContribution({
    employee,
    payrollPeriod: `${year}-${String(month).padStart(2, '0')}`,
    payrollItems: payrollItemsForSocso
  });

  const skbbkEmployeeVal = isEligible ? socsoRes.employeeLindung24 : 0;

  // Deductions breakdown
  const epfRateEmp = employee.epfRateEmployee || 11;
  const epfEmployeeValue = breakdown.epfEmployeeValue;
  const socsoEmployeeVal = isEligible ? socsoRes.employeeInvalidity : 0;
  const eisEmployeeVal = breakdown.eisEmployeeVal;
  const taxPcbVal = breakdown.taxPcbVal;
  const deductionInLieuVal = employee.deductionInLieu || 0;
  const deductionCp38Val = employee.deductionCp38 || 0;
  const deductionOthersVal = employee.deductionOthers || 0;

  // Employer breakdown
  const epfRateEmployer = employee.epfRateEmployer || (employee.basicSalary <= 5000 ? 13 : 12);
  const epfEmployerValue = breakdown.epfEmployerValue;

  // Proration Deduction details
  let baseSalaryBeforeProration = employee.basicSalary;
  if (employee.salaryAdjustments && employee.salaryAdjustments.length > 0) {
    const activeAdjustments = employee.salaryAdjustments
      .filter(adj => {
        const effDate = new Date(adj.effectiveDate);
        const effYear = effDate.getFullYear();
        const effMonth = effDate.getMonth() + 1;
        return (effYear < year) || (effYear === year && effMonth <= month);
      })
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    if (activeAdjustments.length > 0) {
      baseSalaryBeforeProration = activeAdjustments[0].adjustedSalary;
    }
  }

  const actualBasic = getAdjustedBasicSalary(employee, month, year);
  const prorationDeduction = parseFloat((baseSalaryBeforeProration - actualBasic).toFixed(2));

  // Calendar dates
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const lastDay = new Date(year, month, 0).getDate();
  const payPeriodText = `01 ${monthsList[month - 1]} ${year} - ${lastDay} ${monthsList[month - 1]} ${year}`;

  const getBankAccount = () => {
    const acc = String(employee.accountNo || '');
    if (!acc) return 'Bank account not available.';
    return `${employee.bankName || 'N/A'} - ${acc}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>CONFIDENTIAL - STRICTLY PRIVATE</Text>

        {/* Option A Branding Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            {entity?.logoUrl && !entity.logoUrl.includes('placeholder') && !entity.logoUrl.includes('example.com') ? (
              <Image 
                src={getDirectLogoUrl(entity.logoUrl)} 
                style={styles.logoImage} 
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>{entity?.name ? entity.name.substring(0, 2).toUpperCase() : 'RP'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.companyName}>{entity?.name || 'Red Point Sdn Bhd'}</Text>
              {entity?.registrationNumber && (
                <Text style={styles.companyReg}>Co. Reg: {entity.registrationNumber}</Text>
              )}
              <Text style={styles.companyAddress}>
                {entity?.address || 'No registered corporate address'}
              </Text>
            </View>
          </View>
          <View style={styles.rightHeaderBlock}>
            <Text style={styles.rightHeaderLabel}>PAYSLIP</Text>
            <Text style={styles.rightHeaderMonth}>{monthsList[month - 1].substring(0, 3)} {year}</Text>
          </View>
        </View>

        {/* Employee Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsTitleContainer}>
            <Text style={styles.detailsTitle}>Employee Details</Text>
          </View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          
          <View style={styles.detailsGrid}>
            {/* Left Group */}
            <View style={styles.detailsCol}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelLeft}>TIN / Tax Number</Text>
                <Text style={styles.detailValue}>{employee.taxNumber || 'IG 29068110030'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelLeft}>EPF Member Number</Text>
                <Text style={styles.detailValue}>{employee.epfNumber || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelLeft}>NRIC / Passport</Text>
                <Text style={styles.detailValue}>{employee.nricPassport || '-'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelLeft}>Date Joined</Text>
                <Text style={styles.detailValue}>{formatToDDMMMYYYY(employee.dateOfJoined)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelLeft}>Employment Status</Text>
                <Text style={styles.detailValue}>{employee.employmentType || 'Confirmation'}</Text>
              </View>
            </View>

            {/* Middle Group */}
            <View style={styles.detailsCol}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelMiddle}>Email Address</Text>
                <Text style={styles.detailValue}>{employee.email}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelMiddle}>Department</Text>
                <Text style={styles.detailValue}>{employee.department}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabelMiddle}>Designation</Text>
                <Text style={styles.detailValue}>{employee.designation}</Text>
              </View>
            </View>

            {/* Right Group (Bank details) */}
            <View style={styles.detailsCol}>
              <Text style={styles.bankTitle}>Bank Details</Text>
              <Text style={[styles.detailLabel, { marginBottom: 2 }]}>Bank Account</Text>
              <View style={styles.bankBox}>
                <Text style={styles.bankText}>{getBankAccount()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Side-by-side Tables */}
        <View style={styles.tableContainer}>
          {/* Earnings Column */}
          <View style={styles.tableCol}>
            <View style={styles.tableHeaderBlock}>
              <Text style={styles.tableHeaderTitle}>Earnings & Additions</Text>
            </View>
            <View style={styles.tableThRow}>
              <Text style={styles.tableThText}>Description</Text>
              <Text style={styles.tableThText}>Amount (RM)</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.itemName}>{getPayslipLabel(employee.employmentType)}</Text>
              <Text style={styles.itemVal}>{formatCurrency(baseSalaryBeforeProration)}</Text>
            </View>

            {allowanceGen > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>General Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowanceGen)}</Text>
              </View>
            )}
            {allowanceTrans > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Transport Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowanceTrans)}</Text>
              </View>
            )}
            {allowancePark > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Parking Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowancePark)}</Text>
              </View>
            )}
            {allowanceMeal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Meal Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowanceMeal)}</Text>
              </View>
            )}
            {allowanceAccom > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Accommodation Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowanceAccom)}</Text>
              </View>
            )}
            {allowancePhone > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Phone Allowance</Text>
                <Text style={styles.itemVal}>{formatCurrency(allowancePhone)}</Text>
              </View>
            )}

            {overtimeVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Overtime</Text>
                <Text style={styles.itemVal}>{formatCurrency(overtimeVal)}</Text>
              </View>
            )}

            {bonusVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Performance Bonus</Text>
                <Text style={styles.itemVal}>{formatCurrency(bonusVal)}</Text>
              </View>
            )}
            {commissionVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Commissions</Text>
                <Text style={styles.itemVal}>{formatCurrency(commissionVal)}</Text>
              </View>
            )}
            {backPayVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>BackPay / Arrears</Text>
                <Text style={styles.itemVal}>{formatCurrency(backPayVal)}</Text>
              </View>
            )}
            {awsVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>AWS (13th Month)</Text>
                <Text style={styles.itemVal}>{formatCurrency(awsVal)}</Text>
              </View>
            )}
            {compensationVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Compensation / Severance</Text>
                <Text style={styles.itemVal}>{formatCurrency(compensationVal)}</Text>
              </View>
            )}
            {reimbursementVal > 0 && (
              <View style={[styles.tableRow, { backgroundColor: '#f9fafb' }]}>
                <Text style={[styles.itemName, { fontFamily: 'Helvetica-Bold' }]}>Reimbursements (Tax-Free)</Text>
                <Text style={styles.itemVal}>{formatCurrency(reimbursementVal)}</Text>
              </View>
            )}

            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalText}>Total Earnings & Additions</Text>
              <Text style={styles.tableTotalText}>{formatCurrency(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum)}</Text>
            </View>
          </View>

          {/* Deductions Column */}
          <View style={styles.tableCol}>
            <View style={styles.tableHeaderBlock}>
              <Text style={styles.tableHeaderTitle}>Deductions</Text>
            </View>
            <View style={styles.tableThRow}>
              <Text style={styles.tableThText}>Description</Text>
              <Text style={styles.tableThText}>Amount (RM)</Text>
            </View>

            {prorationDeduction > 0 && (
              <View style={[styles.tableRow, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.itemName, { color: '#A32626', fontFamily: 'Helvetica-Bold' }]}>Prorated Salary Deduction</Text>
                <Text style={[styles.itemVal, { color: '#A32626' }]}>{formatCurrency(prorationDeduction)}</Text>
              </View>
            )}

            {epfEmployeeValue > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>EPF (Employee {epfRateEmp}%)</Text>
                <Text style={styles.itemVal}>{formatCurrency(epfEmployeeValue)}</Text>
              </View>
            )}

            {skbbkEmployeeVal > 0 ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.itemName}>SOCSO - Invalidity</Text>
                  <Text style={styles.itemVal}>{formatCurrency(socsoEmployeeVal)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.itemName}>SOCSO - LINDUNG 24 Jam</Text>
                  <Text style={styles.itemVal}>{formatCurrency(skbbkEmployeeVal)}</Text>
                </View>
                <View style={styles.tableRowSocsoTotal}>
                  <Text style={[styles.itemName, { fontFamily: 'Helvetica-Bold' }]}>SOCSO Employee Total</Text>
                  <Text style={[styles.itemVal, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(socsoEmployeeVal + skbbkEmployeeVal)}</Text>
                </View>
              </>
            ) : (
              socsoEmployeeVal > 0 && (
                <View style={styles.tableRow}>
                  <Text style={styles.itemName}>SOCSO</Text>
                  <Text style={styles.itemVal}>{formatCurrency(socsoEmployeeVal)}</Text>
                </View>
              )
            )}

            {eisEmployeeVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>EIS</Text>
                <Text style={styles.itemVal}>{formatCurrency(eisEmployeeVal)}</Text>
              </View>
            )}

            {taxPcbVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Income Tax (PCB)</Text>
                <Text style={styles.itemVal}>{formatCurrency(taxPcbVal)}</Text>
              </View>
            )}

            {unpaidLeaveVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Unpaid Leave</Text>
                <Text style={styles.itemVal}>{formatCurrency(unpaidLeaveVal)}</Text>
              </View>
            )}
            {deductionInLieuVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Payment in Lieu</Text>
                <Text style={styles.itemVal}>{formatCurrency(deductionInLieuVal)}</Text>
              </View>
            )}
            {deductionCp38Val > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>CP38 Direct Tax</Text>
                <Text style={styles.itemVal}>{formatCurrency(deductionCp38Val)}</Text>
              </View>
            )}
            {deductionOthersVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>{employee.deductionOthersDesc || 'Other Deduction'}</Text>
                <Text style={styles.itemVal}>{formatCurrency(deductionOthersVal)}</Text>
              </View>
            )}

            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalText}>Total Deductions</Text>
              <Text style={styles.tableTotalText}>{formatCurrency(breakdown.totalDeductions + prorationDeduction)}</Text>
            </View>
          </View>
        </View>

        {/* Summary Strip (Option A Layout) */}
        <View style={styles.summaryStrip}>
          {/* Gross Pay */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Gross Pay</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum)}
            </Text>
          </View>

          {/* Total Deductions */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Deductions</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(breakdown.totalDeductions + prorationDeduction)}
            </Text>
          </View>

          {/* Net Pay (Deep Red Block) */}
          <View style={styles.summaryCardNetPay}>
            <Text style={styles.summaryLabelNetPay}>Net Pay</Text>
            <Text style={styles.summaryValueNetPay}>{formatCurrency(breakdown.netPay)}</Text>
          </View>
        </View>

        {/* Employer Contributions (Option A Card Layout) */}
        <View style={styles.contributionsCard}>
          <Text style={styles.contributionsTitle}>Employer Contributions (Not Paid to Employee)</Text>
          <View style={styles.contributionsGrid}>
            {/* EPF */}
            <View style={styles.contributionCol}>
              <Text style={[styles.detailLabel, { color: '#6b7280' }]}>EPF ({epfRateEmployer}%)</Text>
              <Text style={[styles.detailValue, { color: '#333333' }]}>{formatCurrency(epfEmployerValue)}</Text>
            </View>

            <View style={styles.contributionDivider} />

            {/* SOCSO Injury */}
            <View style={styles.contributionCol}>
              <Text style={[styles.detailLabel, { color: '#6b7280' }]}>SOCSO - Injury</Text>
              <Text style={[styles.detailValue, { color: '#333333' }]}>{formatCurrency(socsoRes.employerEmploymentInjury)}</Text>
            </View>

            <View style={styles.contributionDivider} />

            {/* SOCSO Invalidity */}
            <View style={styles.contributionCol}>
              <Text style={[styles.detailLabel, { color: '#6b7280' }]}>SOCSO - Invalidity</Text>
              <Text style={[styles.detailValue, { color: '#333333' }]}>{formatCurrency(socsoRes.employerInvalidity)}</Text>
            </View>

            <View style={styles.contributionDivider} />

            {/* SOCSO Employer Total */}
            <View style={styles.contributionCol}>
              <Text style={[styles.detailLabel, { color: '#A32626' }]}>SOCSO Employer Total</Text>
              <Text style={[styles.detailValue, { color: '#A32626' }]}>{formatCurrency(socsoRes.employerSocsoTotal)}</Text>
            </View>

            <View style={styles.contributionDivider} />

            {/* EIS */}
            <View style={styles.contributionCol}>
              <Text style={[styles.detailLabel, { color: '#6b7280' }]}>EIS</Text>
              <Text style={[styles.detailValue, { color: '#333333' }]}>{formatCurrency(breakdown.eisEmployerVal)}</Text>
            </View>
          </View>
        </View>

        {/* Footer Notes (Option A) */}
        <View style={styles.footerSection}>
          <View style={styles.footerCol}>
            <Text style={styles.footerTitle}>Important Note</Text>
            <Text style={styles.footerText}>
              This is a computer generated document.
            </Text>
            <Text style={styles.footerText}>
              No signature is required.
            </Text>
          </View>
          <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.footerTitle}>Pay Period</Text>
            <Text style={styles.footerTextBold}>{payPeriodText}</Text>
          </View>
        </View>

        {/* Bottom Confidential Bar */}
        <View style={styles.confidentialBar}>
          <Text style={styles.confidentialBarText}>
            Thank you for your continued contribution to {entity?.name || 'Red Point Sdn Bhd'}.
          </Text>
          <Text style={styles.confidentialBarLabel}>CONFIDENTIAL</Text>
        </View>

      </Page>
    </Document>
  );
};
