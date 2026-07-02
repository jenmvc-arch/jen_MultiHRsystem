import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Employee, CorporateEntity } from '../types';
import { calculatePayslip, getPayslipLabel } from '../data';

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
}

export const PayslipPDFDocument = ({ employee, entity }: PayslipPDFDocumentProps) => {
  const breakdown = calculatePayslip(employee);

  // Determine dynamic brand primary accent color based on active subsidiary's configuration
  let primaryColor = '#1c4e89'; // theme1 (blue)
  if (entity?.theme === 'theme2') {
    primaryColor = '#B30000'; // theme2 (red)
  } else if (entity?.theme === 'theme3') {
    primaryColor = '#D4AF37'; // theme3 (gold/yellow)
  }

  // Helper formatting function
  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isEligible = 
    employee.employmentType === 'Probationary' || 
    employee.employmentType === 'Confirmation' || 
    (employee.employmentType === 'Independent Contractor / Freelance' && employee.eligibleForStatutory === 'Yes');

  const skbbkEmployeeVal = employee.skbbkEmployee !== undefined ? employee.skbbkEmployee : (isEligible ? parseFloat(((employee.socsoEmployee || 0) * 0.25).toFixed(2)) : 0);
  const skbbkEmployerVal = employee.skbbkEmployer !== undefined ? employee.skbbkEmployer : (isEligible ? parseFloat(((employee.socsoEmployer || 0) * 0.25).toFixed(2)) : 0);

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

  // Deductions breakdown
  const epfRateEmp = employee.epfRateEmployee || 11;
  const epfEmployeeValue = isEligible ? Math.round((employee.basicSalary * epfRateEmp) / 100) : 0;
  const socsoEmployeeVal = isEligible ? (employee.socsoEmployee || 0) : 0;
  const eisEmployeeVal = isEligible ? (employee.eisEmployee || 0) : 0;
  const taxPcbVal = isEligible ? (employee.taxPcb || 0) : 0;
  const unpaidLeaveVal = employee.unpaidLeave || 0;
  const deductionInLieuVal = employee.deductionInLieu || 0;
  const deductionCp38Val = employee.deductionCp38 || 0;
  const deductionOthersVal = employee.deductionOthers || 0;

  // Employer breakdown
  const epfRateEmployerCalculated = employee.basicSalary <= 5000 ? 13 : 12;
  const epfRateEmployer = employee.epfRateEmployer || epfRateEmployerCalculated;
  const epfEmployerValue = isEligible ? Math.round((employee.basicSalary * epfRateEmployer) / 100) : 0;
  const socsoEmployerVal = isEligible ? (employee.socsoEmployer || 0) : 0;
  const eisEmployerVal = isEligible ? (employee.eisEmployer || 0) : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>ACME-CONFIDENTIAL-STRICTLY-PRIVATE</Text>

        {/* Company and Document Title Header */}
        <View style={[styles.headerContainer, { borderBottomColor: primaryColor }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor }]}>
              <Text style={styles.logoText}>HR</Text>
            </View>
            <View>
              <Text style={[styles.companyName, { color: primaryColor }]}>{entity?.name || 'Corporate Subsidiary'}</Text>
              {entity?.registrationNumber && (
                <Text style={styles.companyReg}>Co. Reg: {entity.registrationNumber}</Text>
              )}
              <Text style={styles.companyAddress}>
                {entity?.address || 'No registered corporate address'}
              </Text>
            </View>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: primaryColor }]}>Payslip</Text>
            <Text style={styles.period}>October 2026</Text>
          </View>
        </View>

        {/* Employee Details Grid */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Employee Name</Text>
            <Text style={styles.detailValue}>{employee.name}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Employee ID</Text>
            <Text style={styles.detailValue}>{employee.id}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{employee.department}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Designation</Text>
            <Text style={styles.detailValue}>{employee.designation}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>TIN / Tax Number</Text>
            <Text style={styles.detailValue}>{employee.taxNumber || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>EPF Member Number</Text>
            <Text style={styles.detailValue}>{employee.epfNumber || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>NRIC / Passport</Text>
            <Text style={styles.detailValue}>{employee.nricPassport || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Bank Account</Text>
            <Text style={styles.detailValue}>
              {employee.bankName} - {employee.accountNo}
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Date Joined</Text>
            <Text style={styles.detailValue}>{employee.dateOfJoined || '-'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Employment Status</Text>
            <Text style={styles.detailValue}>{employee.employmentType || '-'}</Text>
          </View>
        </View>

        {/* Earnings & Deductions Tables */}
        <View style={styles.tableContainer}>
          {/* Earnings Column */}
          <View style={styles.tableCol}>
            <Text style={[styles.tableHeader, { color: primaryColor, borderBottomColor: primaryColor }]}>Earnings & Additions</Text>
            
            <View style={styles.tableRow}>
              <Text style={styles.itemName}>{getPayslipLabel(employee.employmentType)}</Text>
              <Text style={styles.itemVal}>{formatCurrency(employee.basicSalary)}</Text>
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
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>Performance Bonus</Text>
                  {employee.bonusDesc && <Text style={styles.itemDesc}>{employee.bonusDesc}</Text>}
                </View>
                <Text style={styles.itemVal}>{formatCurrency(bonusVal)}</Text>
              </View>
            )}

            {commissionVal > 0 && (
              <View style={styles.tableRow}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>Commissions</Text>
                  {employee.commissionDesc && <Text style={styles.itemDesc}>{employee.commissionDesc}</Text>}
                </View>
                <Text style={styles.itemVal}>{formatCurrency(commissionVal)}</Text>
              </View>
            )}

            {backPayVal > 0 && (
              <View style={styles.tableRow}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>BackPay / Arrears</Text>
                  {employee.backPayDesc && <Text style={styles.itemDesc}>{employee.backPayDesc}</Text>}
                </View>
                <Text style={styles.itemVal}>{formatCurrency(backPayVal)}</Text>
              </View>
            )}

            {awsVal > 0 && (
              <View style={styles.tableRow}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>AWS (13th Month)</Text>
                  {employee.awsDesc && <Text style={styles.itemDesc}>{employee.awsDesc}</Text>}
                </View>
                <Text style={styles.itemVal}>{formatCurrency(awsVal)}</Text>
              </View>
            )}

            {compensationVal > 0 && (
              <View style={styles.tableRow}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>Compensation / Severance</Text>
                  {employee.compensationDesc && <Text style={styles.itemDesc}>{employee.compensationDesc}</Text>}
                </View>
                <Text style={styles.itemVal}>{formatCurrency(compensationVal)}</Text>
              </View>
            )}

            {reimbursementVal > 0 && (
              <View style={[styles.tableRow, { backgroundColor: '#f9fafb', paddingHorizontal: 3 }]}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemNameBold}>Reimbursements (Tax-Free)</Text>
                  {employee.reimbursementDesc && <Text style={styles.itemDesc}>{employee.reimbursementDesc}</Text>}
                </View>
                <Text style={styles.itemNameBold}>{formatCurrency(reimbursementVal)}</Text>
              </View>
            )}

            {/* Total Earnings */}
            <View style={styles.tableRowBold}>
              <Text style={styles.itemNameBold}>Total Earnings & Additions</Text>
              <Text style={[styles.itemValBold, { color: primaryColor }]}>{formatCurrency(breakdown.grossEarnings + breakdown.reimbursementsSum)}</Text>
            </View>
          </View>

          {/* Deductions Column */}
          <View style={styles.tableCol}>
            <Text style={[styles.tableHeader, { color: primaryColor, borderBottomColor: primaryColor }]}>Deductions</Text>

            {epfEmployeeValue > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>EPF (Employee {epfRateEmp}%)</Text>
                <Text style={styles.itemValRed}>{formatCurrency(epfEmployeeValue)}</Text>
              </View>
            )}

            {socsoEmployeeVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>SOCSO</Text>
                <Text style={styles.itemValRed}>{formatCurrency(socsoEmployeeVal)}</Text>
              </View>
            )}

            {skbbkEmployeeVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>SOCSO (SKBBK)</Text>
                <Text style={styles.itemValRed}>{formatCurrency(skbbkEmployeeVal)}</Text>
              </View>
            )}

            {eisEmployeeVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>EIS</Text>
                <Text style={styles.itemValRed}>{formatCurrency(eisEmployeeVal)}</Text>
              </View>
            )}

            {taxPcbVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Income Tax (PCB)</Text>
                <Text style={styles.itemValRed}>{formatCurrency(taxPcbVal)}</Text>
              </View>
            )}

            {unpaidLeaveVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Unpaid Leave Deduction</Text>
                <Text style={styles.itemValRed}>{formatCurrency(unpaidLeaveVal)}</Text>
              </View>
            )}

            {deductionInLieuVal > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>In Lieu Deduction</Text>
                <Text style={styles.itemValRed}>{formatCurrency(deductionInLieuVal)}</Text>
              </View>
            )}

            {deductionCp38Val > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.itemName}>Deduction (CP38)</Text>
                <Text style={styles.itemValRed}>{formatCurrency(deductionCp38Val)}</Text>
              </View>
            )}

            {deductionOthersVal > 0 && (
              <View style={styles.tableRow}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.itemName}>{employee.deductionOthersDesc || 'Other Deductions'}</Text>
                </View>
                <Text style={styles.itemValRed}>{formatCurrency(deductionOthersVal)}</Text>
              </View>
            )}

            {/* Total Deductions */}
            <View style={styles.tableRowBold}>
              <Text style={styles.itemNameBold}>Total Deductions</Text>
              <Text style={styles.itemValRedBold}>{formatCurrency(breakdown.totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* Employer Contributions Box */}
        <View style={styles.employerContainer}>
          <Text style={styles.employerTitle}>Employer Contributions (Not Paid to Employee)</Text>
          <View style={styles.employerGrid}>
            {epfEmployerValue > 0 && (
              <View style={styles.employerCol}>
                <Text style={styles.detailLabel}>EPF ({epfRateEmployer}%)</Text>
                <Text style={styles.detailValue}>{formatCurrency(epfEmployerValue)}</Text>
              </View>
            )}
            {socsoEmployerVal > 0 && (
              <View style={styles.employerCol}>
                <Text style={styles.detailLabel}>SOCSO</Text>
                <Text style={styles.detailValue}>{formatCurrency(socsoEmployerVal)}</Text>
              </View>
            )}
            {skbbkEmployerVal > 0 && (
              <View style={styles.employerCol}>
                <Text style={styles.detailLabel}>SOCSO (SKBBK)</Text>
                <Text style={styles.detailValue}>{formatCurrency(skbbkEmployerVal)}</Text>
              </View>
            )}
            {eisEmployerVal > 0 && (
              <View style={styles.employerCol}>
                <Text style={styles.detailLabel}>EIS</Text>
                <Text style={styles.detailValue}>{formatCurrency(eisEmployerVal)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Summary / Net Pay */}
        <View style={[styles.summaryBlock, { borderTopColor: primaryColor }]}>
          <Text style={styles.footnote}>
            This is a computer generated document. No signature is required.
          </Text>
          <View style={styles.netPayContainer}>
            <Text style={styles.netPayLabel}>Net Pay</Text>
            <Text style={[styles.netPayValue, { color: primaryColor }]}>{formatCurrency(breakdown.netPay)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
