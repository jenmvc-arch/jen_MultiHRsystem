import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel, getDirectLogoUrl, getAdjustedBasicSalary, calculateSocsoContribution } from '../data';
import { formatToDDMMMYYYY } from '../lib/dateUtils';

// Create styles for React PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 30,
    lineHeight: 1.4,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 15,
    right: 30,
    fontSize: 7,
    color: '#d1d5db',
    fontFamily: 'Helvetica-Bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1c4e89',
    paddingBottom: 15,
    marginBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#1c4e89',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 45,
    height: 45,
    borderRadius: 4,
  },
  logoText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1c4e89',
  },
  companyReg: {
    fontSize: 8,
    color: '#4b5563',
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  companyAddress: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 2,
    maxWidth: 260,
  },
  titleContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  period: {
    fontSize: 11,
    color: '#374151',
    marginTop: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  detailCol: {
    width: '25%',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  tableContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  tableCol: {
    flex: 1,
  },
  tableHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1c4e89',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  itemName: {
    fontSize: 8.5,
    color: '#374151',
  },
  itemNameBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  itemVal: {
    fontSize: 8.5,
    color: '#111827',
    textAlign: 'right',
  },
  itemValBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1c4e89',
    textAlign: 'right',
  },
  itemValRed: {
    fontSize: 8.5,
    color: '#dc2626',
    textAlign: 'right',
  },
  itemValRedBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    textAlign: 'right',
  },
  employerContainer: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
  },
  employerTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  employerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  employerCol: {
    flex: 1,
  },
  summaryBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  footnote: {
    fontSize: 8,
    color: '#6b7280',
    maxWidth: '60%',
  },
  netPayContainer: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    width: 150,
  },
  netPayLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  netPayValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1c4e89',
  },
  itemDesc: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 1,
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

  // Determine dynamic brand colors based on active subsidiary's configuration
  const isRedPointTheme = entity?.theme === 'theme2';
  
  let primaryColor = '#1c4e89'; // theme1 (blue)
  if (isRedPointTheme) {
    primaryColor = '#A32626'; // theme2 (Deep Red)
  } else if (entity?.theme === 'theme3') {
    primaryColor = '#D4AF37'; // theme3 (gold/yellow)
  }

  const secondaryColor = isRedPointTheme ? '#F2E8D8' : '#f9fafb';
  const textColor = isRedPointTheme ? '#333333' : '#111827';
  const labelColor = isRedPointTheme ? '#333333' : '#6b7280';
  const tableContentColor = isRedPointTheme ? '#333333' : '#374151';
  const thinBorderColor = isRedPointTheme ? '#E6D8C1' : '#e5e7eb';
  const rowBorderColor = isRedPointTheme ? '#E6D8C1' : '#f3f4f6';

  // Helper formatting function
  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pdfItemNameStyle = [styles.itemName, { color: tableContentColor }];
  const pdfItemValStyle = [styles.itemVal, { color: tableContentColor }];
  const pdfTableRowStyle = [styles.tableRow, { borderBottomColor: rowBorderColor }];
  const pdfTableRowBoldStyle = [styles.tableRowBold, { borderBottomColor: thinBorderColor }];
  const pdfItemNameBoldStyle = [styles.itemNameBold, { color: textColor }];
  const pdfItemValBoldStyle = [styles.itemValBold, { color: primaryColor }];
  const pdfItemValRedStyle = isRedPointTheme ? [styles.itemVal, { color: tableContentColor }] : styles.itemValRed;
  const pdfItemValRedBoldStyle = isRedPointTheme ? [styles.itemValBold, { color: primaryColor }] : styles.itemValRedBold;

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
    { code: 'allowance_meal', amount: allowancePark }, // Fallback to meal allowance
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
  const skbbkEmployerVal = 0; // LINDUNG 24 is employee-borne

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
  const socsoEmployerVal = isEligible ? socsoRes.employerSocsoTotal : 0;
  const eisEmployerVal = breakdown.eisEmployerVal;

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

  let prorationDetails = '';
  if (prorationDeduction > 0 && employee.dateOfJoined) {
    const joinDate = new Date(employee.dateOfJoined);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth() + 1;
    if (joinYear === year && joinMonth === month) {
      const joinDay = joinDate.getDate();
      const calendarDays = new Date(year, month, 0).getDate();
      const unpaidDays = joinDay - 1;
      prorationDetails = `Joined mid-month on ${formatToDDMMMYYYY(employee.dateOfJoined)}. Deducted ${unpaidDays}/${calendarDays} unpaid days.`;
    } else {
      prorationDetails = `Deduction for incomplete month of service.`;
    }
  }

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const periodText = `${monthsList[month - 1]} ${year}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>ACME-CONFIDENTIAL-STRICTLY-PRIVATE</Text>

        {/* Company and Document Title Header */}
        <View style={[
          styles.headerContainer, 
          { 
            borderBottomColor: primaryColor,
            backgroundColor: isRedPointTheme ? secondaryColor : 'transparent',
            padding: isRedPointTheme ? 10 : 0,
            borderRadius: isRedPointTheme ? 4 : 0
          }
        ]}>
          <View style={styles.logoContainer}>
            {entity?.logoUrl && !entity.logoUrl.includes('placeholder') && !entity.logoUrl.includes('example.com') ? (
              <Image 
                src={getDirectLogoUrl(entity.logoUrl)} 
                style={styles.logoImage} 
              />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={styles.logoText}>{entity?.name ? entity.name.substring(0, 2).toUpperCase() : 'HR'}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.companyName, { color: primaryColor }]}>{entity?.name || 'Corporate Subsidiary'}</Text>
              {entity?.registrationNumber && (
                <Text style={[styles.companyReg, { color: isRedPointTheme ? textColor : '#4b5563' }]}>Co. Reg: {entity.registrationNumber}</Text>
              )}
              <Text style={[styles.companyAddress, { color: isRedPointTheme ? textColor : '#4b5563' }]}>
                {entity?.address || 'No registered corporate address'}
              </Text>
            </View>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: primaryColor }]}>Payslip</Text>
            <Text style={[styles.period, { color: isRedPointTheme ? textColor : '#374151' }]}>{periodText}</Text>
          </View>
        </View>

        {/* Employee Details Grid */}
        <View style={[
          styles.detailsContainer, 
          { 
            backgroundColor: secondaryColor, 
            borderColor: thinBorderColor 
          }
        ]}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Employee Name</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.name}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Email Address</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.email}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Department</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.department}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Designation</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.designation}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>TIN / Tax Number</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.taxNumber || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>EPF Member Number</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.epfNumber || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>NRIC / Passport</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.nricPassport || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Bank Account</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>
              {employee.bankName} - {employee.accountNo}
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Date Joined</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{formatToDDMMMYYYY(employee.dateOfJoined)}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: labelColor }]}>Employment Status</Text>
            <Text style={[styles.detailValue, { color: textColor }]}>{employee.employmentType || '-'}</Text>
          </View>
        </View>

        {/* Earnings & Deductions Tables */}
        <View style={styles.tableContainer}>
          {/* Earnings Column */}
          <View style={styles.tableCol}>
            <View style={{ backgroundColor: isRedPointTheme ? secondaryColor : 'transparent', paddingHorizontal: isRedPointTheme ? 6 : 0, paddingVertical: isRedPointTheme ? 4 : 0, borderRadius: isRedPointTheme ? 2 : 0, marginBottom: 6 }}>
              <Text style={[styles.tableHeader, { color: primaryColor, borderBottomColor: isRedPointTheme ? 'transparent' : primaryColor, borderBottomWidth: isRedPointTheme ? 0 : 1, marginBottom: 0, paddingBottom: 0 }]}>Earnings & Additions</Text>
            </View>
            
            <View style={pdfTableRowStyle}>
              <Text style={pdfItemNameStyle}>{getPayslipLabel(employee.employmentType)}</Text>
              <Text style={pdfItemValStyle}>{formatCurrency(baseSalaryBeforeProration)}</Text>
            </View>

            {allowanceGen > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>General Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowanceGen)}</Text>
              </View>
            )}

            {allowanceTrans > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Transport Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowanceTrans)}</Text>
              </View>
            )}

            {allowancePark > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Parking Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowancePark)}</Text>
              </View>
            )}

            {allowanceMeal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Meal Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowanceMeal)}</Text>
              </View>
            )}

            {allowanceAccom > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Accommodation Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowanceAccom)}</Text>
              </View>
            )}

            {allowancePhone > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Phone Allowance</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(allowancePhone)}</Text>
              </View>
            )}

            {overtimeVal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Overtime</Text>
                <Text style={pdfItemValStyle}>{formatCurrency(overtimeVal)}</Text>
              </View>
            )}

            {bonusVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>Performance Bonus</Text>
                  {employee.bonusDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.bonusDesc}</Text>}
                </View>
                <Text style={pdfItemValStyle}>{formatCurrency(bonusVal)}</Text>
              </View>
            )}

            {commissionVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>Commissions</Text>
                  {employee.commissionDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.commissionDesc}</Text>}
                </View>
                <Text style={pdfItemValStyle}>{formatCurrency(commissionVal)}</Text>
              </View>
            )}

            {backPayVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>BackPay / Arrears</Text>
                  {employee.backPayDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.backPayDesc}</Text>}
                </View>
                <Text style={pdfItemValStyle}>{formatCurrency(backPayVal)}</Text>
              </View>
            )}

            {awsVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>AWS (13th Month)</Text>
                  {employee.awsDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.awsDesc}</Text>}
                </View>
                <Text style={pdfItemValStyle}>{formatCurrency(awsVal)}</Text>
              </View>
            )}

            {compensationVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>Compensation / Severance</Text>
                  {employee.compensationDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.compensationDesc}</Text>}
                </View>
                <Text style={pdfItemValStyle}>{formatCurrency(compensationVal)}</Text>
              </View>
            )}

            {reimbursementVal > 0 && (
              <View style={[pdfTableRowStyle, { backgroundColor: isRedPointTheme ? secondaryColor : '#f9fafb', paddingHorizontal: 3 }]}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameBoldStyle}>Reimbursements (Tax-Free)</Text>
                  {employee.reimbursementDesc && <Text style={[styles.itemDesc, { color: labelColor }]}>{employee.reimbursementDesc}</Text>}
                </View>
                <Text style={pdfItemNameBoldStyle}>{formatCurrency(reimbursementVal)}</Text>
              </View>
            )}

            {/* Total Earnings */}
            <View style={pdfTableRowBoldStyle}>
              <Text style={pdfItemNameBoldStyle}>Total Earnings & Additions</Text>
              <Text style={pdfItemValBoldStyle}>{formatCurrency(breakdown.grossEarnings + prorationDeduction + breakdown.reimbursementsSum)}</Text>
            </View>
          </View>

          {/* Deductions Column */}
          <View style={styles.tableCol}>
            <View style={{ backgroundColor: isRedPointTheme ? secondaryColor : 'transparent', paddingHorizontal: isRedPointTheme ? 6 : 0, paddingVertical: isRedPointTheme ? 4 : 0, borderRadius: isRedPointTheme ? 2 : 0, marginBottom: 6 }}>
              <Text style={[styles.tableHeader, { color: primaryColor, borderBottomColor: isRedPointTheme ? 'transparent' : primaryColor, borderBottomWidth: isRedPointTheme ? 0 : 1, marginBottom: 0, paddingBottom: 0 }]}>Deductions</Text>
            </View>

            {prorationDeduction > 0 && (
              <View style={[pdfTableRowStyle, { backgroundColor: isRedPointTheme ? secondaryColor : '#fef2f2', paddingHorizontal: 3 }]}>
                <View style={{ flexDirection: 'column', maxWidth: '75%' }}>
                  <Text style={[pdfItemNameBoldStyle, { color: isRedPointTheme ? primaryColor : '#dc2626' }]}>Prorated Basic Salary Deduction</Text>
                  {prorationDetails ? <Text style={[styles.itemDesc, { color: labelColor }]}>{prorationDetails}</Text> : null}
                </View>
                <Text style={pdfItemValRedStyle}>{formatCurrency(prorationDeduction)}</Text>
              </View>
            )}

            {epfEmployeeValue > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>EPF (Employee {epfRateEmp}%)</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(epfEmployeeValue)}</Text>
              </View>
            )}

            {skbbkEmployeeVal > 0 ? (
              <>
                <View style={pdfTableRowStyle}>
                  <Text style={pdfItemNameStyle}>SOCSO - Invalidity</Text>
                  <Text style={pdfItemValRedStyle}>{formatCurrency(socsoEmployeeVal)}</Text>
                </View>
                <View style={pdfTableRowStyle}>
                  <Text style={pdfItemNameStyle}>SOCSO - LINDUNG 24 Jam</Text>
                  <Text style={pdfItemValRedStyle}>{formatCurrency(skbbkEmployeeVal)}</Text>
                </View>
                <View style={[pdfTableRowStyle, { backgroundColor: isRedPointTheme ? secondaryColor : '#f9fafb', paddingHorizontal: 2 }]}>
                  <Text style={[pdfItemNameStyle, { fontFamily: 'Helvetica-Bold' }]}>SOCSO Employee Total</Text>
                  <Text style={[pdfItemValRedStyle, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(socsoEmployeeVal + skbbkEmployeeVal)}</Text>
                </View>
              </>
            ) : (
              socsoEmployeeVal > 0 && (
                <View style={pdfTableRowStyle}>
                  <Text style={pdfItemNameStyle}>SOCSO</Text>
                  <Text style={pdfItemValRedStyle}>{formatCurrency(socsoEmployeeVal)}</Text>
                </View>
              )
            )}

            {eisEmployeeVal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>EIS</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(eisEmployeeVal)}</Text>
              </View>
            )}

            {taxPcbVal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Income Tax (PCB)</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(taxPcbVal)}</Text>
              </View>
            )}

            {unpaidLeaveVal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Unpaid Leave Deduction</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(unpaidLeaveVal)}</Text>
              </View>
            )}

            {deductionInLieuVal > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>In Lieu Deduction</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(deductionInLieuVal)}</Text>
              </View>
            )}

            {deductionCp38Val > 0 && (
              <View style={pdfTableRowStyle}>
                <Text style={pdfItemNameStyle}>Deduction (CP38)</Text>
                <Text style={pdfItemValRedStyle}>{formatCurrency(deductionCp38Val)}</Text>
              </View>
            )}

            {deductionOthersVal > 0 && (
              <View style={pdfTableRowStyle}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={pdfItemNameStyle}>{employee.deductionOthersDesc || 'Other Deductions'}</Text>
                </View>
                <Text style={pdfItemValRedStyle}>{formatCurrency(deductionOthersVal)}</Text>
              </View>
            )}

            {/* Total Deductions */}
            <View style={pdfTableRowBoldStyle}>
              <Text style={pdfItemNameBoldStyle}>Total Deductions</Text>
              <Text style={pdfItemValRedBoldStyle}>{formatCurrency(breakdown.totalDeductions + prorationDeduction)}</Text>
            </View>
          </View>
        </View>

        {/* Employer Contributions Box */}
        <View style={[
          styles.employerContainer, 
          { 
            backgroundColor: secondaryColor, 
            borderColor: thinBorderColor 
          }
        ]}>
          <Text style={[styles.employerTitle, { color: isRedPointTheme ? textColor : '#6b7280' }]}>Employer Contributions (Not Paid to Employee)</Text>
          <View style={styles.employerGrid}>
            {epfEmployerValue > 0 && (
              <View style={styles.employerCol}>
                <Text style={[styles.detailLabel, { color: labelColor }]}>EPF ({epfRateEmployer}%)</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(epfEmployerValue)}</Text>
              </View>
            )}
            {skbbkEmployeeVal > 0 ? (
              <>
                <View style={styles.employerCol}>
                  <Text style={[styles.detailLabel, { color: labelColor }]}>SOCSO - Employment Injury</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(socsoRes.employerEmploymentInjury)}</Text>
                </View>
                <View style={styles.employerCol}>
                  <Text style={[styles.detailLabel, { color: labelColor }]}>SOCSO - Invalidity</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(socsoRes.employerInvalidity)}</Text>
                </View>
                <View style={styles.employerCol}>
                  <Text style={[styles.detailLabel, { color: labelColor }]}>SOCSO Employer Total</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(socsoRes.employerSocsoTotal)}</Text>
                </View>
              </>
            ) : (
              socsoEmployerVal > 0 && (
                <View style={styles.employerCol}>
                  <Text style={[styles.detailLabel, { color: labelColor }]}>SOCSO</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(socsoEmployerVal)}</Text>
                </View>
              )
            )}
            {eisEmployerVal > 0 && (
              <View style={styles.employerCol}>
                <Text style={[styles.detailLabel, { color: labelColor }]}>EIS</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>{formatCurrency(eisEmployerVal)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Summary / Net Pay */}
        <View style={[styles.summaryBlock, { borderTopColor: primaryColor }]}>
          <Text style={[styles.footnote, { color: isRedPointTheme ? textColor : '#6b7280' }]}>
            This is a computer generated document. No signature is required.
          </Text>
          <View style={[
            styles.netPayContainer, 
            { 
              backgroundColor: isRedPointTheme ? secondaryColor : '#f3f4f6', 
              borderColor: thinBorderColor 
            }
          ]}>
            <Text style={[styles.netPayLabel, { color: isRedPointTheme ? primaryColor : '#6b7280' }]}>Net Pay</Text>
            <Text style={[styles.netPayValue, { color: isRedPointTheme ? primaryColor : primaryColor }]}>{formatCurrency(breakdown.netPay)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
