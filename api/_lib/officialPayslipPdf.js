// api/_lib/officialPayslipPdf.tsx
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";

// src/components/PayslipPDFDocument.tsx
import { Document, Page, Text, View, StyleSheet, Image as Image2 } from "@react-pdf/renderer";

// src/types.ts
var GROSS_PAY_CALCULATION_VERSION = "gross_pay_v2";

// src/data/perkeso_lindung24_phase1_2026.json
var perkeso_lindung24_phase1_2026_default = {
  schedule_code: "PERKESO_ACT4_LINDUNG24_PHASE1_2026",
  schedule_name: "PERKESO Act 4 First Phase Contribution Table including LINDUNG 24 JAM",
  effective_from: "2026-06-01",
  effective_to: null,
  currency: "MYR",
  storage_unit: "sen",
  wage_ceiling_sen: 6e5,
  decimal_policy: {
    calculation_storage: "Store all wages and contributions as integer sen.",
    input_precision: "Accept a maximum of 2 decimal places. Reject values with more than 2 decimals.",
    lookup_policy: "Do not round wages to whole ringgit, nearest RM10, nearest RM100, or any bracket midpoint.",
    display_policy: "Display MYR values with exactly 2 decimal places.",
    floating_point_policy: "Do not use binary floating-point for payroll money."
  },
  official_source: "https://www.perkeso.gov.my/images/arahan/Employer_Circular_No_2_2026-PekelilingLindung24Jam_English.pdf",
  compatibility_reference: "https://payroll.my/payroll-software/socso-contribution-table",
  rows: [
    {
      bracket_number: 1,
      description: "Wages above RM0.00 and up to RM30.00",
      lower_bound_sen: 0,
      upper_bound_sen: 3e3,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 10,
      category1_employer_employment_injury_sen: 30,
      category1_employer_total_sen: 40,
      category1_employee_invalidity_sen: 10,
      category1_employee_lindung24_sen: 20,
      category1_employee_total_sen: 30,
      category1_grand_total_sen: 70,
      category2_employer_employment_injury_sen: 30,
      category2_employer_total_sen: 30,
      category2_employee_lindung24_sen: 20,
      category2_employee_total_sen: 20,
      category2_grand_total_sen: 50,
      category1_employer_total_rm: "0.40",
      category1_employee_invalidity_rm: "0.10",
      category1_employee_lindung24_rm: "0.20",
      category1_employee_total_rm: "0.30",
      category1_grand_total_rm: "0.70",
      category2_employer_total_rm: "0.30",
      category2_employee_lindung24_rm: "0.20",
      category2_employee_total_rm: "0.20",
      category2_grand_total_rm: "0.50"
    },
    {
      bracket_number: 2,
      description: "Wages above RM30.00 and up to RM50.00",
      lower_bound_sen: 3e3,
      upper_bound_sen: 5e3,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 20,
      category1_employer_employment_injury_sen: 50,
      category1_employer_total_sen: 70,
      category1_employee_invalidity_sen: 20,
      category1_employee_lindung24_sen: 30,
      category1_employee_total_sen: 50,
      category1_grand_total_sen: 120,
      category2_employer_employment_injury_sen: 50,
      category2_employer_total_sen: 50,
      category2_employee_lindung24_sen: 30,
      category2_employee_total_sen: 30,
      category2_grand_total_sen: 80,
      category1_employer_total_rm: "0.70",
      category1_employee_invalidity_rm: "0.20",
      category1_employee_lindung24_rm: "0.30",
      category1_employee_total_rm: "0.50",
      category1_grand_total_rm: "1.20",
      category2_employer_total_rm: "0.50",
      category2_employee_lindung24_rm: "0.30",
      category2_employee_total_rm: "0.30",
      category2_grand_total_rm: "0.80"
    },
    {
      bracket_number: 3,
      description: "Wages above RM50.00 and up to RM70.00",
      lower_bound_sen: 5e3,
      upper_bound_sen: 7e3,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 30,
      category1_employer_employment_injury_sen: 80,
      category1_employer_total_sen: 110,
      category1_employee_invalidity_sen: 30,
      category1_employee_lindung24_sen: 50,
      category1_employee_total_sen: 80,
      category1_grand_total_sen: 190,
      category2_employer_employment_injury_sen: 80,
      category2_employer_total_sen: 80,
      category2_employee_lindung24_sen: 50,
      category2_employee_total_sen: 50,
      category2_grand_total_sen: 130,
      category1_employer_total_rm: "1.10",
      category1_employee_invalidity_rm: "0.30",
      category1_employee_lindung24_rm: "0.50",
      category1_employee_total_rm: "0.80",
      category1_grand_total_rm: "1.90",
      category2_employer_total_rm: "0.80",
      category2_employee_lindung24_rm: "0.50",
      category2_employee_total_rm: "0.50",
      category2_grand_total_rm: "1.30"
    },
    {
      bracket_number: 4,
      description: "Wages above RM70.00 and up to RM100.00",
      lower_bound_sen: 7e3,
      upper_bound_sen: 1e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 40,
      category1_employer_employment_injury_sen: 110,
      category1_employer_total_sen: 150,
      category1_employee_invalidity_sen: 40,
      category1_employee_lindung24_sen: 65,
      category1_employee_total_sen: 105,
      category1_grand_total_sen: 255,
      category2_employer_employment_injury_sen: 110,
      category2_employer_total_sen: 110,
      category2_employee_lindung24_sen: 65,
      category2_employee_total_sen: 65,
      category2_grand_total_sen: 175,
      category1_employer_total_rm: "1.50",
      category1_employee_invalidity_rm: "0.40",
      category1_employee_lindung24_rm: "0.65",
      category1_employee_total_rm: "1.05",
      category1_grand_total_rm: "2.55",
      category2_employer_total_rm: "1.10",
      category2_employee_lindung24_rm: "0.65",
      category2_employee_total_rm: "0.65",
      category2_grand_total_rm: "1.75"
    },
    {
      bracket_number: 5,
      description: "Wages above RM100.00 and up to RM140.00",
      lower_bound_sen: 1e4,
      upper_bound_sen: 14e3,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 60,
      category1_employer_employment_injury_sen: 150,
      category1_employer_total_sen: 210,
      category1_employee_invalidity_sen: 60,
      category1_employee_lindung24_sen: 90,
      category1_employee_total_sen: 150,
      category1_grand_total_sen: 360,
      category2_employer_employment_injury_sen: 150,
      category2_employer_total_sen: 150,
      category2_employee_lindung24_sen: 90,
      category2_employee_total_sen: 90,
      category2_grand_total_sen: 240,
      category1_employer_total_rm: "2.10",
      category1_employee_invalidity_rm: "0.60",
      category1_employee_lindung24_rm: "0.90",
      category1_employee_total_rm: "1.50",
      category1_grand_total_rm: "3.60",
      category2_employer_total_rm: "1.50",
      category2_employee_lindung24_rm: "0.90",
      category2_employee_total_rm: "0.90",
      category2_grand_total_rm: "2.40"
    },
    {
      bracket_number: 6,
      description: "Wages above RM140.00 and up to RM200.00",
      lower_bound_sen: 14e3,
      upper_bound_sen: 2e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 85,
      category1_employer_employment_injury_sen: 210,
      category1_employer_total_sen: 295,
      category1_employee_invalidity_sen: 85,
      category1_employee_lindung24_sen: 125,
      category1_employee_total_sen: 210,
      category1_grand_total_sen: 505,
      category2_employer_employment_injury_sen: 210,
      category2_employer_total_sen: 210,
      category2_employee_lindung24_sen: 125,
      category2_employee_total_sen: 125,
      category2_grand_total_sen: 335,
      category1_employer_total_rm: "2.95",
      category1_employee_invalidity_rm: "0.85",
      category1_employee_lindung24_rm: "1.25",
      category1_employee_total_rm: "2.10",
      category1_grand_total_rm: "5.05",
      category2_employer_total_rm: "2.10",
      category2_employee_lindung24_rm: "1.25",
      category2_employee_total_rm: "1.25",
      category2_grand_total_rm: "3.35"
    },
    {
      bracket_number: 7,
      description: "Wages above RM200.00 and up to RM300.00",
      lower_bound_sen: 2e4,
      upper_bound_sen: 3e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 125,
      category1_employer_employment_injury_sen: 310,
      category1_employer_total_sen: 435,
      category1_employee_invalidity_sen: 125,
      category1_employee_lindung24_sen: 185,
      category1_employee_total_sen: 310,
      category1_grand_total_sen: 745,
      category2_employer_employment_injury_sen: 310,
      category2_employer_total_sen: 310,
      category2_employee_lindung24_sen: 185,
      category2_employee_total_sen: 185,
      category2_grand_total_sen: 495,
      category1_employer_total_rm: "4.35",
      category1_employee_invalidity_rm: "1.25",
      category1_employee_lindung24_rm: "1.85",
      category1_employee_total_rm: "3.10",
      category1_grand_total_rm: "7.45",
      category2_employer_total_rm: "3.10",
      category2_employee_lindung24_rm: "1.85",
      category2_employee_total_rm: "1.85",
      category2_grand_total_rm: "4.95"
    },
    {
      bracket_number: 8,
      description: "Wages above RM300.00 and up to RM400.00",
      lower_bound_sen: 3e4,
      upper_bound_sen: 4e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 175,
      category1_employer_employment_injury_sen: 440,
      category1_employer_total_sen: 615,
      category1_employee_invalidity_sen: 175,
      category1_employee_lindung24_sen: 265,
      category1_employee_total_sen: 440,
      category1_grand_total_sen: 1055,
      category2_employer_employment_injury_sen: 440,
      category2_employer_total_sen: 440,
      category2_employee_lindung24_sen: 265,
      category2_employee_total_sen: 265,
      category2_grand_total_sen: 705,
      category1_employer_total_rm: "6.15",
      category1_employee_invalidity_rm: "1.75",
      category1_employee_lindung24_rm: "2.65",
      category1_employee_total_rm: "4.40",
      category1_grand_total_rm: "10.55",
      category2_employer_total_rm: "4.40",
      category2_employee_lindung24_rm: "2.65",
      category2_employee_total_rm: "2.65",
      category2_grand_total_rm: "7.05"
    },
    {
      bracket_number: 9,
      description: "Wages above RM400.00 and up to RM500.00",
      lower_bound_sen: 4e4,
      upper_bound_sen: 5e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 225,
      category1_employer_employment_injury_sen: 560,
      category1_employer_total_sen: 785,
      category1_employee_invalidity_sen: 225,
      category1_employee_lindung24_sen: 335,
      category1_employee_total_sen: 560,
      category1_grand_total_sen: 1345,
      category2_employer_employment_injury_sen: 560,
      category2_employer_total_sen: 560,
      category2_employee_lindung24_sen: 335,
      category2_employee_total_sen: 335,
      category2_grand_total_sen: 895,
      category1_employer_total_rm: "7.85",
      category1_employee_invalidity_rm: "2.25",
      category1_employee_lindung24_rm: "3.35",
      category1_employee_total_rm: "5.60",
      category1_grand_total_rm: "13.45",
      category2_employer_total_rm: "5.60",
      category2_employee_lindung24_rm: "3.35",
      category2_employee_total_rm: "3.35",
      category2_grand_total_rm: "8.95"
    },
    {
      bracket_number: 10,
      description: "Wages above RM500.00 and up to RM600.00",
      lower_bound_sen: 5e4,
      upper_bound_sen: 6e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 275,
      category1_employer_employment_injury_sen: 690,
      category1_employer_total_sen: 965,
      category1_employee_invalidity_sen: 275,
      category1_employee_lindung24_sen: 415,
      category1_employee_total_sen: 690,
      category1_grand_total_sen: 1655,
      category2_employer_employment_injury_sen: 690,
      category2_employer_total_sen: 690,
      category2_employee_lindung24_sen: 415,
      category2_employee_total_sen: 415,
      category2_grand_total_sen: 1105,
      category1_employer_total_rm: "9.65",
      category1_employee_invalidity_rm: "2.75",
      category1_employee_lindung24_rm: "4.15",
      category1_employee_total_rm: "6.90",
      category1_grand_total_rm: "16.55",
      category2_employer_total_rm: "6.90",
      category2_employee_lindung24_rm: "4.15",
      category2_employee_total_rm: "4.15",
      category2_grand_total_rm: "11.05"
    },
    {
      bracket_number: 11,
      description: "Wages above RM600.00 and up to RM700.00",
      lower_bound_sen: 6e4,
      upper_bound_sen: 7e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 325,
      category1_employer_employment_injury_sen: 810,
      category1_employer_total_sen: 1135,
      category1_employee_invalidity_sen: 325,
      category1_employee_lindung24_sen: 485,
      category1_employee_total_sen: 810,
      category1_grand_total_sen: 1945,
      category2_employer_employment_injury_sen: 810,
      category2_employer_total_sen: 810,
      category2_employee_lindung24_sen: 485,
      category2_employee_total_sen: 485,
      category2_grand_total_sen: 1295,
      category1_employer_total_rm: "11.35",
      category1_employee_invalidity_rm: "3.25",
      category1_employee_lindung24_rm: "4.85",
      category1_employee_total_rm: "8.10",
      category1_grand_total_rm: "19.45",
      category2_employer_total_rm: "8.10",
      category2_employee_lindung24_rm: "4.85",
      category2_employee_total_rm: "4.85",
      category2_grand_total_rm: "12.95"
    },
    {
      bracket_number: 12,
      description: "Wages above RM700.00 and up to RM800.00",
      lower_bound_sen: 7e4,
      upper_bound_sen: 8e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 375,
      category1_employer_employment_injury_sen: 940,
      category1_employer_total_sen: 1315,
      category1_employee_invalidity_sen: 375,
      category1_employee_lindung24_sen: 565,
      category1_employee_total_sen: 940,
      category1_grand_total_sen: 2255,
      category2_employer_employment_injury_sen: 940,
      category2_employer_total_sen: 940,
      category2_employee_lindung24_sen: 565,
      category2_employee_total_sen: 565,
      category2_grand_total_sen: 1505,
      category1_employer_total_rm: "13.15",
      category1_employee_invalidity_rm: "3.75",
      category1_employee_lindung24_rm: "5.65",
      category1_employee_total_rm: "9.40",
      category1_grand_total_rm: "22.55",
      category2_employer_total_rm: "9.40",
      category2_employee_lindung24_rm: "5.65",
      category2_employee_total_rm: "5.65",
      category2_grand_total_rm: "15.05"
    },
    {
      bracket_number: 13,
      description: "Wages above RM800.00 and up to RM900.00",
      lower_bound_sen: 8e4,
      upper_bound_sen: 9e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 425,
      category1_employer_employment_injury_sen: 1060,
      category1_employer_total_sen: 1485,
      category1_employee_invalidity_sen: 425,
      category1_employee_lindung24_sen: 635,
      category1_employee_total_sen: 1060,
      category1_grand_total_sen: 2545,
      category2_employer_employment_injury_sen: 1060,
      category2_employer_total_sen: 1060,
      category2_employee_lindung24_sen: 635,
      category2_employee_total_sen: 635,
      category2_grand_total_sen: 1695,
      category1_employer_total_rm: "14.85",
      category1_employee_invalidity_rm: "4.25",
      category1_employee_lindung24_rm: "6.35",
      category1_employee_total_rm: "10.60",
      category1_grand_total_rm: "25.45",
      category2_employer_total_rm: "10.60",
      category2_employee_lindung24_rm: "6.35",
      category2_employee_total_rm: "6.35",
      category2_grand_total_rm: "16.95"
    },
    {
      bracket_number: 14,
      description: "Wages above RM900.00 and up to RM1,000.00",
      lower_bound_sen: 9e4,
      upper_bound_sen: 1e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 475,
      category1_employer_employment_injury_sen: 1190,
      category1_employer_total_sen: 1665,
      category1_employee_invalidity_sen: 475,
      category1_employee_lindung24_sen: 715,
      category1_employee_total_sen: 1190,
      category1_grand_total_sen: 2855,
      category2_employer_employment_injury_sen: 1190,
      category2_employer_total_sen: 1190,
      category2_employee_lindung24_sen: 715,
      category2_employee_total_sen: 715,
      category2_grand_total_sen: 1905,
      category1_employer_total_rm: "16.65",
      category1_employee_invalidity_rm: "4.75",
      category1_employee_lindung24_rm: "7.15",
      category1_employee_total_rm: "11.90",
      category1_grand_total_rm: "28.55",
      category2_employer_total_rm: "11.90",
      category2_employee_lindung24_rm: "7.15",
      category2_employee_total_rm: "7.15",
      category2_grand_total_rm: "19.05"
    },
    {
      bracket_number: 15,
      description: "Wages above RM1,000.00 and up to RM1,100.00",
      lower_bound_sen: 1e5,
      upper_bound_sen: 11e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 525,
      category1_employer_employment_injury_sen: 1310,
      category1_employer_total_sen: 1835,
      category1_employee_invalidity_sen: 525,
      category1_employee_lindung24_sen: 785,
      category1_employee_total_sen: 1310,
      category1_grand_total_sen: 3145,
      category2_employer_employment_injury_sen: 1310,
      category2_employer_total_sen: 1310,
      category2_employee_lindung24_sen: 785,
      category2_employee_total_sen: 785,
      category2_grand_total_sen: 2095,
      category1_employer_total_rm: "18.35",
      category1_employee_invalidity_rm: "5.25",
      category1_employee_lindung24_rm: "7.85",
      category1_employee_total_rm: "13.10",
      category1_grand_total_rm: "31.45",
      category2_employer_total_rm: "13.10",
      category2_employee_lindung24_rm: "7.85",
      category2_employee_total_rm: "7.85",
      category2_grand_total_rm: "20.95"
    },
    {
      bracket_number: 16,
      description: "Wages above RM1,100.00 and up to RM1,200.00",
      lower_bound_sen: 11e4,
      upper_bound_sen: 12e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 575,
      category1_employer_employment_injury_sen: 1440,
      category1_employer_total_sen: 2015,
      category1_employee_invalidity_sen: 575,
      category1_employee_lindung24_sen: 865,
      category1_employee_total_sen: 1440,
      category1_grand_total_sen: 3455,
      category2_employer_employment_injury_sen: 1440,
      category2_employer_total_sen: 1440,
      category2_employee_lindung24_sen: 865,
      category2_employee_total_sen: 865,
      category2_grand_total_sen: 2305,
      category1_employer_total_rm: "20.15",
      category1_employee_invalidity_rm: "5.75",
      category1_employee_lindung24_rm: "8.65",
      category1_employee_total_rm: "14.40",
      category1_grand_total_rm: "34.55",
      category2_employer_total_rm: "14.40",
      category2_employee_lindung24_rm: "8.65",
      category2_employee_total_rm: "8.65",
      category2_grand_total_rm: "23.05"
    },
    {
      bracket_number: 17,
      description: "Wages above RM1,200.00 and up to RM1,300.00",
      lower_bound_sen: 12e4,
      upper_bound_sen: 13e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 625,
      category1_employer_employment_injury_sen: 1560,
      category1_employer_total_sen: 2185,
      category1_employee_invalidity_sen: 625,
      category1_employee_lindung24_sen: 935,
      category1_employee_total_sen: 1560,
      category1_grand_total_sen: 3745,
      category2_employer_employment_injury_sen: 1560,
      category2_employer_total_sen: 1560,
      category2_employee_lindung24_sen: 935,
      category2_employee_total_sen: 935,
      category2_grand_total_sen: 2495,
      category1_employer_total_rm: "21.85",
      category1_employee_invalidity_rm: "6.25",
      category1_employee_lindung24_rm: "9.35",
      category1_employee_total_rm: "15.60",
      category1_grand_total_rm: "37.45",
      category2_employer_total_rm: "15.60",
      category2_employee_lindung24_rm: "9.35",
      category2_employee_total_rm: "9.35",
      category2_grand_total_rm: "24.95"
    },
    {
      bracket_number: 18,
      description: "Wages above RM1,300.00 and up to RM1,400.00",
      lower_bound_sen: 13e4,
      upper_bound_sen: 14e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 675,
      category1_employer_employment_injury_sen: 1690,
      category1_employer_total_sen: 2365,
      category1_employee_invalidity_sen: 675,
      category1_employee_lindung24_sen: 1015,
      category1_employee_total_sen: 1690,
      category1_grand_total_sen: 4055,
      category2_employer_employment_injury_sen: 1690,
      category2_employer_total_sen: 1690,
      category2_employee_lindung24_sen: 1015,
      category2_employee_total_sen: 1015,
      category2_grand_total_sen: 2705,
      category1_employer_total_rm: "23.65",
      category1_employee_invalidity_rm: "6.75",
      category1_employee_lindung24_rm: "10.15",
      category1_employee_total_rm: "16.90",
      category1_grand_total_rm: "40.55",
      category2_employer_total_rm: "16.90",
      category2_employee_lindung24_rm: "10.15",
      category2_employee_total_rm: "10.15",
      category2_grand_total_rm: "27.05"
    },
    {
      bracket_number: 19,
      description: "Wages above RM1,400.00 and up to RM1,500.00",
      lower_bound_sen: 14e4,
      upper_bound_sen: 15e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 725,
      category1_employer_employment_injury_sen: 1810,
      category1_employer_total_sen: 2535,
      category1_employee_invalidity_sen: 725,
      category1_employee_lindung24_sen: 1085,
      category1_employee_total_sen: 1810,
      category1_grand_total_sen: 4345,
      category2_employer_employment_injury_sen: 1810,
      category2_employer_total_sen: 1810,
      category2_employee_lindung24_sen: 1085,
      category2_employee_total_sen: 1085,
      category2_grand_total_sen: 2895,
      category1_employer_total_rm: "25.35",
      category1_employee_invalidity_rm: "7.25",
      category1_employee_lindung24_rm: "10.85",
      category1_employee_total_rm: "18.10",
      category1_grand_total_rm: "43.45",
      category2_employer_total_rm: "18.10",
      category2_employee_lindung24_rm: "10.85",
      category2_employee_total_rm: "10.85",
      category2_grand_total_rm: "28.95"
    },
    {
      bracket_number: 20,
      description: "Wages above RM1,500.00 and up to RM1,600.00",
      lower_bound_sen: 15e4,
      upper_bound_sen: 16e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 775,
      category1_employer_employment_injury_sen: 1940,
      category1_employer_total_sen: 2715,
      category1_employee_invalidity_sen: 775,
      category1_employee_lindung24_sen: 1165,
      category1_employee_total_sen: 1940,
      category1_grand_total_sen: 4655,
      category2_employer_employment_injury_sen: 1940,
      category2_employer_total_sen: 1940,
      category2_employee_lindung24_sen: 1165,
      category2_employee_total_sen: 1165,
      category2_grand_total_sen: 3105,
      category1_employer_total_rm: "27.15",
      category1_employee_invalidity_rm: "7.75",
      category1_employee_lindung24_rm: "11.65",
      category1_employee_total_rm: "19.40",
      category1_grand_total_rm: "46.55",
      category2_employer_total_rm: "19.40",
      category2_employee_lindung24_rm: "11.65",
      category2_employee_total_rm: "11.65",
      category2_grand_total_rm: "31.05"
    },
    {
      bracket_number: 21,
      description: "Wages above RM1,600.00 and up to RM1,700.00",
      lower_bound_sen: 16e4,
      upper_bound_sen: 17e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 825,
      category1_employer_employment_injury_sen: 2060,
      category1_employer_total_sen: 2885,
      category1_employee_invalidity_sen: 825,
      category1_employee_lindung24_sen: 1235,
      category1_employee_total_sen: 2060,
      category1_grand_total_sen: 4945,
      category2_employer_employment_injury_sen: 2060,
      category2_employer_total_sen: 2060,
      category2_employee_lindung24_sen: 1235,
      category2_employee_total_sen: 1235,
      category2_grand_total_sen: 3295,
      category1_employer_total_rm: "28.85",
      category1_employee_invalidity_rm: "8.25",
      category1_employee_lindung24_rm: "12.35",
      category1_employee_total_rm: "20.60",
      category1_grand_total_rm: "49.45",
      category2_employer_total_rm: "20.60",
      category2_employee_lindung24_rm: "12.35",
      category2_employee_total_rm: "12.35",
      category2_grand_total_rm: "32.95"
    },
    {
      bracket_number: 22,
      description: "Wages above RM1,700.00 and up to RM1,800.00",
      lower_bound_sen: 17e4,
      upper_bound_sen: 18e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 875,
      category1_employer_employment_injury_sen: 2190,
      category1_employer_total_sen: 3065,
      category1_employee_invalidity_sen: 875,
      category1_employee_lindung24_sen: 1315,
      category1_employee_total_sen: 2190,
      category1_grand_total_sen: 5255,
      category2_employer_employment_injury_sen: 2190,
      category2_employer_total_sen: 2190,
      category2_employee_lindung24_sen: 1315,
      category2_employee_total_sen: 1315,
      category2_grand_total_sen: 3505,
      category1_employer_total_rm: "30.65",
      category1_employee_invalidity_rm: "8.75",
      category1_employee_lindung24_rm: "13.15",
      category1_employee_total_rm: "21.90",
      category1_grand_total_rm: "52.55",
      category2_employer_total_rm: "21.90",
      category2_employee_lindung24_rm: "13.15",
      category2_employee_total_rm: "13.15",
      category2_grand_total_rm: "35.05"
    },
    {
      bracket_number: 23,
      description: "Wages above RM1,800.00 and up to RM1,900.00",
      lower_bound_sen: 18e4,
      upper_bound_sen: 19e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 925,
      category1_employer_employment_injury_sen: 2310,
      category1_employer_total_sen: 3235,
      category1_employee_invalidity_sen: 925,
      category1_employee_lindung24_sen: 1385,
      category1_employee_total_sen: 2310,
      category1_grand_total_sen: 5545,
      category2_employer_employment_injury_sen: 2310,
      category2_employer_total_sen: 2310,
      category2_employee_lindung24_sen: 1385,
      category2_employee_total_sen: 1385,
      category2_grand_total_sen: 3695,
      category1_employer_total_rm: "32.35",
      category1_employee_invalidity_rm: "9.25",
      category1_employee_lindung24_rm: "13.85",
      category1_employee_total_rm: "23.10",
      category1_grand_total_rm: "55.45",
      category2_employer_total_rm: "23.10",
      category2_employee_lindung24_rm: "13.85",
      category2_employee_total_rm: "13.85",
      category2_grand_total_rm: "36.95"
    },
    {
      bracket_number: 24,
      description: "Wages above RM1,900.00 and up to RM2,000.00",
      lower_bound_sen: 19e4,
      upper_bound_sen: 2e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 975,
      category1_employer_employment_injury_sen: 2440,
      category1_employer_total_sen: 3415,
      category1_employee_invalidity_sen: 975,
      category1_employee_lindung24_sen: 1465,
      category1_employee_total_sen: 2440,
      category1_grand_total_sen: 5855,
      category2_employer_employment_injury_sen: 2440,
      category2_employer_total_sen: 2440,
      category2_employee_lindung24_sen: 1465,
      category2_employee_total_sen: 1465,
      category2_grand_total_sen: 3905,
      category1_employer_total_rm: "34.15",
      category1_employee_invalidity_rm: "9.75",
      category1_employee_lindung24_rm: "14.65",
      category1_employee_total_rm: "24.40",
      category1_grand_total_rm: "58.55",
      category2_employer_total_rm: "24.40",
      category2_employee_lindung24_rm: "14.65",
      category2_employee_total_rm: "14.65",
      category2_grand_total_rm: "39.05"
    },
    {
      bracket_number: 25,
      description: "Wages above RM2,000.00 and up to RM2,100.00",
      lower_bound_sen: 2e5,
      upper_bound_sen: 21e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1025,
      category1_employer_employment_injury_sen: 2560,
      category1_employer_total_sen: 3585,
      category1_employee_invalidity_sen: 1025,
      category1_employee_lindung24_sen: 1535,
      category1_employee_total_sen: 2560,
      category1_grand_total_sen: 6145,
      category2_employer_employment_injury_sen: 2560,
      category2_employer_total_sen: 2560,
      category2_employee_lindung24_sen: 1535,
      category2_employee_total_sen: 1535,
      category2_grand_total_sen: 4095,
      category1_employer_total_rm: "35.85",
      category1_employee_invalidity_rm: "10.25",
      category1_employee_lindung24_rm: "15.35",
      category1_employee_total_rm: "25.60",
      category1_grand_total_rm: "61.45",
      category2_employer_total_rm: "25.60",
      category2_employee_lindung24_rm: "15.35",
      category2_employee_total_rm: "15.35",
      category2_grand_total_rm: "40.95"
    },
    {
      bracket_number: 26,
      description: "Wages above RM2,100.00 and up to RM2,200.00",
      lower_bound_sen: 21e4,
      upper_bound_sen: 22e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1075,
      category1_employer_employment_injury_sen: 2690,
      category1_employer_total_sen: 3765,
      category1_employee_invalidity_sen: 1075,
      category1_employee_lindung24_sen: 1615,
      category1_employee_total_sen: 2690,
      category1_grand_total_sen: 6455,
      category2_employer_employment_injury_sen: 2690,
      category2_employer_total_sen: 2690,
      category2_employee_lindung24_sen: 1615,
      category2_employee_total_sen: 1615,
      category2_grand_total_sen: 4305,
      category1_employer_total_rm: "37.65",
      category1_employee_invalidity_rm: "10.75",
      category1_employee_lindung24_rm: "16.15",
      category1_employee_total_rm: "26.90",
      category1_grand_total_rm: "64.55",
      category2_employer_total_rm: "26.90",
      category2_employee_lindung24_rm: "16.15",
      category2_employee_total_rm: "16.15",
      category2_grand_total_rm: "43.05"
    },
    {
      bracket_number: 27,
      description: "Wages above RM2,200.00 and up to RM2,300.00",
      lower_bound_sen: 22e4,
      upper_bound_sen: 23e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1125,
      category1_employer_employment_injury_sen: 2810,
      category1_employer_total_sen: 3935,
      category1_employee_invalidity_sen: 1125,
      category1_employee_lindung24_sen: 1685,
      category1_employee_total_sen: 2810,
      category1_grand_total_sen: 6745,
      category2_employer_employment_injury_sen: 2810,
      category2_employer_total_sen: 2810,
      category2_employee_lindung24_sen: 1685,
      category2_employee_total_sen: 1685,
      category2_grand_total_sen: 4495,
      category1_employer_total_rm: "39.35",
      category1_employee_invalidity_rm: "11.25",
      category1_employee_lindung24_rm: "16.85",
      category1_employee_total_rm: "28.10",
      category1_grand_total_rm: "67.45",
      category2_employer_total_rm: "28.10",
      category2_employee_lindung24_rm: "16.85",
      category2_employee_total_rm: "16.85",
      category2_grand_total_rm: "44.95"
    },
    {
      bracket_number: 28,
      description: "Wages above RM2,300.00 and up to RM2,400.00",
      lower_bound_sen: 23e4,
      upper_bound_sen: 24e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1175,
      category1_employer_employment_injury_sen: 2940,
      category1_employer_total_sen: 4115,
      category1_employee_invalidity_sen: 1175,
      category1_employee_lindung24_sen: 1765,
      category1_employee_total_sen: 2940,
      category1_grand_total_sen: 7055,
      category2_employer_employment_injury_sen: 2940,
      category2_employer_total_sen: 2940,
      category2_employee_lindung24_sen: 1765,
      category2_employee_total_sen: 1765,
      category2_grand_total_sen: 4705,
      category1_employer_total_rm: "41.15",
      category1_employee_invalidity_rm: "11.75",
      category1_employee_lindung24_rm: "17.65",
      category1_employee_total_rm: "29.40",
      category1_grand_total_rm: "70.55",
      category2_employer_total_rm: "29.40",
      category2_employee_lindung24_rm: "17.65",
      category2_employee_total_rm: "17.65",
      category2_grand_total_rm: "47.05"
    },
    {
      bracket_number: 29,
      description: "Wages above RM2,400.00 and up to RM2,500.00",
      lower_bound_sen: 24e4,
      upper_bound_sen: 25e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1225,
      category1_employer_employment_injury_sen: 3060,
      category1_employer_total_sen: 4285,
      category1_employee_invalidity_sen: 1225,
      category1_employee_lindung24_sen: 1835,
      category1_employee_total_sen: 3060,
      category1_grand_total_sen: 7345,
      category2_employer_employment_injury_sen: 3060,
      category2_employer_total_sen: 3060,
      category2_employee_lindung24_sen: 1835,
      category2_employee_total_sen: 1835,
      category2_grand_total_sen: 4895,
      category1_employer_total_rm: "42.85",
      category1_employee_invalidity_rm: "12.25",
      category1_employee_lindung24_rm: "18.35",
      category1_employee_total_rm: "30.60",
      category1_grand_total_rm: "73.45",
      category2_employer_total_rm: "30.60",
      category2_employee_lindung24_rm: "18.35",
      category2_employee_total_rm: "18.35",
      category2_grand_total_rm: "48.95"
    },
    {
      bracket_number: 30,
      description: "Wages above RM2,500.00 and up to RM2,600.00",
      lower_bound_sen: 25e4,
      upper_bound_sen: 26e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1275,
      category1_employer_employment_injury_sen: 3190,
      category1_employer_total_sen: 4465,
      category1_employee_invalidity_sen: 1275,
      category1_employee_lindung24_sen: 1915,
      category1_employee_total_sen: 3190,
      category1_grand_total_sen: 7655,
      category2_employer_employment_injury_sen: 3190,
      category2_employer_total_sen: 3190,
      category2_employee_lindung24_sen: 1915,
      category2_employee_total_sen: 1915,
      category2_grand_total_sen: 5105,
      category1_employer_total_rm: "44.65",
      category1_employee_invalidity_rm: "12.75",
      category1_employee_lindung24_rm: "19.15",
      category1_employee_total_rm: "31.90",
      category1_grand_total_rm: "76.55",
      category2_employer_total_rm: "31.90",
      category2_employee_lindung24_rm: "19.15",
      category2_employee_total_rm: "19.15",
      category2_grand_total_rm: "51.05"
    },
    {
      bracket_number: 31,
      description: "Wages above RM2,600.00 and up to RM2,700.00",
      lower_bound_sen: 26e4,
      upper_bound_sen: 27e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1325,
      category1_employer_employment_injury_sen: 3310,
      category1_employer_total_sen: 4635,
      category1_employee_invalidity_sen: 1325,
      category1_employee_lindung24_sen: 1985,
      category1_employee_total_sen: 3310,
      category1_grand_total_sen: 7945,
      category2_employer_employment_injury_sen: 3310,
      category2_employer_total_sen: 3310,
      category2_employee_lindung24_sen: 1985,
      category2_employee_total_sen: 1985,
      category2_grand_total_sen: 5295,
      category1_employer_total_rm: "46.35",
      category1_employee_invalidity_rm: "13.25",
      category1_employee_lindung24_rm: "19.85",
      category1_employee_total_rm: "33.10",
      category1_grand_total_rm: "79.45",
      category2_employer_total_rm: "33.10",
      category2_employee_lindung24_rm: "19.85",
      category2_employee_total_rm: "19.85",
      category2_grand_total_rm: "52.95"
    },
    {
      bracket_number: 32,
      description: "Wages above RM2,700.00 and up to RM2,800.00",
      lower_bound_sen: 27e4,
      upper_bound_sen: 28e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1375,
      category1_employer_employment_injury_sen: 3440,
      category1_employer_total_sen: 4815,
      category1_employee_invalidity_sen: 1375,
      category1_employee_lindung24_sen: 2065,
      category1_employee_total_sen: 3440,
      category1_grand_total_sen: 8255,
      category2_employer_employment_injury_sen: 3440,
      category2_employer_total_sen: 3440,
      category2_employee_lindung24_sen: 2065,
      category2_employee_total_sen: 2065,
      category2_grand_total_sen: 5505,
      category1_employer_total_rm: "48.15",
      category1_employee_invalidity_rm: "13.75",
      category1_employee_lindung24_rm: "20.65",
      category1_employee_total_rm: "34.40",
      category1_grand_total_rm: "82.55",
      category2_employer_total_rm: "34.40",
      category2_employee_lindung24_rm: "20.65",
      category2_employee_total_rm: "20.65",
      category2_grand_total_rm: "55.05"
    },
    {
      bracket_number: 33,
      description: "Wages above RM2,800.00 and up to RM2,900.00",
      lower_bound_sen: 28e4,
      upper_bound_sen: 29e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1425,
      category1_employer_employment_injury_sen: 3560,
      category1_employer_total_sen: 4985,
      category1_employee_invalidity_sen: 1425,
      category1_employee_lindung24_sen: 2135,
      category1_employee_total_sen: 3560,
      category1_grand_total_sen: 8545,
      category2_employer_employment_injury_sen: 3560,
      category2_employer_total_sen: 3560,
      category2_employee_lindung24_sen: 2135,
      category2_employee_total_sen: 2135,
      category2_grand_total_sen: 5695,
      category1_employer_total_rm: "49.85",
      category1_employee_invalidity_rm: "14.25",
      category1_employee_lindung24_rm: "21.35",
      category1_employee_total_rm: "35.60",
      category1_grand_total_rm: "85.45",
      category2_employer_total_rm: "35.60",
      category2_employee_lindung24_rm: "21.35",
      category2_employee_total_rm: "21.35",
      category2_grand_total_rm: "56.95"
    },
    {
      bracket_number: 34,
      description: "Wages above RM2,900.00 and up to RM3,000.00",
      lower_bound_sen: 29e4,
      upper_bound_sen: 3e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1475,
      category1_employer_employment_injury_sen: 3690,
      category1_employer_total_sen: 5165,
      category1_employee_invalidity_sen: 1475,
      category1_employee_lindung24_sen: 2215,
      category1_employee_total_sen: 3690,
      category1_grand_total_sen: 8855,
      category2_employer_employment_injury_sen: 3690,
      category2_employer_total_sen: 3690,
      category2_employee_lindung24_sen: 2215,
      category2_employee_total_sen: 2215,
      category2_grand_total_sen: 5905,
      category1_employer_total_rm: "51.65",
      category1_employee_invalidity_rm: "14.75",
      category1_employee_lindung24_rm: "22.15",
      category1_employee_total_rm: "36.90",
      category1_grand_total_rm: "88.55",
      category2_employer_total_rm: "36.90",
      category2_employee_lindung24_rm: "22.15",
      category2_employee_total_rm: "22.15",
      category2_grand_total_rm: "59.05"
    },
    {
      bracket_number: 35,
      description: "Wages above RM3,000.00 and up to RM3,100.00",
      lower_bound_sen: 3e5,
      upper_bound_sen: 31e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1525,
      category1_employer_employment_injury_sen: 3810,
      category1_employer_total_sen: 5335,
      category1_employee_invalidity_sen: 1525,
      category1_employee_lindung24_sen: 2285,
      category1_employee_total_sen: 3810,
      category1_grand_total_sen: 9145,
      category2_employer_employment_injury_sen: 3810,
      category2_employer_total_sen: 3810,
      category2_employee_lindung24_sen: 2285,
      category2_employee_total_sen: 2285,
      category2_grand_total_sen: 6095,
      category1_employer_total_rm: "53.35",
      category1_employee_invalidity_rm: "15.25",
      category1_employee_lindung24_rm: "22.85",
      category1_employee_total_rm: "38.10",
      category1_grand_total_rm: "91.45",
      category2_employer_total_rm: "38.10",
      category2_employee_lindung24_rm: "22.85",
      category2_employee_total_rm: "22.85",
      category2_grand_total_rm: "60.95"
    },
    {
      bracket_number: 36,
      description: "Wages above RM3,100.00 and up to RM3,200.00",
      lower_bound_sen: 31e4,
      upper_bound_sen: 32e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1575,
      category1_employer_employment_injury_sen: 3940,
      category1_employer_total_sen: 5515,
      category1_employee_invalidity_sen: 1575,
      category1_employee_lindung24_sen: 2365,
      category1_employee_total_sen: 3940,
      category1_grand_total_sen: 9455,
      category2_employer_employment_injury_sen: 3940,
      category2_employer_total_sen: 3940,
      category2_employee_lindung24_sen: 2365,
      category2_employee_total_sen: 2365,
      category2_grand_total_sen: 6305,
      category1_employer_total_rm: "55.15",
      category1_employee_invalidity_rm: "15.75",
      category1_employee_lindung24_rm: "23.65",
      category1_employee_total_rm: "39.40",
      category1_grand_total_rm: "94.55",
      category2_employer_total_rm: "39.40",
      category2_employee_lindung24_rm: "23.65",
      category2_employee_total_rm: "23.65",
      category2_grand_total_rm: "63.05"
    },
    {
      bracket_number: 37,
      description: "Wages above RM3,200.00 and up to RM3,300.00",
      lower_bound_sen: 32e4,
      upper_bound_sen: 33e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1625,
      category1_employer_employment_injury_sen: 4060,
      category1_employer_total_sen: 5685,
      category1_employee_invalidity_sen: 1625,
      category1_employee_lindung24_sen: 2435,
      category1_employee_total_sen: 4060,
      category1_grand_total_sen: 9745,
      category2_employer_employment_injury_sen: 4060,
      category2_employer_total_sen: 4060,
      category2_employee_lindung24_sen: 2435,
      category2_employee_total_sen: 2435,
      category2_grand_total_sen: 6495,
      category1_employer_total_rm: "56.85",
      category1_employee_invalidity_rm: "16.25",
      category1_employee_lindung24_rm: "24.35",
      category1_employee_total_rm: "40.60",
      category1_grand_total_rm: "97.45",
      category2_employer_total_rm: "40.60",
      category2_employee_lindung24_rm: "24.35",
      category2_employee_total_rm: "24.35",
      category2_grand_total_rm: "64.95"
    },
    {
      bracket_number: 38,
      description: "Wages above RM3,300.00 and up to RM3,400.00",
      lower_bound_sen: 33e4,
      upper_bound_sen: 34e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1675,
      category1_employer_employment_injury_sen: 4190,
      category1_employer_total_sen: 5865,
      category1_employee_invalidity_sen: 1675,
      category1_employee_lindung24_sen: 2515,
      category1_employee_total_sen: 4190,
      category1_grand_total_sen: 10055,
      category2_employer_employment_injury_sen: 4190,
      category2_employer_total_sen: 4190,
      category2_employee_lindung24_sen: 2515,
      category2_employee_total_sen: 2515,
      category2_grand_total_sen: 6705,
      category1_employer_total_rm: "58.65",
      category1_employee_invalidity_rm: "16.75",
      category1_employee_lindung24_rm: "25.15",
      category1_employee_total_rm: "41.90",
      category1_grand_total_rm: "100.55",
      category2_employer_total_rm: "41.90",
      category2_employee_lindung24_rm: "25.15",
      category2_employee_total_rm: "25.15",
      category2_grand_total_rm: "67.05"
    },
    {
      bracket_number: 39,
      description: "Wages above RM3,400.00 and up to RM3,500.00",
      lower_bound_sen: 34e4,
      upper_bound_sen: 35e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1725,
      category1_employer_employment_injury_sen: 4310,
      category1_employer_total_sen: 6035,
      category1_employee_invalidity_sen: 1725,
      category1_employee_lindung24_sen: 2585,
      category1_employee_total_sen: 4310,
      category1_grand_total_sen: 10345,
      category2_employer_employment_injury_sen: 4310,
      category2_employer_total_sen: 4310,
      category2_employee_lindung24_sen: 2585,
      category2_employee_total_sen: 2585,
      category2_grand_total_sen: 6895,
      category1_employer_total_rm: "60.35",
      category1_employee_invalidity_rm: "17.25",
      category1_employee_lindung24_rm: "25.85",
      category1_employee_total_rm: "43.10",
      category1_grand_total_rm: "103.45",
      category2_employer_total_rm: "43.10",
      category2_employee_lindung24_rm: "25.85",
      category2_employee_total_rm: "25.85",
      category2_grand_total_rm: "68.95"
    },
    {
      bracket_number: 40,
      description: "Wages above RM3,500.00 and up to RM3,600.00",
      lower_bound_sen: 35e4,
      upper_bound_sen: 36e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1775,
      category1_employer_employment_injury_sen: 4440,
      category1_employer_total_sen: 6215,
      category1_employee_invalidity_sen: 1775,
      category1_employee_lindung24_sen: 2665,
      category1_employee_total_sen: 4440,
      category1_grand_total_sen: 10655,
      category2_employer_employment_injury_sen: 4440,
      category2_employer_total_sen: 4440,
      category2_employee_lindung24_sen: 2665,
      category2_employee_total_sen: 2665,
      category2_grand_total_sen: 7105,
      category1_employer_total_rm: "62.15",
      category1_employee_invalidity_rm: "17.75",
      category1_employee_lindung24_rm: "26.65",
      category1_employee_total_rm: "44.40",
      category1_grand_total_rm: "106.55",
      category2_employer_total_rm: "44.40",
      category2_employee_lindung24_rm: "26.65",
      category2_employee_total_rm: "26.65",
      category2_grand_total_rm: "71.05"
    },
    {
      bracket_number: 41,
      description: "Wages above RM3,600.00 and up to RM3,700.00",
      lower_bound_sen: 36e4,
      upper_bound_sen: 37e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1825,
      category1_employer_employment_injury_sen: 4560,
      category1_employer_total_sen: 6385,
      category1_employee_invalidity_sen: 1825,
      category1_employee_lindung24_sen: 2735,
      category1_employee_total_sen: 4560,
      category1_grand_total_sen: 10945,
      category2_employer_employment_injury_sen: 4560,
      category2_employer_total_sen: 4560,
      category2_employee_lindung24_sen: 2735,
      category2_employee_total_sen: 2735,
      category2_grand_total_sen: 7295,
      category1_employer_total_rm: "63.85",
      category1_employee_invalidity_rm: "18.25",
      category1_employee_lindung24_rm: "27.35",
      category1_employee_total_rm: "45.60",
      category1_grand_total_rm: "109.45",
      category2_employer_total_rm: "45.60",
      category2_employee_lindung24_rm: "27.35",
      category2_employee_total_rm: "27.35",
      category2_grand_total_rm: "72.95"
    },
    {
      bracket_number: 42,
      description: "Wages above RM3,700.00 and up to RM3,800.00",
      lower_bound_sen: 37e4,
      upper_bound_sen: 38e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1875,
      category1_employer_employment_injury_sen: 4690,
      category1_employer_total_sen: 6565,
      category1_employee_invalidity_sen: 1875,
      category1_employee_lindung24_sen: 2815,
      category1_employee_total_sen: 4690,
      category1_grand_total_sen: 11255,
      category2_employer_employment_injury_sen: 4690,
      category2_employer_total_sen: 4690,
      category2_employee_lindung24_sen: 2815,
      category2_employee_total_sen: 2815,
      category2_grand_total_sen: 7505,
      category1_employer_total_rm: "65.65",
      category1_employee_invalidity_rm: "18.75",
      category1_employee_lindung24_rm: "28.15",
      category1_employee_total_rm: "46.90",
      category1_grand_total_rm: "112.55",
      category2_employer_total_rm: "46.90",
      category2_employee_lindung24_rm: "28.15",
      category2_employee_total_rm: "28.15",
      category2_grand_total_rm: "75.05"
    },
    {
      bracket_number: 43,
      description: "Wages above RM3,800.00 and up to RM3,900.00",
      lower_bound_sen: 38e4,
      upper_bound_sen: 39e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1925,
      category1_employer_employment_injury_sen: 4810,
      category1_employer_total_sen: 6735,
      category1_employee_invalidity_sen: 1925,
      category1_employee_lindung24_sen: 2885,
      category1_employee_total_sen: 4810,
      category1_grand_total_sen: 11545,
      category2_employer_employment_injury_sen: 4810,
      category2_employer_total_sen: 4810,
      category2_employee_lindung24_sen: 2885,
      category2_employee_total_sen: 2885,
      category2_grand_total_sen: 7695,
      category1_employer_total_rm: "67.35",
      category1_employee_invalidity_rm: "19.25",
      category1_employee_lindung24_rm: "28.85",
      category1_employee_total_rm: "48.10",
      category1_grand_total_rm: "115.45",
      category2_employer_total_rm: "48.10",
      category2_employee_lindung24_rm: "28.85",
      category2_employee_total_rm: "28.85",
      category2_grand_total_rm: "76.95"
    },
    {
      bracket_number: 44,
      description: "Wages above RM3,900.00 and up to RM4,000.00",
      lower_bound_sen: 39e4,
      upper_bound_sen: 4e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 1975,
      category1_employer_employment_injury_sen: 4940,
      category1_employer_total_sen: 6915,
      category1_employee_invalidity_sen: 1975,
      category1_employee_lindung24_sen: 2965,
      category1_employee_total_sen: 4940,
      category1_grand_total_sen: 11855,
      category2_employer_employment_injury_sen: 4940,
      category2_employer_total_sen: 4940,
      category2_employee_lindung24_sen: 2965,
      category2_employee_total_sen: 2965,
      category2_grand_total_sen: 7905,
      category1_employer_total_rm: "69.15",
      category1_employee_invalidity_rm: "19.75",
      category1_employee_lindung24_rm: "29.65",
      category1_employee_total_rm: "49.40",
      category1_grand_total_rm: "118.55",
      category2_employer_total_rm: "49.40",
      category2_employee_lindung24_rm: "29.65",
      category2_employee_total_rm: "29.65",
      category2_grand_total_rm: "79.05"
    },
    {
      bracket_number: 45,
      description: "Wages above RM4,000.00 and up to RM4,100.00",
      lower_bound_sen: 4e5,
      upper_bound_sen: 41e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2025,
      category1_employer_employment_injury_sen: 5060,
      category1_employer_total_sen: 7085,
      category1_employee_invalidity_sen: 2025,
      category1_employee_lindung24_sen: 3035,
      category1_employee_total_sen: 5060,
      category1_grand_total_sen: 12145,
      category2_employer_employment_injury_sen: 5060,
      category2_employer_total_sen: 5060,
      category2_employee_lindung24_sen: 3035,
      category2_employee_total_sen: 3035,
      category2_grand_total_sen: 8095,
      category1_employer_total_rm: "70.85",
      category1_employee_invalidity_rm: "20.25",
      category1_employee_lindung24_rm: "30.35",
      category1_employee_total_rm: "50.60",
      category1_grand_total_rm: "121.45",
      category2_employer_total_rm: "50.60",
      category2_employee_lindung24_rm: "30.35",
      category2_employee_total_rm: "30.35",
      category2_grand_total_rm: "80.95"
    },
    {
      bracket_number: 46,
      description: "Wages above RM4,100.00 and up to RM4,200.00",
      lower_bound_sen: 41e4,
      upper_bound_sen: 42e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2075,
      category1_employer_employment_injury_sen: 5190,
      category1_employer_total_sen: 7265,
      category1_employee_invalidity_sen: 2075,
      category1_employee_lindung24_sen: 3115,
      category1_employee_total_sen: 5190,
      category1_grand_total_sen: 12455,
      category2_employer_employment_injury_sen: 5190,
      category2_employer_total_sen: 5190,
      category2_employee_lindung24_sen: 3115,
      category2_employee_total_sen: 3115,
      category2_grand_total_sen: 8305,
      category1_employer_total_rm: "72.65",
      category1_employee_invalidity_rm: "20.75",
      category1_employee_lindung24_rm: "31.15",
      category1_employee_total_rm: "51.90",
      category1_grand_total_rm: "124.55",
      category2_employer_total_rm: "51.90",
      category2_employee_lindung24_rm: "31.15",
      category2_employee_total_rm: "31.15",
      category2_grand_total_rm: "83.05"
    },
    {
      bracket_number: 47,
      description: "Wages above RM4,200.00 and up to RM4,300.00",
      lower_bound_sen: 42e4,
      upper_bound_sen: 43e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2125,
      category1_employer_employment_injury_sen: 5310,
      category1_employer_total_sen: 7435,
      category1_employee_invalidity_sen: 2125,
      category1_employee_lindung24_sen: 3185,
      category1_employee_total_sen: 5310,
      category1_grand_total_sen: 12745,
      category2_employer_employment_injury_sen: 5310,
      category2_employer_total_sen: 5310,
      category2_employee_lindung24_sen: 3185,
      category2_employee_total_sen: 3185,
      category2_grand_total_sen: 8495,
      category1_employer_total_rm: "74.35",
      category1_employee_invalidity_rm: "21.25",
      category1_employee_lindung24_rm: "31.85",
      category1_employee_total_rm: "53.10",
      category1_grand_total_rm: "127.45",
      category2_employer_total_rm: "53.10",
      category2_employee_lindung24_rm: "31.85",
      category2_employee_total_rm: "31.85",
      category2_grand_total_rm: "84.95"
    },
    {
      bracket_number: 48,
      description: "Wages above RM4,300.00 and up to RM4,400.00",
      lower_bound_sen: 43e4,
      upper_bound_sen: 44e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2175,
      category1_employer_employment_injury_sen: 5440,
      category1_employer_total_sen: 7615,
      category1_employee_invalidity_sen: 2175,
      category1_employee_lindung24_sen: 3265,
      category1_employee_total_sen: 5440,
      category1_grand_total_sen: 13055,
      category2_employer_employment_injury_sen: 5440,
      category2_employer_total_sen: 5440,
      category2_employee_lindung24_sen: 3265,
      category2_employee_total_sen: 3265,
      category2_grand_total_sen: 8705,
      category1_employer_total_rm: "76.15",
      category1_employee_invalidity_rm: "21.75",
      category1_employee_lindung24_rm: "32.65",
      category1_employee_total_rm: "54.40",
      category1_grand_total_rm: "130.55",
      category2_employer_total_rm: "54.40",
      category2_employee_lindung24_rm: "32.65",
      category2_employee_total_rm: "32.65",
      category2_grand_total_rm: "87.05"
    },
    {
      bracket_number: 49,
      description: "Wages above RM4,400.00 and up to RM4,500.00",
      lower_bound_sen: 44e4,
      upper_bound_sen: 45e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2225,
      category1_employer_employment_injury_sen: 5560,
      category1_employer_total_sen: 7785,
      category1_employee_invalidity_sen: 2225,
      category1_employee_lindung24_sen: 3335,
      category1_employee_total_sen: 5560,
      category1_grand_total_sen: 13345,
      category2_employer_employment_injury_sen: 5560,
      category2_employer_total_sen: 5560,
      category2_employee_lindung24_sen: 3335,
      category2_employee_total_sen: 3335,
      category2_grand_total_sen: 8895,
      category1_employer_total_rm: "77.85",
      category1_employee_invalidity_rm: "22.25",
      category1_employee_lindung24_rm: "33.35",
      category1_employee_total_rm: "55.60",
      category1_grand_total_rm: "133.45",
      category2_employer_total_rm: "55.60",
      category2_employee_lindung24_rm: "33.35",
      category2_employee_total_rm: "33.35",
      category2_grand_total_rm: "88.95"
    },
    {
      bracket_number: 50,
      description: "Wages above RM4,500.00 and up to RM4,600.00",
      lower_bound_sen: 45e4,
      upper_bound_sen: 46e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2275,
      category1_employer_employment_injury_sen: 5690,
      category1_employer_total_sen: 7965,
      category1_employee_invalidity_sen: 2275,
      category1_employee_lindung24_sen: 3415,
      category1_employee_total_sen: 5690,
      category1_grand_total_sen: 13655,
      category2_employer_employment_injury_sen: 5690,
      category2_employer_total_sen: 5690,
      category2_employee_lindung24_sen: 3415,
      category2_employee_total_sen: 3415,
      category2_grand_total_sen: 9105,
      category1_employer_total_rm: "79.65",
      category1_employee_invalidity_rm: "22.75",
      category1_employee_lindung24_rm: "34.15",
      category1_employee_total_rm: "56.90",
      category1_grand_total_rm: "136.55",
      category2_employer_total_rm: "56.90",
      category2_employee_lindung24_rm: "34.15",
      category2_employee_total_rm: "34.15",
      category2_grand_total_rm: "91.05"
    },
    {
      bracket_number: 51,
      description: "Wages above RM4,600.00 and up to RM4,700.00",
      lower_bound_sen: 46e4,
      upper_bound_sen: 47e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2325,
      category1_employer_employment_injury_sen: 5810,
      category1_employer_total_sen: 8135,
      category1_employee_invalidity_sen: 2325,
      category1_employee_lindung24_sen: 3485,
      category1_employee_total_sen: 5810,
      category1_grand_total_sen: 13945,
      category2_employer_employment_injury_sen: 5810,
      category2_employer_total_sen: 5810,
      category2_employee_lindung24_sen: 3485,
      category2_employee_total_sen: 3485,
      category2_grand_total_sen: 9295,
      category1_employer_total_rm: "81.35",
      category1_employee_invalidity_rm: "23.25",
      category1_employee_lindung24_rm: "34.85",
      category1_employee_total_rm: "58.10",
      category1_grand_total_rm: "139.45",
      category2_employer_total_rm: "58.10",
      category2_employee_lindung24_rm: "34.85",
      category2_employee_total_rm: "34.85",
      category2_grand_total_rm: "92.95"
    },
    {
      bracket_number: 52,
      description: "Wages above RM4,700.00 and up to RM4,800.00",
      lower_bound_sen: 47e4,
      upper_bound_sen: 48e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2375,
      category1_employer_employment_injury_sen: 5940,
      category1_employer_total_sen: 8315,
      category1_employee_invalidity_sen: 2375,
      category1_employee_lindung24_sen: 3565,
      category1_employee_total_sen: 5940,
      category1_grand_total_sen: 14255,
      category2_employer_employment_injury_sen: 5940,
      category2_employer_total_sen: 5940,
      category2_employee_lindung24_sen: 3565,
      category2_employee_total_sen: 3565,
      category2_grand_total_sen: 9505,
      category1_employer_total_rm: "83.15",
      category1_employee_invalidity_rm: "23.75",
      category1_employee_lindung24_rm: "35.65",
      category1_employee_total_rm: "59.40",
      category1_grand_total_rm: "142.55",
      category2_employer_total_rm: "59.40",
      category2_employee_lindung24_rm: "35.65",
      category2_employee_total_rm: "35.65",
      category2_grand_total_rm: "95.05"
    },
    {
      bracket_number: 53,
      description: "Wages above RM4,800.00 and up to RM4,900.00",
      lower_bound_sen: 48e4,
      upper_bound_sen: 49e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2425,
      category1_employer_employment_injury_sen: 6060,
      category1_employer_total_sen: 8485,
      category1_employee_invalidity_sen: 2425,
      category1_employee_lindung24_sen: 3635,
      category1_employee_total_sen: 6060,
      category1_grand_total_sen: 14545,
      category2_employer_employment_injury_sen: 6060,
      category2_employer_total_sen: 6060,
      category2_employee_lindung24_sen: 3635,
      category2_employee_total_sen: 3635,
      category2_grand_total_sen: 9695,
      category1_employer_total_rm: "84.85",
      category1_employee_invalidity_rm: "24.25",
      category1_employee_lindung24_rm: "36.35",
      category1_employee_total_rm: "60.60",
      category1_grand_total_rm: "145.45",
      category2_employer_total_rm: "60.60",
      category2_employee_lindung24_rm: "36.35",
      category2_employee_total_rm: "36.35",
      category2_grand_total_rm: "96.95"
    },
    {
      bracket_number: 54,
      description: "Wages above RM4,900.00 and up to RM5,000.00",
      lower_bound_sen: 49e4,
      upper_bound_sen: 5e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2475,
      category1_employer_employment_injury_sen: 6190,
      category1_employer_total_sen: 8665,
      category1_employee_invalidity_sen: 2475,
      category1_employee_lindung24_sen: 3715,
      category1_employee_total_sen: 6190,
      category1_grand_total_sen: 14855,
      category2_employer_employment_injury_sen: 6190,
      category2_employer_total_sen: 6190,
      category2_employee_lindung24_sen: 3715,
      category2_employee_total_sen: 3715,
      category2_grand_total_sen: 9905,
      category1_employer_total_rm: "86.65",
      category1_employee_invalidity_rm: "24.75",
      category1_employee_lindung24_rm: "37.15",
      category1_employee_total_rm: "61.90",
      category1_grand_total_rm: "148.55",
      category2_employer_total_rm: "61.90",
      category2_employee_lindung24_rm: "37.15",
      category2_employee_total_rm: "37.15",
      category2_grand_total_rm: "99.05"
    },
    {
      bracket_number: 55,
      description: "Wages above RM5,000.00 and up to RM5,100.00",
      lower_bound_sen: 5e5,
      upper_bound_sen: 51e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2525,
      category1_employer_employment_injury_sen: 6310,
      category1_employer_total_sen: 8835,
      category1_employee_invalidity_sen: 2525,
      category1_employee_lindung24_sen: 3785,
      category1_employee_total_sen: 6310,
      category1_grand_total_sen: 15145,
      category2_employer_employment_injury_sen: 6310,
      category2_employer_total_sen: 6310,
      category2_employee_lindung24_sen: 3785,
      category2_employee_total_sen: 3785,
      category2_grand_total_sen: 10095,
      category1_employer_total_rm: "88.35",
      category1_employee_invalidity_rm: "25.25",
      category1_employee_lindung24_rm: "37.85",
      category1_employee_total_rm: "63.10",
      category1_grand_total_rm: "151.45",
      category2_employer_total_rm: "63.10",
      category2_employee_lindung24_rm: "37.85",
      category2_employee_total_rm: "37.85",
      category2_grand_total_rm: "100.95"
    },
    {
      bracket_number: 56,
      description: "Wages above RM5,100.00 and up to RM5,200.00",
      lower_bound_sen: 51e4,
      upper_bound_sen: 52e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2575,
      category1_employer_employment_injury_sen: 6440,
      category1_employer_total_sen: 9015,
      category1_employee_invalidity_sen: 2575,
      category1_employee_lindung24_sen: 3865,
      category1_employee_total_sen: 6440,
      category1_grand_total_sen: 15455,
      category2_employer_employment_injury_sen: 6440,
      category2_employer_total_sen: 6440,
      category2_employee_lindung24_sen: 3865,
      category2_employee_total_sen: 3865,
      category2_grand_total_sen: 10305,
      category1_employer_total_rm: "90.15",
      category1_employee_invalidity_rm: "25.75",
      category1_employee_lindung24_rm: "38.65",
      category1_employee_total_rm: "64.40",
      category1_grand_total_rm: "154.55",
      category2_employer_total_rm: "64.40",
      category2_employee_lindung24_rm: "38.65",
      category2_employee_total_rm: "38.65",
      category2_grand_total_rm: "103.05"
    },
    {
      bracket_number: 57,
      description: "Wages above RM5,200.00 and up to RM5,300.00",
      lower_bound_sen: 52e4,
      upper_bound_sen: 53e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2625,
      category1_employer_employment_injury_sen: 6560,
      category1_employer_total_sen: 9185,
      category1_employee_invalidity_sen: 2625,
      category1_employee_lindung24_sen: 3935,
      category1_employee_total_sen: 6560,
      category1_grand_total_sen: 15745,
      category2_employer_employment_injury_sen: 6560,
      category2_employer_total_sen: 6560,
      category2_employee_lindung24_sen: 3935,
      category2_employee_total_sen: 3935,
      category2_grand_total_sen: 10495,
      category1_employer_total_rm: "91.85",
      category1_employee_invalidity_rm: "26.25",
      category1_employee_lindung24_rm: "39.35",
      category1_employee_total_rm: "65.60",
      category1_grand_total_rm: "157.45",
      category2_employer_total_rm: "65.60",
      category2_employee_lindung24_rm: "39.35",
      category2_employee_total_rm: "39.35",
      category2_grand_total_rm: "104.95"
    },
    {
      bracket_number: 58,
      description: "Wages above RM5,300.00 and up to RM5,400.00",
      lower_bound_sen: 53e4,
      upper_bound_sen: 54e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2675,
      category1_employer_employment_injury_sen: 6690,
      category1_employer_total_sen: 9365,
      category1_employee_invalidity_sen: 2675,
      category1_employee_lindung24_sen: 4015,
      category1_employee_total_sen: 6690,
      category1_grand_total_sen: 16055,
      category2_employer_employment_injury_sen: 6690,
      category2_employer_total_sen: 6690,
      category2_employee_lindung24_sen: 4015,
      category2_employee_total_sen: 4015,
      category2_grand_total_sen: 10705,
      category1_employer_total_rm: "93.65",
      category1_employee_invalidity_rm: "26.75",
      category1_employee_lindung24_rm: "40.15",
      category1_employee_total_rm: "66.90",
      category1_grand_total_rm: "160.55",
      category2_employer_total_rm: "66.90",
      category2_employee_lindung24_rm: "40.15",
      category2_employee_total_rm: "40.15",
      category2_grand_total_rm: "107.05"
    },
    {
      bracket_number: 59,
      description: "Wages above RM5,400.00 and up to RM5,500.00",
      lower_bound_sen: 54e4,
      upper_bound_sen: 55e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2725,
      category1_employer_employment_injury_sen: 6810,
      category1_employer_total_sen: 9535,
      category1_employee_invalidity_sen: 2725,
      category1_employee_lindung24_sen: 4085,
      category1_employee_total_sen: 6810,
      category1_grand_total_sen: 16345,
      category2_employer_employment_injury_sen: 6810,
      category2_employer_total_sen: 6810,
      category2_employee_lindung24_sen: 4085,
      category2_employee_total_sen: 4085,
      category2_grand_total_sen: 10895,
      category1_employer_total_rm: "95.35",
      category1_employee_invalidity_rm: "27.25",
      category1_employee_lindung24_rm: "40.85",
      category1_employee_total_rm: "68.10",
      category1_grand_total_rm: "163.45",
      category2_employer_total_rm: "68.10",
      category2_employee_lindung24_rm: "40.85",
      category2_employee_total_rm: "40.85",
      category2_grand_total_rm: "108.95"
    },
    {
      bracket_number: 60,
      description: "Wages above RM5,500.00 and up to RM5,600.00",
      lower_bound_sen: 55e4,
      upper_bound_sen: 56e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2775,
      category1_employer_employment_injury_sen: 6940,
      category1_employer_total_sen: 9715,
      category1_employee_invalidity_sen: 2775,
      category1_employee_lindung24_sen: 4165,
      category1_employee_total_sen: 6940,
      category1_grand_total_sen: 16655,
      category2_employer_employment_injury_sen: 6940,
      category2_employer_total_sen: 6940,
      category2_employee_lindung24_sen: 4165,
      category2_employee_total_sen: 4165,
      category2_grand_total_sen: 11105,
      category1_employer_total_rm: "97.15",
      category1_employee_invalidity_rm: "27.75",
      category1_employee_lindung24_rm: "41.65",
      category1_employee_total_rm: "69.40",
      category1_grand_total_rm: "166.55",
      category2_employer_total_rm: "69.40",
      category2_employee_lindung24_rm: "41.65",
      category2_employee_total_rm: "41.65",
      category2_grand_total_rm: "111.05"
    },
    {
      bracket_number: 61,
      description: "Wages above RM5,600.00 and up to RM5,700.00",
      lower_bound_sen: 56e4,
      upper_bound_sen: 57e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2825,
      category1_employer_employment_injury_sen: 7060,
      category1_employer_total_sen: 9885,
      category1_employee_invalidity_sen: 2825,
      category1_employee_lindung24_sen: 4235,
      category1_employee_total_sen: 7060,
      category1_grand_total_sen: 16945,
      category2_employer_employment_injury_sen: 7060,
      category2_employer_total_sen: 7060,
      category2_employee_lindung24_sen: 4235,
      category2_employee_total_sen: 4235,
      category2_grand_total_sen: 11295,
      category1_employer_total_rm: "98.85",
      category1_employee_invalidity_rm: "28.25",
      category1_employee_lindung24_rm: "42.35",
      category1_employee_total_rm: "70.60",
      category1_grand_total_rm: "169.45",
      category2_employer_total_rm: "70.60",
      category2_employee_lindung24_rm: "42.35",
      category2_employee_total_rm: "42.35",
      category2_grand_total_rm: "112.95"
    },
    {
      bracket_number: 62,
      description: "Wages above RM5,700.00 and up to RM5,800.00",
      lower_bound_sen: 57e4,
      upper_bound_sen: 58e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2875,
      category1_employer_employment_injury_sen: 7190,
      category1_employer_total_sen: 10065,
      category1_employee_invalidity_sen: 2875,
      category1_employee_lindung24_sen: 4315,
      category1_employee_total_sen: 7190,
      category1_grand_total_sen: 17255,
      category2_employer_employment_injury_sen: 7190,
      category2_employer_total_sen: 7190,
      category2_employee_lindung24_sen: 4315,
      category2_employee_total_sen: 4315,
      category2_grand_total_sen: 11505,
      category1_employer_total_rm: "100.65",
      category1_employee_invalidity_rm: "28.75",
      category1_employee_lindung24_rm: "43.15",
      category1_employee_total_rm: "71.90",
      category1_grand_total_rm: "172.55",
      category2_employer_total_rm: "71.90",
      category2_employee_lindung24_rm: "43.15",
      category2_employee_total_rm: "43.15",
      category2_grand_total_rm: "115.05"
    },
    {
      bracket_number: 63,
      description: "Wages above RM5,800.00 and up to RM5,900.00",
      lower_bound_sen: 58e4,
      upper_bound_sen: 59e4,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2925,
      category1_employer_employment_injury_sen: 7310,
      category1_employer_total_sen: 10235,
      category1_employee_invalidity_sen: 2925,
      category1_employee_lindung24_sen: 4385,
      category1_employee_total_sen: 7310,
      category1_grand_total_sen: 17545,
      category2_employer_employment_injury_sen: 7310,
      category2_employer_total_sen: 7310,
      category2_employee_lindung24_sen: 4385,
      category2_employee_total_sen: 4385,
      category2_grand_total_sen: 11695,
      category1_employer_total_rm: "102.35",
      category1_employee_invalidity_rm: "29.25",
      category1_employee_lindung24_rm: "43.85",
      category1_employee_total_rm: "73.10",
      category1_grand_total_rm: "175.45",
      category2_employer_total_rm: "73.10",
      category2_employee_lindung24_rm: "43.85",
      category2_employee_total_rm: "43.85",
      category2_grand_total_rm: "116.95"
    },
    {
      bracket_number: 64,
      description: "Wages above RM5,900.00 and up to RM6,000.00",
      lower_bound_sen: 59e4,
      upper_bound_sen: 6e5,
      lower_bound_inclusive: false,
      upper_bound_inclusive: true,
      is_maximum_bracket: false,
      category1_employer_invalidity_sen: 2975,
      category1_employer_employment_injury_sen: 7440,
      category1_employer_total_sen: 10415,
      category1_employee_invalidity_sen: 2975,
      category1_employee_lindung24_sen: 4465,
      category1_employee_total_sen: 7440,
      category1_grand_total_sen: 17855,
      category2_employer_employment_injury_sen: 7440,
      category2_employer_total_sen: 7440,
      category2_employee_lindung24_sen: 4465,
      category2_employee_total_sen: 4465,
      category2_grand_total_sen: 11905,
      category1_employer_total_rm: "104.15",
      category1_employee_invalidity_rm: "29.75",
      category1_employee_lindung24_rm: "44.65",
      category1_employee_total_rm: "74.40",
      category1_grand_total_rm: "178.55",
      category2_employer_total_rm: "74.40",
      category2_employee_lindung24_rm: "44.65",
      category2_employee_total_rm: "44.65",
      category2_grand_total_rm: "119.05"
    },
    {
      bracket_number: 65,
      description: "Wages above RM6,000.00; apply RM6,000.00 ceiling",
      lower_bound_sen: 6e5,
      upper_bound_sen: null,
      lower_bound_inclusive: false,
      upper_bound_inclusive: false,
      is_maximum_bracket: true,
      category1_employer_invalidity_sen: 2975,
      category1_employer_employment_injury_sen: 7440,
      category1_employer_total_sen: 10415,
      category1_employee_invalidity_sen: 2975,
      category1_employee_lindung24_sen: 4465,
      category1_employee_total_sen: 7440,
      category1_grand_total_sen: 17855,
      category2_employer_employment_injury_sen: 7440,
      category2_employer_total_sen: 7440,
      category2_employee_lindung24_sen: 4465,
      category2_employee_total_sen: 4465,
      category2_grand_total_sen: 11905,
      category1_employer_total_rm: "104.15",
      category1_employee_invalidity_rm: "29.75",
      category1_employee_lindung24_rm: "44.65",
      category1_employee_total_rm: "74.40",
      category1_grand_total_rm: "178.55",
      category2_employer_total_rm: "74.40",
      category2_employee_lindung24_rm: "44.65",
      category2_employee_total_rm: "44.65",
      category2_grand_total_rm: "119.05"
    }
  ]
};

// src/lib/dateUtils.ts
function getGmt8DateString() {
  const d = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}
function formatToDDMMMYYYY(dateInput) {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      if (typeof dateInput === "string" && /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateInput)) {
        return dateInput;
      }
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

// src/lib/decimal.ts
var Decimal = class _Decimal {
  constructor(value) {
    if (typeof value === "number") {
      this.valueInCents = Math.round(value * 100);
    } else if (typeof value === "string") {
      const clean = value.trim();
      if (!/^\d+(\.\d+)?$/.test(clean)) {
        this.valueInCents = 0;
        return;
      }
      if (clean.includes(".")) {
        const [intPart, decPart] = clean.split(".");
        const paddedDec = decPart.padEnd(2, "0").slice(0, 2);
        this.valueInCents = parseInt(intPart, 10) * 100 + parseInt(paddedDec, 10);
      } else {
        this.valueInCents = parseInt(clean, 10) * 100;
      }
    } else {
      this.valueInCents = 0;
    }
  }
  static fromCents(cents) {
    const d = new _Decimal(0);
    d.valueInCents = Math.round(cents);
    return d;
  }
  add(other) {
    const otherCents = other instanceof _Decimal ? other.valueInCents : new _Decimal(other).valueInCents;
    return _Decimal.fromCents(this.valueInCents + otherCents);
  }
  sub(other) {
    const otherCents = other instanceof _Decimal ? other.valueInCents : new _Decimal(other).valueInCents;
    return _Decimal.fromCents(this.valueInCents - otherCents);
  }
  mul(factor) {
    return _Decimal.fromCents(Math.round(this.valueInCents * factor));
  }
  div(divisor) {
    if (divisor === 0) return _Decimal.fromCents(0);
    return _Decimal.fromCents(Math.round(this.valueInCents / divisor));
  }
  toNumber() {
    return this.valueInCents / 100;
  }
  toIntegerCents() {
    return this.valueInCents;
  }
  toString() {
    return (this.valueInCents / 100).toFixed(2);
  }
};
function dec(val) {
  return new Decimal(val);
}

// src/data.ts
var INITIAL_EMPLOYEES = [
  {
    id: "EMP-CHIN-KEE-JEAY",
    entityId: "ENT-92",
    name: "CHIN KEE JEAY",
    email: "chinkeejeay@gmail.com",
    designation: "Software Engineer",
    department: "Engineering",
    status: "Active",
    bankName: "Maybank",
    accountNo: "114012345678",
    basicSalary: 5e3,
    housingAllowance: 500,
    transportAllowance: 300,
    overtime: 0,
    performanceBonus: 0,
    epfRateEmployee: 11,
    epfRateEmployer: 13,
    socsoEmployee: 0,
    socsoEmployer: 0,
    eisEmployee: 0,
    eisEmployer: 0,
    taxPcb: 0,
    unpaidLeave: 0,
    hrdCorp: 0,
    nricPassport: "900101-14-5555",
    nationality: "Malaysian",
    taxNumber: "",
    employmentType: "Permanent",
    maritalStatus: "Single",
    eligibleForStatutory: "Yes",
    optInEpf: true,
    optInSocso: true,
    optInEis: true,
    optInPcb: true,
    enableLindung24: false,
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    dateOfJoined: "2024-01-01"
  }
];
var SEPARATE_PAYOUT_CONFIGS = {
  bonus: {
    kind: "bonus",
    title: "Bonus",
    compensationLabel: "Bonus",
    amountField: "bonusAmount",
    descriptionField: "bonusDesc",
    defaultStatutoryTreatment: "with_statutory"
  },
  incentive_commission: {
    kind: "incentive_commission",
    title: "Incentives / Commission",
    compensationLabel: "Incentives / Commission",
    amountField: "commissionAmount",
    descriptionField: "commissionDesc",
    defaultStatutoryTreatment: "with_statutory"
  },
  claim_reimbursement: {
    kind: "claim_reimbursement",
    title: "Claim / Reimbursement",
    compensationLabel: "Claim / Reimbursement",
    amountField: "reimbursementAmount",
    descriptionField: "reimbursementDesc",
    defaultStatutoryTreatment: "without_statutory"
  }
};
var isSeparatePayrollRecord = (record) => !!record && (record.isSeparatePayout === true || !!record.payoutKind && record.payoutKind !== "regular");
var getSeparatePayoutConfig = (kind) => SEPARATE_PAYOUT_CONFIGS[kind];
function getSeparatePayoutDocumentProfile(kind, statutoryTreatment) {
  const config = getSeparatePayoutConfig(kind);
  const statutoryEnabled = statutoryTreatment === "with_statutory";
  return {
    documentType: statutoryEnabled ? "Payslip" : "Payment Voucher",
    compensationLabel: config.compensationLabel,
    statutoryEnabled,
    isPaymentVoucher: !statutoryEnabled,
    requiresContractStatutoryChoice: false,
    contractStatutoryTreatment: statutoryTreatment
  };
}
function getPayrollDocumentProfileForRecord(employee, record) {
  const baseProfile = getPayrollDocumentProfile(employee);
  if (!record || !isSeparatePayrollRecord(record)) {
    return record?.documentType ? {
      ...baseProfile,
      documentType: record.documentType,
      isPaymentVoucher: record.documentType === "Payment Voucher",
      statutoryEnabled: record.documentType === "Payment Voucher" ? false : baseProfile.statutoryEnabled,
      compensationLabel: record.compensationLabel || baseProfile.compensationLabel
    } : baseProfile;
  }
  const payoutKind = record.payoutKind && record.payoutKind !== "regular" ? record.payoutKind : "bonus";
  const statutoryTreatment = record.statutoryTreatment || (record.documentType === "Payment Voucher" ? "without_statutory" : "with_statutory");
  return {
    ...getSeparatePayoutDocumentProfile(payoutKind, statutoryTreatment),
    documentType: record.documentType || (statutoryTreatment === "with_statutory" ? "Payslip" : "Payment Voucher"),
    compensationLabel: record.compensationLabel || getSeparatePayoutConfig(payoutKind).compensationLabel
  };
}
var isContractEmploymentType = (employmentType) => employmentType === "Contract" || employmentType === "Fixed Term Contract";
var resolveContractStatutoryTreatment = (employee) => {
  if (!isContractEmploymentType(employee.employmentType)) {
    return void 0;
  }
  if (employee.contractStatutoryTreatment) {
    return employee.contractStatutoryTreatment;
  }
  if (employee.eligibleForStatutory === "Yes") {
    return "with_statutory";
  }
  if (employee.eligibleForStatutory === "No") {
    return "without_statutory";
  }
  return void 0;
};
function getPayrollDocumentProfile(employee) {
  const employmentType = employee.employmentType || "Permanent";
  const contractTreatment = resolveContractStatutoryTreatment(employee);
  if (employmentType === "Probation" || employmentType === "Probationary" || employmentType === "Permanent" || employmentType === "Confirmation") {
    return {
      documentType: "Payslip",
      compensationLabel: "Basic Salary",
      statutoryEnabled: true,
      isPaymentVoucher: false,
      requiresContractStatutoryChoice: false
    };
  }
  if (isContractEmploymentType(employmentType)) {
    const statutoryEnabled = contractTreatment === "with_statutory";
    return {
      documentType: statutoryEnabled ? "Payslip" : "Payment Voucher",
      compensationLabel: statutoryEnabled ? "Basic Salary" : "Service Fees",
      statutoryEnabled,
      isPaymentVoucher: !statutoryEnabled,
      requiresContractStatutoryChoice: !contractTreatment,
      contractStatutoryTreatment: contractTreatment
    };
  }
  if (employmentType === "Part Time") {
    return {
      documentType: "Payment Voucher",
      compensationLabel: "Wages / Service Fees",
      statutoryEnabled: false,
      isPaymentVoucher: true,
      requiresContractStatutoryChoice: false
    };
  }
  if (employmentType === "Independent Contractor" || employmentType === "Independent Contractor / Freelance") {
    return {
      documentType: "Payment Voucher",
      compensationLabel: "Monthly Retainer",
      statutoryEnabled: false,
      isPaymentVoucher: true,
      requiresContractStatutoryChoice: false
    };
  }
  if (employmentType === "Internship") {
    return {
      documentType: "Payment Voucher",
      compensationLabel: "Allowance",
      statutoryEnabled: false,
      isPaymentVoucher: true,
      requiresContractStatutoryChoice: false
    };
  }
  return {
    documentType: "Payslip",
    compensationLabel: "Basic Salary",
    statutoryEnabled: true,
    isPaymentVoucher: false,
    requiresContractStatutoryChoice: false
  };
}
function getPayrollDocumentFieldLabels(profile) {
  if (profile.isPaymentVoucher) {
    return {
      detailsTitle: "Recipient Details",
      designation: "Service Role",
      dateJoined: "Engagement Start Date",
      employmentStatus: "Engagement Status"
    };
  }
  return {
    detailsTitle: "Employee Details",
    designation: "Designation",
    dateJoined: "Date Joined",
    employmentStatus: "Employment Status"
  };
}
function getDefaultPayrollDocumentDisplaySettings(employee) {
  const profile = getPayrollDocumentProfile(employee);
  return {
    showDesignation: true,
    showDepartment: true,
    showEmail: true,
    showNricPassport: true,
    showTin: true,
    showEpfNumber: profile.statutoryEnabled,
    showDateJoined: true,
    showLastWorkingDay: true,
    showBankAccount: true,
    showCompanyAddress: true,
    showEarningsDetails: true,
    showDeductionDetails: true,
    showEmployerContributions: profile.statutoryEnabled,
    showYtdSummary: profile.statutoryEnabled,
    showNotesFooter: true
  };
}
function getPayrollDocumentDisplaySettings(employee) {
  const profile = getPayrollDocumentProfile(employee);
  const defaults = getDefaultPayrollDocumentDisplaySettings(employee);
  const merged = {
    ...defaults,
    ...employee.payrollDocumentDisplaySettings || {}
  };
  if (!profile.statutoryEnabled) {
    merged.showEpfNumber = false;
    merged.showEmployerContributions = false;
  }
  return merged;
}
function getStatutoryDeductions2026(salary) {
  if (salary <= 0) {
    return { socsoEmployee: 0, socsoEmployer: 0, eisEmployee: 0, eisEmployer: 0 };
  }
  let eisEmployee = 0;
  let eisEmployer = 0;
  if (salary >= 6e3) {
    eisEmployee = 11.9;
    eisEmployer = 11.9;
  } else {
    const bracketVal = Math.ceil(salary / 100) * 100;
    eisEmployee = parseFloat((bracketVal * 2e-3 - 0.1).toFixed(2));
    eisEmployer = eisEmployee;
    if (eisEmployee < 0.1) {
      eisEmployee = 0.1;
      eisEmployer = 0.1;
    }
  }
  let socsoEmployee = 0;
  let socsoEmployer = 0;
  if (salary >= 6e3) {
    socsoEmployee = 29.15;
    socsoEmployer = 101.5;
  } else {
    const bracketVal = Math.ceil(salary / 100) * 100;
    if (bracketVal <= 1e3) {
      socsoEmployee = parseFloat((bracketVal * 5e-3 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 0.75).toFixed(2));
    } else if (bracketVal <= 3e3) {
      socsoEmployee = parseFloat((bracketVal * 5e-3 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 1).toFixed(2));
    } else if (bracketVal <= 4e3) {
      socsoEmployee = parseFloat((bracketVal * 5e-3 - 0.25).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 1.5).toFixed(2));
    } else if (bracketVal <= 5e3) {
      socsoEmployee = parseFloat((bracketVal * 5e-3 - 0.75).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 3).toFixed(2));
    } else {
      socsoEmployee = parseFloat((bracketVal * 5e-3 - 0.85).toFixed(2));
      socsoEmployer = parseFloat((bracketVal * 0.0175 - 3.5).toFixed(2));
    }
    if (socsoEmployee < 0.1) socsoEmployee = 0.1;
    if (socsoEmployer < 0.4) socsoEmployer = 0.4;
  }
  return { socsoEmployee, socsoEmployer, eisEmployee, eisEmployer };
}
var DEFAULT_SOCSO_EARNING_COMPONENTS = [
  { earningCode: "basic_salary", earningName: "Basic Salary", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Salary", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "overtime", earningName: "Overtime Pay", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Overtime", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "commission", earningName: "Commissions", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Commission", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_general", earningName: "General Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_transport", earningName: "Transport Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_parking", earningName: "Parking Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_meal", earningName: "Meal Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_accommodation", earningName: "Accommodation Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "allowance_phone", earningName: "Phone Allowance", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Allowance", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "bonus", earningName: "Performance Bonus", subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: "Bonus", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "backpay", earningName: "BackPay / Arrears", subjectToSocso: true, includedInSocsoWages: true, excludedFromSocsoWages: false, earningCategory: "Remuneration", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "aws", earningName: "AWS (13th Month)", subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: "Bonus", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "compensation", earningName: "Compensation / Severance", subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: "Compensation", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false },
  { earningCode: "reimbursement", earningName: "Reimbursement", subjectToSocso: false, includedInSocsoWages: false, excludedFromSocsoWages: true, earningCategory: "Reimbursement", effectiveFrom: "2020-01-01", effectiveTo: "9999-12-31", statutoryReference: "Act 4", requiresReview: false }
];
function roundToTwoDecimals(val) {
  return Math.round(val * 100) / 100;
}
function generateOfficialSocsoBrackets(configId, category, phase) {
  const boundaries = [
    { min: 0, max: 30, assumed: 30 },
    { min: 30, max: 50, assumed: 50 },
    { min: 50, max: 70, assumed: 70 },
    { min: 70, max: 100, assumed: 100 },
    { min: 100, max: 140, assumed: 140 },
    { min: 140, max: 200, assumed: 200 },
    { min: 200, max: 300, assumed: 300 },
    { min: 300, max: 400, assumed: 400 }
  ];
  for (let val = 400; val < 5900; val += 100) {
    boundaries.push({
      min: val,
      max: val + 100,
      assumed: val + 100
    });
  }
  boundaries.push({
    min: 5900,
    max: 6e3,
    assumed: 5950
  });
  boundaries.push({
    min: 6e3,
    max: 999999,
    assumed: 5950
  });
  return boundaries.map((b, index) => {
    let employerEmploymentInjury = 0;
    let employerInvalidity = 0;
    let employeeInvalidity = 0;
    let employeeNonEmploymentInjury = 0;
    const assumed = b.assumed;
    let C_er = 0;
    let C_ee_l24 = 0;
    if (phase === "PRE_JUNE_2026") {
      if (assumed === 900) C_er = 0.1;
      else if (assumed === 1e3) C_er = 0.15;
      else if (assumed === 4e3) C_er = 0.3;
      else if (assumed === 5e3) C_er = category === "FIRST_CATEGORY" ? 1 : 0.4;
      else if (assumed === 5950) C_er = 0.025;
    } else {
      if (assumed === 900) C_er = 0.1;
      else if (assumed === 1e3) C_er = 0.15;
      else if (assumed === 3500) {
        C_er = 0.35;
        C_ee_l24 = 0.2;
      } else if (assumed === 4e3) C_er = 0.3;
      else if (assumed === 5e3) C_er = 0.4;
      else if (assumed === 5950) C_er = 0.025;
    }
    if (phase === "PRE_JUNE_2026") {
      if (category === "FIRST_CATEGORY") {
        const empTotal = roundToTwoDecimals(assumed * 0.0175 - C_er);
        employerInvalidity = roundToTwoDecimals(assumed * 5e-3);
        employerEmploymentInjury = roundToTwoDecimals(empTotal - employerInvalidity);
        employeeInvalidity = roundToTwoDecimals(assumed * 5e-3);
        employeeNonEmploymentInjury = 0;
      } else {
        employerEmploymentInjury = roundToTwoDecimals(assumed * 0.0125 - C_er);
        employerInvalidity = 0;
        employeeInvalidity = 0;
        employeeNonEmploymentInjury = 0;
      }
    } else {
      let lindung24Rate = 75e-4;
      if (phase === "LINDUNG24_PHASE_2") lindung24Rate = 0.01;
      if (phase === "LINDUNG24_PHASE_3") lindung24Rate = 0.0125;
      if (category === "FIRST_CATEGORY") {
        const empTotal = roundToTwoDecimals(assumed * 0.0175 - C_er);
        employerInvalidity = roundToTwoDecimals(assumed * 5e-3);
        employerEmploymentInjury = roundToTwoDecimals(empTotal - employerInvalidity);
        employeeInvalidity = roundToTwoDecimals(assumed * 5e-3);
        employeeNonEmploymentInjury = roundToTwoDecimals(assumed * lindung24Rate - C_ee_l24);
      } else {
        employerEmploymentInjury = roundToTwoDecimals(assumed * 0.0125 - C_er);
        employerInvalidity = 0;
        employeeInvalidity = 0;
        employeeNonEmploymentInjury = roundToTwoDecimals(assumed * lindung24Rate - C_ee_l24);
      }
    }
    if (b.min === 0) {
      if (phase === "PRE_JUNE_2026") {
        if (category === "FIRST_CATEGORY") {
          employerEmploymentInjury = 0.3;
          employerInvalidity = 0.1;
          employeeInvalidity = 0.1;
        } else {
          employerEmploymentInjury = 0.3;
        }
      } else {
        if (category === "FIRST_CATEGORY") {
          employerEmploymentInjury = 0.4;
          employerInvalidity = 0.15;
          employeeInvalidity = 0.15;
          employeeNonEmploymentInjury = 0.25;
        } else {
          employerEmploymentInjury = 0.4;
          employeeNonEmploymentInjury = 0.25;
        }
      }
    }
    const employerTotal = roundToTwoDecimals(employerEmploymentInjury + employerInvalidity);
    const employeeTotal = roundToTwoDecimals(employeeInvalidity + employeeNonEmploymentInjury);
    const combinedTotal = roundToTwoDecimals(employerTotal + employeeTotal);
    return {
      id: `${configId}-bracket-${index + 1}`,
      configurationId: configId,
      contributionCategory: category,
      lowerWageLimit: b.min,
      upperWageLimit: b.max,
      lowerLimitInclusive: b.min > 0 ? false : true,
      upperLimitInclusive: true,
      wageBracketNumber: index + 1,
      assumedMonthlyWage: assumed,
      employerEmploymentInjury: parseFloat(employerEmploymentInjury.toFixed(2)),
      employerInvalidity: parseFloat(employerInvalidity.toFixed(2)),
      employerTotal: parseFloat(employerTotal.toFixed(2)),
      employeeInvalidity: parseFloat(employeeInvalidity.toFixed(2)),
      employeeNonEmploymentInjury: parseFloat(employeeNonEmploymentInjury.toFixed(2)),
      employeeTotal: parseFloat(employeeTotal.toFixed(2)),
      combinedTotal: parseFloat(combinedTotal.toFixed(2)),
      effectiveFrom: phase === "PRE_JUNE_2026" ? "2020-01-01" : "2026-06-01",
      effectiveTo: phase === "PRE_JUNE_2026" ? "2026-05-31" : "9999-12-31"
    };
  });
}
function seedSocsoConfigurationsAndBrackets() {
  const existing = localStorage.getItem("socso_contribution_schedules");
  if (existing) return;
  const schedules = [
    {
      id: "cfg-perkeso-act4-lindung24-phase1-2026",
      schedule_code: "PERKESO_ACT4_LINDUNG24_PHASE1_2026",
      schedule_name: "PERKESO Act 4 First Phase Contribution Table including LINDUNG 24 JAM",
      effective_from: "2026-06-01",
      effective_to: null,
      currency: "MYR",
      storage_unit: "sen",
      wage_ceiling_sen: 6e5,
      status: "ACTIVE",
      official_source: "https://www.perkeso.gov.my/images/arahan/Employer_Circular_No_2_2026-PekelilingLindung24Jam_English.pdf",
      compatibility_reference: "https://payroll.my/payroll-software/socso-contribution-table",
      source_file_name: "socso_perkeso_2026_contribution_table.json",
      source_file_hash: "d3b07384d113edec49eaa6238ad5ff00",
      created_by: "system",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      approved_by: "system",
      approved_at: (/* @__PURE__ */ new Date()).toISOString(),
      activated_by: "system",
      activated_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const brackets = [];
  perkeso_lindung24_phase1_2026_default.rows.forEach((r) => {
    brackets.push({
      id: `cfg-perkeso-act4-lindung24-phase1-2026-bracket-${r.bracket_number}`,
      schedule_id: "cfg-perkeso-act4-lindung24-phase1-2026",
      bracket_number: r.bracket_number,
      description: r.description,
      lower_bound_sen: r.lower_bound_sen,
      upper_bound_sen: r.upper_bound_sen,
      lower_bound_inclusive: r.lower_bound_inclusive,
      upper_bound_inclusive: r.upper_bound_inclusive,
      is_maximum_bracket: r.is_maximum_bracket,
      category1_employer_invalidity_sen: r.category1_employer_invalidity_sen,
      category1_employer_employment_injury_sen: r.category1_employer_employment_injury_sen,
      category1_employer_total_sen: r.category1_employer_total_sen,
      category1_employee_invalidity_sen: r.category1_employee_invalidity_sen,
      category1_employee_lindung24_sen: r.category1_employee_lindung24_sen,
      category1_employee_total_sen: r.category1_employee_total_sen,
      category1_grand_total_sen: r.category1_grand_total_sen,
      category2_employer_employment_injury_sen: r.category2_employer_employment_injury_sen,
      category2_employer_total_sen: r.category2_employer_total_sen,
      category2_employee_lindung24_sen: r.category2_employee_lindung24_sen,
      category2_employee_total_sen: r.category2_employee_total_sen,
      category2_grand_total_sen: r.category2_grand_total_sen,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  const legacyConfigs = [
    {
      id: "cfg-pre-june-2026-c1",
      schemeCode: "SOCSO_ACT4",
      legislation: "Employees Social Security Act 1969, Act 4",
      contributionCategory: "FIRST_CATEGORY",
      phase: "PRE_JUNE_2026",
      effectiveFrom: "2020-01",
      effectiveTo: "2026-05",
      wageCeiling: 6e3,
      sourceDocument: "PERKESO Contribution Schedule Table 1",
      sourceDocumentDate: "2020-01-01",
      sourceVersion: "v1.0",
      status: "approved",
      approvedBy: "system-admin@nexus.com",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "cfg-pre-june-2026-c2",
      schemeCode: "SOCSO_ACT4",
      legislation: "Employees Social Security Act 1969, Act 4",
      contributionCategory: "SECOND_CATEGORY",
      phase: "PRE_JUNE_2026",
      effectiveFrom: "2020-01",
      effectiveTo: "2026-05",
      wageCeiling: 6e3,
      sourceDocument: "PERKESO Contribution Schedule Table 2",
      sourceDocumentDate: "2020-01-01",
      sourceVersion: "v1.0",
      status: "approved",
      approvedBy: "system-admin@nexus.com",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "cfg-lindung24-p1-c1",
      schemeCode: "LINDUNG_24_JAM",
      legislation: "Employees Social Security Act 1969, Act 4",
      contributionCategory: "FIRST_CATEGORY",
      phase: "LINDUNG24_PHASE_1",
      effectiveFrom: "2026-06",
      effectiveTo: "9999-12",
      wageCeiling: 6e3,
      sourceDocument: "PERKESO Gazette June 2026 Table 1",
      sourceDocumentDate: "2026-05-01",
      sourceVersion: "v2.0-p1",
      status: "approved",
      approvedBy: "system-admin@nexus.com",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "cfg-lindung24-p1-c2",
      schemeCode: "LINDUNG_24_JAM",
      legislation: "Employees Social Security Act 1969, Act 4",
      contributionCategory: "SECOND_CATEGORY",
      phase: "LINDUNG24_PHASE_1",
      effectiveFrom: "2026-06",
      effectiveTo: "9999-12",
      wageCeiling: 6e3,
      sourceDocument: "PERKESO Gazette June 2026 Table 2",
      sourceDocumentDate: "2026-05-01",
      sourceVersion: "v2.0-p1",
      status: "approved",
      approvedBy: "system-admin@nexus.com",
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const legacyBrackets = [];
  const preJune1Brackets = generateOfficialSocsoBrackets("cfg-pre-june-2026-c1", "FIRST_CATEGORY", "PRE_JUNE_2026");
  const preJune2Brackets = generateOfficialSocsoBrackets("cfg-pre-june-2026-c2", "SECOND_CATEGORY", "PRE_JUNE_2026");
  legacyBrackets.push(...preJune1Brackets, ...preJune2Brackets);
  perkeso_lindung24_phase1_2026_default.rows.forEach((r) => {
    legacyBrackets.push({
      id: `cfg-lindung24-p1-c1-bracket-${r.bracket_number}`,
      configurationId: "cfg-lindung24-p1-c1",
      contributionCategory: "FIRST_CATEGORY",
      lowerWageLimit: r.lower_bound_sen / 100,
      upperWageLimit: (r.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: r.lower_bound_inclusive,
      upperLimitInclusive: r.upper_bound_inclusive,
      wageBracketNumber: r.bracket_number,
      assumedMonthlyWage: r.lower_bound_sen / 100,
      employerEmploymentInjury: r.category1_employer_employment_injury_sen / 100,
      employerInvalidity: r.category1_employer_invalidity_sen / 100,
      employerTotal: r.category1_employer_total_sen / 100,
      employeeInvalidity: r.category1_employee_invalidity_sen / 100,
      employeeNonEmploymentInjury: r.category1_employee_lindung24_sen / 100,
      employeeTotal: r.category1_employee_total_sen / 100,
      combinedTotal: r.category1_grand_total_sen / 100,
      effectiveFrom: "2026-06-01",
      effectiveTo: "9999-12-31"
    });
    legacyBrackets.push({
      id: `cfg-lindung24-p1-c2-bracket-${r.bracket_number}`,
      configurationId: "cfg-lindung24-p1-c2",
      contributionCategory: "SECOND_CATEGORY",
      lowerWageLimit: r.lower_bound_sen / 100,
      upperWageLimit: (r.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: r.lower_bound_inclusive,
      upperLimitInclusive: r.upper_bound_inclusive,
      wageBracketNumber: r.bracket_number,
      assumedMonthlyWage: r.lower_bound_sen / 100,
      employerEmploymentInjury: r.category2_employer_employment_injury_sen / 100,
      employerInvalidity: 0,
      employerTotal: r.category2_employer_total_sen / 100,
      employeeInvalidity: 0,
      employeeNonEmploymentInjury: r.category2_employee_lindung24_sen / 100,
      employeeTotal: r.category2_employee_total_sen / 100,
      combinedTotal: r.category2_grand_total_sen / 100,
      effectiveFrom: "2026-06-01",
      effectiveTo: "9999-12-31"
    });
  });
  localStorage.setItem("socso_contribution_schedules", JSON.stringify(schedules));
  localStorage.setItem("socso_contribution_brackets_new", JSON.stringify(brackets));
  localStorage.setItem("socso_configurations", JSON.stringify(legacyConfigs));
  localStorage.setItem("socso_contribution_brackets", JSON.stringify(legacyBrackets));
  localStorage.setItem("socso_earning_components", JSON.stringify(DEFAULT_SOCSO_EARNING_COMPONENTS));
}
function determineSocsoCategory(employee, payrollPeriod) {
  const profile = employee.socsoProfile || {
    employeeId: employee.id,
    nationality: "Local",
    identityNumber: "",
    dateOfBirth: "1990-01-01",
    employmentStartDate: "2026-01-01",
    contractType: "Permanent",
    isUnderContractOfService: true,
    socsoRegistrationNumber: "",
    socsoRegistered: true,
    socsoCoverageStatus: "Covered",
    firstSocsoContributionDate: "2015-01-01",
    hasPreviousSocsoContribution: true,
    contributionCategory: "FIRST_CATEGORY",
    multipleEmployerStatus: "Single Employer",
    selectedEmployerForLindung24: true,
    foreignWorkerStatus: "Local",
    domesticWorkerStatus: false,
    effectiveFrom: "2026-01-01",
    effectiveTo: "9999-12-31"
  };
  if (profile.socsoCoverageStatus === "Exempt") {
    return "EXEMPT";
  }
  if (!profile.dateOfBirth) {
    return "REVIEW_REQUIRED";
  }
  const dob = new Date(profile.dateOfBirth);
  const payDate = /* @__PURE__ */ new Date(payrollPeriod + "-01");
  let age = payDate.getFullYear() - dob.getFullYear();
  const m = payDate.getMonth() - dob.getMonth();
  if (m < 0 || m === 0 && payDate.getDate() < dob.getDate()) {
    age--;
  }
  if (age >= 60) {
    return "SECOND_CATEGORY";
  }
  if (profile.hasPreviousSocsoContribution === void 0) return "REVIEW_REQUIRED";
  if (!profile.hasPreviousSocsoContribution && !profile.firstSocsoContributionDate) {
    return "REVIEW_REQUIRED";
  }
  if (profile.hasPreviousSocsoContribution === false && profile.firstSocsoContributionDate) {
    const firstDate = new Date(profile.firstSocsoContributionDate);
    let firstAge = firstDate.getFullYear() - dob.getFullYear();
    const firstM = firstDate.getMonth() - dob.getMonth();
    if (firstM < 0 || firstM === 0 && firstDate.getDate() < dob.getDate()) {
      firstAge--;
    }
    if (firstAge >= 55) {
      return "SECOND_CATEGORY";
    }
  }
  if (age >= 55 && profile.hasPreviousSocsoContribution && !profile.firstSocsoContributionDate) {
    return "REVIEW_REQUIRED";
  }
  if (!profile.foreignWorkerStatus) return "REVIEW_REQUIRED";
  if (profile.domesticWorkerStatus === void 0) return "REVIEW_REQUIRED";
  if (profile.multipleEmployerStatus === "Multiple Employers" && profile.selectedEmployerForLindung24 === void 0) {
    return "REVIEW_REQUIRED";
  }
  return "FIRST_CATEGORY";
}
function formatMYRFromSen(amountInSen) {
  const isNegative = amountInSen < 0;
  const absAmount = Math.abs(amountInSen);
  const ringgit = Math.floor(absAmount / 100);
  const cents = absAmount % 100;
  return `${isNegative ? "-" : ""}RM${ringgit}.${cents.toString().padStart(2, "0")}`;
}
function calculateSocsoWagesInSen(payrollItems) {
  let wagesInSen = 0;
  const config = JSON.parse(localStorage.getItem("socso_earning_components") || "[]");
  const activeComponents = config.length > 0 ? config : DEFAULT_SOCSO_EARNING_COMPONENTS;
  for (const item of payrollItems) {
    if (item.code === "unpaid_leave") continue;
    const comp = activeComponents.find((c) => c.earningCode === item.code);
    if (comp && comp.includedInSocsoWages) {
      wagesInSen += new Decimal(item.amount).toIntegerCents();
    }
  }
  const unpaid = payrollItems.find((item) => item.code === "unpaid_leave");
  if (unpaid) {
    wagesInSen -= new Decimal(unpaid.amount).toIntegerCents();
  }
  return wagesInSen < 0 ? 0 : wagesInSen;
}
function findSocsoBracket(scheduleOrWage, socsoWagesInSenOrCategory, period) {
  if (typeof scheduleOrWage === "object") {
    const schedule = scheduleOrWage;
    const wagesInSen = socsoWagesInSenOrCategory;
    const brackets = JSON.parse(localStorage.getItem("socso_contribution_brackets_new") || "[]");
    const matched = brackets.filter((b) => {
      if (b.schedule_id !== schedule.id) return false;
      const isAboveLower = b.lower_bound_inclusive ? wagesInSen >= b.lower_bound_sen : wagesInSen > b.lower_bound_sen;
      if (!isAboveLower) return false;
      if (b.is_maximum_bracket || b.upper_bound_sen === null) {
        return true;
      }
      const isBelowUpper = b.upper_bound_inclusive ? wagesInSen <= b.upper_bound_sen : wagesInSen < b.upper_bound_sen;
      return isBelowUpper;
    });
    if (matched.length === 0) {
      throw new Error(`No wage bracket is found for wage in sen: ${wagesInSen}`);
    }
    return matched[0];
  } else {
    const contributionWage = scheduleOrWage;
    const category = socsoWagesInSenOrCategory;
    const activePeriod = period || "2026-06";
    const wagesInSen = Math.round(contributionWage * 100);
    const schedules = JSON.parse(localStorage.getItem("socso_contribution_schedules") || "[]");
    let schedule = schedules.find((s) => {
      const matchCat = s.schedule_code.includes(category === "FIRST_CATEGORY" ? "C1" : "C2") || s.schedule_code.includes("PHASE1_2026") || s.schedule_code.includes("LINDUNG24");
      const startMonth = s.effective_from.substring(0, 7);
      const endMonth = s.effective_to ? s.effective_to.substring(0, 7) : null;
      return s.status === "ACTIVE" && startMonth <= activePeriod && (endMonth === null || activePeriod <= endMonth);
    });
    if (!schedule) {
      const brackets = JSON.parse(localStorage.getItem("socso_contribution_brackets") || "[]");
      const legacyConfig = JSON.parse(localStorage.getItem("socso_configurations") || "[]").find((c) => c.status === "approved" && c.effectiveFrom <= activePeriod && activePeriod <= c.effectiveTo && c.contributionCategory === category);
      if (legacyConfig) {
        const matched = brackets.filter((b) => b.configurationId === legacyConfig.id && b.contributionCategory === category && contributionWage > b.lowerWageLimit && contributionWage <= b.upperWageLimit);
        if (matched.length > 0) return matched[0];
      }
      throw new Error("No active schedule found for period: " + activePeriod);
    }
    const bracket = findSocsoBracket(schedule, wagesInSen);
    return {
      id: bracket.id,
      configurationId: bracket.schedule_id,
      contributionCategory: category,
      lowerWageLimit: bracket.lower_bound_sen / 100,
      upperWageLimit: (bracket.upper_bound_sen || 9999999) / 100,
      lowerLimitInclusive: bracket.lower_bound_inclusive,
      upperLimitInclusive: bracket.upper_bound_inclusive,
      wageBracketNumber: bracket.bracket_number,
      assumedMonthlyWage: bracket.lower_bound_sen / 100,
      // placeholder
      employerEmploymentInjury: (category === "FIRST_CATEGORY" ? bracket.category1_employer_employment_injury_sen : bracket.category2_employer_employment_injury_sen) / 100,
      employerInvalidity: (category === "FIRST_CATEGORY" ? bracket.category1_employer_invalidity_sen : 0) / 100,
      employerTotal: (category === "FIRST_CATEGORY" ? bracket.category1_employer_total_sen : bracket.category2_employer_total_sen) / 100,
      employeeInvalidity: (category === "FIRST_CATEGORY" ? bracket.category1_employee_invalidity_sen : 0) / 100,
      employeeNonEmploymentInjury: (category === "FIRST_CATEGORY" ? bracket.category1_employee_lindung24_sen : bracket.category2_employee_lindung24_sen) / 100,
      employeeTotal: (category === "FIRST_CATEGORY" ? bracket.category1_employee_total_sen : bracket.category2_employee_total_sen) / 100,
      combinedTotal: (category === "FIRST_CATEGORY" ? bracket.category1_grand_total_sen : bracket.category2_grand_total_sen) / 100,
      effectiveFrom: schedule.effective_from,
      effectiveTo: schedule.effective_to || "9999-12-31"
    };
  }
}
function calculateSocsoContribution(params) {
  let profile = params.employeeSocsoProfile || params.employee?.socsoProfile;
  if (!profile && params.employee) {
    profile = {
      employeeId: params.employee.id,
      nationality: "Local",
      identityNumber: "",
      dateOfBirth: "1990-01-01",
      employmentStartDate: "2026-01-01",
      contractType: "Permanent",
      isUnderContractOfService: true,
      socsoRegistrationNumber: "",
      socsoRegistered: true,
      socsoCoverageStatus: "Covered",
      firstSocsoContributionDate: "2015-01-01",
      hasPreviousSocsoContribution: true,
      contributionCategory: "FIRST_CATEGORY",
      multipleEmployerStatus: "Single Employer",
      selectedEmployerForLindung24: true,
      foreignWorkerStatus: "Local",
      domesticWorkerStatus: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "9999-12-31"
    };
  }
  if (!profile) {
    throw new Error("Employee SOCSO Profile is required.");
  }
  const rawPeriod = params.payrollContributionMonth || params.payrollPeriod || "2026-06";
  const period = rawPeriod.substring(0, 7);
  const items = params.payrollItems;
  const warnings = [];
  const errors = [];
  const category = params.employee ? determineSocsoCategory(params.employee, period) : profile.contributionCategory;
  if (category === "EXEMPT" || profile.socsoCoverageStatus === "Exempt") {
    return {
      employeeId: profile.employeeId,
      payrollPeriod: period,
      effectiveDate: getGmt8DateString(),
      socsoCoverageStatus: "Exempt",
      contributionCategory: "EXEMPT",
      grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
      includedSocsoWages: 0,
      excludedSocsoWages: 0,
      socsoWages: 0,
      contributionWage: 0,
      wageCeilingApplied: false,
      wageBracketNumber: 0,
      wageBracketDescription: "Statutory Exempt / Out of Scope",
      employerEmploymentInjury: 0,
      employerInvalidity: 0,
      employerSocsoTotal: 0,
      employeeInvalidity: 0,
      employeeLindung24: 0,
      employeeSocsoTotal: 0,
      totalSocsoContribution: 0,
      configurationVersion: "SYSTEM_EXEMPT",
      calculationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      warningMessages: [],
      validationErrors: [],
      calculationStatus: "exempt",
      display: {
        actualSocsoWagesFormatted: "RM0.00",
        employerTotalFormatted: "RM0.00",
        employeeInvalidityFormatted: "RM0.00",
        employeeLindung24Formatted: "RM0.00",
        employeeTotalFormatted: "RM0.00",
        grandTotalFormatted: "RM0.00"
      }
    };
  }
  const actualWagesInSen = calculateSocsoWagesInSen(items);
  if (period < "2026-06") {
    let legacyCat = "FIRST_CATEGORY";
    if (category === "SECOND_CATEGORY") {
      legacyCat = "SECOND_CATEGORY";
    }
    const bracket2 = findSocsoBracket(actualWagesInSen / 100, legacyCat, period);
    const erEmploymentInjury2 = bracket2.employerEmploymentInjury;
    const erInvalidity2 = bracket2.employerInvalidity;
    const erTotal2 = bracket2.employerTotal;
    const eeInvalidity2 = bracket2.employeeInvalidity;
    const eeLindung242 = bracket2.employeeNonEmploymentInjury || 0;
    const eeTotal2 = bracket2.employeeTotal;
    let finalEmployer2 = erTotal2;
    let finalEmployee2 = eeTotal2;
    let calcStatus2 = "calculated";
    const employeeId2 = params.employee?.id || profile.employeeId;
    const overrides2 = JSON.parse(localStorage.getItem("socso_manual_overrides") || "[]");
    const activeOverride2 = overrides2.find((o) => o.employeeId === employeeId2 && o.payrollPeriod === period);
    if (activeOverride2) {
      finalEmployer2 = activeOverride2.correctedEmployerSocso;
      finalEmployee2 = activeOverride2.correctedEmployeeSocso;
      calcStatus2 = "override_applied";
      warnings.push(`Manual statutory override applied: Employer corrected to RM ${finalEmployer2}, Employee corrected to RM ${finalEmployee2}.`);
    }
    return {
      employeeId: employeeId2,
      payrollPeriod: period,
      effectiveDate: getGmt8DateString(),
      socsoCoverageStatus: profile.socsoCoverageStatus,
      contributionCategory: category,
      grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
      includedSocsoWages: actualWagesInSen / 100,
      excludedSocsoWages: (items.reduce((sum, item) => sum + item.amount, 0) * 100 - actualWagesInSen) / 100,
      socsoWages: actualWagesInSen / 100,
      contributionWage: actualWagesInSen / 100,
      wageCeilingApplied: actualWagesInSen > 6e5,
      wageBracketNumber: bracket2.wageBracketNumber,
      wageBracketDescription: `${bracket2.lowerWageLimit} to ${bracket2.upperWageLimit}`,
      employerEmploymentInjury: erEmploymentInjury2,
      employerInvalidity: erInvalidity2,
      employerSocsoTotal: finalEmployer2,
      employeeInvalidity: eeInvalidity2,
      employeeLindung24: eeLindung242,
      employeeSocsoTotal: finalEmployee2,
      totalSocsoContribution: finalEmployer2 + finalEmployee2,
      configurationVersion: bracket2.configurationId,
      calculationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      warningMessages: warnings,
      validationErrors: errors,
      calculationStatus: calcStatus2,
      display: {
        actualSocsoWagesFormatted: `RM${(actualWagesInSen / 100).toFixed(2)}`,
        employerTotalFormatted: `RM${finalEmployer2.toFixed(2)}`,
        employeeInvalidityFormatted: `RM${eeInvalidity2.toFixed(2)}`,
        employeeLindung24Formatted: `RM${eeLindung242.toFixed(2)}`,
        employeeTotalFormatted: `RM${finalEmployee2.toFixed(2)}`,
        grandTotalFormatted: `RM${(finalEmployer2 + finalEmployee2).toFixed(2)}`
      }
    };
  }
  if (actualWagesInSen === 0) {
    return {
      employeeId: profile.employeeId,
      payrollPeriod: period,
      effectiveDate: getGmt8DateString(),
      socsoCoverageStatus: profile.socsoCoverageStatus,
      contributionCategory: category,
      grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
      includedSocsoWages: 0,
      excludedSocsoWages: 0,
      socsoWages: 0,
      contributionWage: 0,
      wageCeilingApplied: false,
      wageBracketNumber: 0,
      wageBracketDescription: "No wages payable",
      employerEmploymentInjury: 0,
      employerInvalidity: 0,
      employerSocsoTotal: 0,
      employeeInvalidity: 0,
      employeeLindung24: 0,
      employeeSocsoTotal: 0,
      totalSocsoContribution: 0,
      configurationVersion: "PERKESO_ACT4_LINDUNG24_PHASE1_2026",
      calculationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      warningMessages: [],
      validationErrors: [],
      calculationStatus: "exempt",
      display: {
        actualSocsoWagesFormatted: "RM0.00",
        employerTotalFormatted: "RM0.00",
        employeeInvalidityFormatted: "RM0.00",
        employeeLindung24Formatted: "RM0.00",
        employeeTotalFormatted: "RM0.00",
        grandTotalFormatted: "RM0.00"
      }
    };
  }
  let schedule = params.contributionSchedule;
  if (!schedule) {
    const schedules = JSON.parse(localStorage.getItem("socso_contribution_schedules") || "[]");
    schedule = schedules.find((s) => {
      const startMonth = s.effective_from.substring(0, 7);
      const endMonth = s.effective_to ? s.effective_to.substring(0, 7) : null;
      return s.status === "ACTIVE" && startMonth <= period && (endMonth === null || period <= endMonth);
    });
  }
  if (!schedule) {
    throw new Error("No active SOCSO contribution schedule found for period: " + period);
  }
  const lookupWagesInSen = Math.min(actualWagesInSen, schedule.wage_ceiling_sen);
  const wageCeilingApplied = actualWagesInSen > schedule.wage_ceiling_sen;
  if (wageCeilingApplied) {
    warnings.push("The Monthly wage ceiling has been applied.");
  }
  const bracket = findSocsoBracket(schedule, actualWagesInSen);
  let erEmploymentInjury = 0;
  let erInvalidity = 0;
  let erTotal = 0;
  let eeInvalidity = 0;
  let eeLindung24 = 0;
  let eeTotal = 0;
  let grandTotal = 0;
  let calcCategory = category;
  if (calcCategory === "REVIEW_REQUIRED") {
    calcCategory = profile.contributionCategory || "FIRST_CATEGORY";
  }
  if (calcCategory === "FIRST_CATEGORY") {
    erEmploymentInjury = bracket.category1_employer_employment_injury_sen;
    erInvalidity = bracket.category1_employer_invalidity_sen;
    erTotal = bracket.category1_employer_total_sen;
    eeInvalidity = bracket.category1_employee_invalidity_sen;
    eeLindung24 = bracket.category1_employee_lindung24_sen;
    eeTotal = bracket.category1_employee_total_sen;
    grandTotal = bracket.category1_grand_total_sen;
  } else {
    erEmploymentInjury = bracket.category2_employer_employment_injury_sen;
    erInvalidity = 0;
    erTotal = bracket.category2_employer_total_sen;
    eeInvalidity = 0;
    eeLindung24 = bracket.category2_employee_lindung24_sen;
    eeTotal = bracket.category2_employee_total_sen;
    grandTotal = bracket.category2_grand_total_sen;
  }
  if (profile.multipleEmployerStatus === "Multiple Employers" && !profile.selectedEmployerForLindung24) {
    eeLindung24 = 0;
    eeTotal = eeInvalidity;
    erTotal = erEmploymentInjury + erInvalidity;
    grandTotal = erTotal + eeTotal;
    warnings.push("LINDUNG 24 Jam contribution is bypassed as this employer is not selected for this multiple-employer account.");
  }
  let finalEmployer = erTotal;
  let finalEmployee = eeTotal;
  let calcStatus = "calculated";
  const employeeId = params.employee?.id || profile.employeeId;
  const overrides = JSON.parse(localStorage.getItem("socso_manual_overrides") || "[]");
  const activeOverride = overrides.find((o) => o.employeeId === employeeId && o.payrollPeriod === period);
  if (activeOverride) {
    finalEmployer = Math.round(activeOverride.correctedEmployerSocso * 100);
    finalEmployee = Math.round(activeOverride.correctedEmployeeSocso * 100);
    calcStatus = "override_applied";
    warnings.push(`Manual statutory override applied: Employer corrected to ${formatMYRFromSen(finalEmployer)}, Employee corrected to ${formatMYRFromSen(finalEmployee)}.`);
  }
  const result = {
    // New calculation values (as requested)
    employeeId,
    payrollContributionMonth: period,
    contributionCategory: category,
    scheduleCode: schedule.schedule_code,
    scheduleVersion: "1.0",
    actualSocsoWagesInSen: actualWagesInSen,
    lookupWagesInSen,
    wageCeilingInSen: schedule.wage_ceiling_sen,
    wageCeilingApplied,
    bracketNumber: bracket.bracket_number,
    bracketDescription: bracket.description,
    employerInvalidityContributionInSen: erInvalidity,
    employerEmploymentInjuryContributionInSen: erEmploymentInjury,
    employerTotalContributionInSen: finalEmployer,
    employeeInvalidityContributionInSen: eeInvalidity,
    employeeLindung24ContributionInSen: eeLindung24,
    employeeTotalContributionInSen: finalEmployee,
    grandTotalContributionInSen: finalEmployer + finalEmployee,
    calculationStatus: calcStatus,
    warnings,
    errors,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    // Legacy fields for backward compatibility inside Payslips Views and Delta calculations
    payrollPeriod: period,
    effectiveDate: getGmt8DateString(),
    socsoCoverageStatus: profile.socsoCoverageStatus,
    grossRemuneration: items.reduce((sum, item) => sum + item.amount, 0),
    includedSocsoWages: actualWagesInSen / 100,
    excludedSocsoWages: (items.reduce((sum, item) => sum + item.amount, 0) * 100 - actualWagesInSen) / 100,
    socsoWages: actualWagesInSen / 100,
    contributionWage: lookupWagesInSen / 100,
    wageBracketNumber: bracket.bracket_number,
    wageBracketDescription: bracket.description,
    employerEmploymentInjury: erEmploymentInjury / 100,
    employerInvalidity: erInvalidity / 100,
    employerSocsoTotal: finalEmployer / 100,
    employeeInvalidity: eeInvalidity / 100,
    employeeLindung24: eeLindung24 / 100,
    employeeSocsoTotal: finalEmployee / 100,
    totalSocsoContribution: (finalEmployer + finalEmployee) / 100,
    configurationVersion: schedule.schedule_code,
    calculationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    warningMessages: warnings,
    validationErrors: errors,
    // Separate display object
    display: {
      actualSocsoWagesFormatted: formatMYRFromSen(actualWagesInSen),
      employerTotalFormatted: formatMYRFromSen(finalEmployer),
      employeeInvalidityFormatted: formatMYRFromSen(eeInvalidity),
      employeeLindung24Formatted: formatMYRFromSen(eeLindung24),
      employeeTotalFormatted: formatMYRFromSen(finalEmployee),
      grandTotalFormatted: formatMYRFromSen(finalEmployer + finalEmployee)
    }
  };
  return result;
}
function roundUpToFiveSen(value) {
  const amountInSen = Math.round(value * 100);
  if (amountInSen % 5 === 0) {
    return amountInSen / 100;
  }
  return (amountInSen + (5 - amountInSen % 5)) / 100;
}
function calculateAnnualTaxProgressive(P, category) {
  const pVal = P.toNumber();
  let M = 0;
  let R = 0;
  let B = 0;
  if (pVal <= 5e3) {
    return { annualTax: dec(0), M: 0, R: 0, B: 0 };
  } else if (pVal <= 2e4) {
    M = 5e3;
    R = 0.01;
    B = category === "CATEGORY_2" ? -800 : -400;
  } else if (pVal <= 35e3) {
    M = 2e4;
    R = 0.03;
    B = category === "CATEGORY_2" ? -650 : -250;
  } else if (pVal <= 5e4) {
    M = 35e3;
    R = 0.06;
    B = 600;
  } else if (pVal <= 7e4) {
    M = 5e4;
    R = 0.11;
    B = 1500;
  } else if (pVal <= 1e5) {
    M = 7e4;
    R = 0.19;
    B = 3700;
  } else if (pVal <= 4e5) {
    M = 1e5;
    R = 0.25;
    B = 9400;
  } else if (pVal <= 6e5) {
    M = 4e5;
    R = 0.26;
    B = 84400;
  } else if (pVal <= 2e6) {
    M = 6e5;
    R = 0.28;
    B = 136400;
  } else {
    M = 2e6;
    R = 0.3;
    B = 528400;
  }
  const pMinusM = P.sub(M);
  const tax = pMinusM.mul(R).add(B);
  const annualTax = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  return { annualTax, M, R, B };
}
function determineTaxCategory(maritalStatus, spouseIsWorking, hasChildren) {
  if (maritalStatus === "Single" || maritalStatus === "Divorced" || maritalStatus === "Widowed") {
    return hasChildren ? "CATEGORY_3" : "CATEGORY_1";
  }
  if (maritalStatus === "Married") {
    if (spouseIsWorking === "No") {
      return "CATEGORY_2";
    } else {
      return "CATEGORY_3";
    }
  }
  return "CATEGORY_1";
}
function calculatePCB2026(params) {
  const {
    employeeTaxProfile,
    employeeChildren,
    payrollMonth,
    currentNormalRemuneration,
    currentAdditionalRemuneration,
    taxableBenefitsInKind,
    valueOfLivingAccommodation,
    taxablePerquisites,
    currentQualifyingEPF,
    additionalRemunerationQualifyingEPF,
    payrollHistory,
    tp1Declarations,
    tp3Declaration,
    currentZakat,
    accumulatedZakat,
    currentDepartureLevy,
    accumulatedDepartureLevy,
    accumulatedPCB,
    accumulatedNormal: paramAccumulatedNormal,
    accumulatedEPF: paramAccumulatedEPF,
    cp38Instruction,
    statutoryConfiguration,
    employee_pcb_history_ledger,
    employee_tp3_declarations
  } = params;
  const Y1 = dec(currentNormalRemuneration);
  const Yt = dec(currentAdditionalRemuneration);
  const K1 = dec(currentQualifyingEPF);
  const Kt = dec(additionalRemunerationQualifyingEPF || 0);
  const n = 12 - payrollMonth;
  const validationErrors = [];
  const validationWarnings = [];
  if (payrollMonth < 1 || payrollMonth > 12) {
    validationErrors.push("Current payroll month is invalid.");
  }
  let accumulatedNormal = dec(paramAccumulatedNormal || 0);
  let accumulatedAdditional = dec(0);
  let accumulatedEPF = dec(paramAccumulatedEPF || 0);
  let accumulatedPaidPCB = dec(accumulatedPCB || 0);
  let accumulatedPaidZakat = dec(accumulatedZakat || 0);
  let accumulatedPaidLevy = dec(accumulatedDepartureLevy || 0);
  let previousEmployerPCB = 0;
  let currentEmployerPreviousPCB = 0;
  let reversedPCB = 0;
  let validAdjustmentPCB = 0;
  let prevEmployerRemuneration = 0;
  let currentEmployerRemuneration = 0;
  if (employee_pcb_history_ledger) {
    const verifiedTP3 = employee_tp3_declarations ? employee_tp3_declarations.filter((t) => t.verificationStatus === "VERIFIED") : [];
    if (employee_tp3_declarations) {
      for (const t of employee_tp3_declarations) {
        if (t.verificationStatus === "UNVERIFIED") {
          validationErrors.push("TP3 values are unverified but included in calculations.");
        }
      }
    }
    for (const l of employee_pcb_history_ledger) {
      if (l.status === "DRAFT") {
        validationErrors.push("Draft payroll is included in history ledger.");
      }
      if (!l.status) {
        validationErrors.push("A historical PCB source has no status.");
      }
      if (l.payroll_month === payrollMonth) {
        validationErrors.push("Current month is included in X.");
      }
      if (l.payroll_month > payrollMonth) {
        validationErrors.push("Future payroll is included in X.");
      }
      if (l.source_type === "APPROVED_ADJUSTMENT" && l.source_reference?.toLowerCase().includes("cp38")) {
        validationErrors.push("CP38 is included in X.");
      }
    }
    const keys = /* @__PURE__ */ new Set();
    for (const l of employee_pcb_history_ledger) {
      const key = `${l.employee_id}-${l.assessment_year}-${l.source_type}-${l.source_reference || "ref"}-${l.payroll_month}`;
      if (keys.has(key)) {
        validationErrors.push(`Accumulated PCB contains duplicate records: ${key}`);
      }
      keys.add(key);
    }
    const hist = calculateAccumulatedPCBHistory({
      employeeId: employeeTaxProfile.nricPassport || "emp",
      assessmentYear: 2026,
      currentPayrollMonth: payrollMonth,
      verifiedTP3Records: verifiedTP3,
      finalizedPayrollHistory: employee_pcb_history_ledger
    });
    accumulatedPaidPCB = dec(hist.accumulatedPCB_X);
    previousEmployerPCB = hist.previousEmployerPCB;
    currentEmployerPreviousPCB = hist.currentEmployerPreviousPCB;
    reversedPCB = hist.reversedPCB;
    validAdjustmentPCB = hist.validAdjustmentPCB;
    let tp3Normal = 0;
    let tp3Additional = 0;
    let tp3EPF = 0;
    let tp3Zakat = 0;
    for (const t of verifiedTP3) {
      tp3Normal += t.previousEmployerRemuneration || 0;
      tp3Additional += t.previousEmployerAdditionalRemuneration || 0;
      tp3EPF += t.previousEmployerEpf || 0;
      tp3Zakat += t.previousEmployerZakat || 0;
    }
    prevEmployerRemuneration = tp3Normal;
    if (payrollHistory && payrollHistory.length > 0) {
      let calcNormal = 0;
      let calcEPF = 0;
      for (const p of payrollHistory) {
        if (p.payrollMonth < payrollMonth) {
          const recordNormal = (p.basicSalary || 0) + (p.allowanceGeneral || 0) + (p.allowanceTransport || 0) + (p.allowanceParking || 0) + (p.allowanceMeal || 0) + (p.allowanceAccommodation || 0) + (p.allowancePhone || 0);
          calcNormal += recordNormal;
          calcEPF += p.epfEmployee || 0;
        }
      }
      currentEmployerRemuneration = calcNormal;
      accumulatedNormal = dec(tp3Normal + calcNormal);
      accumulatedEPF = dec(tp3EPF + calcEPF);
    } else {
      currentEmployerRemuneration = paramAccumulatedNormal || 0;
      accumulatedNormal = dec(tp3Normal + (paramAccumulatedNormal || 0));
      accumulatedEPF = dec(tp3EPF + (paramAccumulatedEPF || 0));
    }
    accumulatedPaidZakat = dec(tp3Zakat + (accumulatedZakat || 0));
  } else {
    let calcNormal = 0;
    if (payrollHistory && payrollHistory.length > 0) {
      for (const record of payrollHistory) {
        if (record.payrollMonth < payrollMonth) {
          const recordNormal = (record.basicSalary || 0) + (record.allowanceGeneral || 0) + (record.allowanceTransport || 0) + (record.allowanceParking || 0) + (record.allowanceMeal || 0) + (record.allowanceAccommodation || 0) + (record.allowancePhone || 0);
          calcNormal += recordNormal;
          accumulatedNormal = accumulatedNormal.add(recordNormal);
          const recordAdditional = (record.overtime || 0) + (record.performanceBonus || 0) + (record.bonusAmount || 0) + (record.commissionAmount || 0) + (record.backPayAmount || 0) + (record.awsAmount || 0) + (record.compensationAmount || 0);
          accumulatedAdditional = accumulatedAdditional.add(recordAdditional);
          accumulatedEPF = accumulatedEPF.add(record.epfEmployee || 0);
          accumulatedPaidPCB = accumulatedPaidPCB.add(record.actualPCBDeducted || 0);
          accumulatedPaidZakat = accumulatedPaidZakat.add(record.zakat || 0);
          accumulatedPaidLevy = accumulatedPaidLevy.add(0);
        }
      }
    }
    currentEmployerRemuneration = calcNormal || paramAccumulatedNormal || 0;
    let tp3Normal = 0;
    if (tp3Declaration) {
      tp3Normal = tp3Declaration.previousEmployerRemuneration || tp3Declaration.accumulatedPriorRemuneration || 0;
      accumulatedNormal = accumulatedNormal.add(tp3Normal);
      accumulatedAdditional = accumulatedAdditional.add(tp3Declaration.previousEmployerAdditionalRemuneration || 0);
      accumulatedEPF = accumulatedEPF.add(tp3Declaration.previousEmployerEpf || tp3Declaration.accumulatedPriorEPF || 0);
      accumulatedPaidPCB = accumulatedPaidPCB.add(tp3Declaration.previousEmployerPcb || tp3Declaration.accumulatedPriorPCB || 0);
      accumulatedPaidZakat = accumulatedPaidZakat.add(tp3Declaration.previousEmployerZakat || 0);
    }
    prevEmployerRemuneration = tp3Normal;
  }
  const Y2 = Y1;
  const annualQualifyingLimit = dec(4e3);
  const totalEPFSoFar = accumulatedEPF.add(K1);
  const remainingEPFLimit = Decimal.fromCents(Math.max(0, annualQualifyingLimit.toIntegerCents() - totalEPFSoFar.toIntegerCents()));
  let K2 = dec(0);
  if (n > 0) {
    const projectedLimit = remainingEPFLimit.div(n);
    K2 = projectedLimit.toIntegerCents() < K1.toIntegerCents() ? projectedLimit : K1;
  }
  const hasChildren = employeeChildren && employeeChildren.length > 0 || (employeeTaxProfile.dependantsCount || 0) > 0;
  const category = determineTaxCategory(
    employeeTaxProfile.maritalStatus || "Single",
    employeeTaxProfile.spouseIsWorking || "No",
    hasChildren
  );
  let childReliefTotal = 0;
  if (employeeChildren && employeeChildren.length > 0) {
    for (const child of employeeChildren) {
      let childBase = child.isDisabled ? 6e3 : 2e3;
      if (child.inTertiaryEducation) {
        childReliefTotal += childBase + 8e3;
      } else {
        childReliefTotal += childBase;
      }
    }
  } else {
    childReliefTotal = (employeeTaxProfile.dependantsCount || 0) * 2e3;
  }
  const tp1Limits = {
    tp1_parent_medical: 8e3,
    tp1_disabled_equipment: 6e3,
    tp1_serious_medical: 1e4,
    tp1_medical_exam: 1e3,
    tp1_study_fees: 7e3,
    tp1_childcare: 3e3,
    tp1_life_insurance: 3e3,
    tp1_prs: 3e3,
    tp1_medical_insurance: 3e3,
    tp1_socso_relief: 1e3,
    tp1_lifestyle: 2500,
    tp1_breastfeeding: 1e3,
    tp1_child_takaful: 3e3,
    tp1_child_rehab: 4e3,
    tp1_tourism: 1e3,
    tp1_sustainability: 2500
  };
  const claimsByCategory = {};
  for (const key of Object.keys(tp1Limits)) {
    claimsByCategory[key] = { prior: 0, current: 0 };
  }
  if (tp1Declarations && tp1Declarations.length > 0) {
    for (const d of tp1Declarations) {
      if (d.taxYear === 2026 && (d.approvalStatus === "APPROVED" || d.approvalStatus === "Approved")) {
        const cat = d.claimCategory;
        if (claimsByCategory[cat]) {
          if (d.effectivePayrollMonth < payrollMonth) {
            claimsByCategory[cat].prior += d.claimedAmount;
          } else if (d.effectivePayrollMonth === payrollMonth) {
            claimsByCategory[cat].current += d.claimedAmount;
          }
        }
      }
    }
  }
  let accumulatedLP = dec(0);
  let currentLP1 = dec(0);
  for (const [cat, limitVal] of Object.entries(tp1Limits)) {
    const limit = dec(limitVal);
    const priorClaimed = dec(claimsByCategory[cat].prior);
    const currentClaimed = dec(claimsByCategory[cat].current);
    const cappedPrior = priorClaimed.toIntegerCents() > limit.toIntegerCents() ? limit : priorClaimed;
    const remainingLimit = Decimal.fromCents(Math.max(0, limit.toIntegerCents() - cappedPrior.toIntegerCents()));
    const cappedCurrent = currentClaimed.toIntegerCents() > remainingLimit.toIntegerCents() ? remainingLimit : currentClaimed;
    accumulatedLP = accumulatedLP.add(cappedPrior);
    currentLP1 = currentLP1.add(cappedCurrent);
  }
  if (tp3Declaration) {
    const tp3QualDeductions = tp3Declaration.previousQualifyingDeductions || 0;
    accumulatedLP = accumulatedLP.add(tp3QualDeductions);
  }
  const annualEpf = accumulatedEPF.add(K1).add(K2.mul(n));
  const epfRelief = annualEpf.toIntegerCents() > 4e5 ? dec(4e3) : annualEpf;
  const reliefsTotal = dec(9e3).add(category === "CATEGORY_2" ? 4e3 : 0).add(employeeTaxProfile.employeeDisabled ? 6e3 : 0).add(category === "CATEGORY_2" && employeeTaxProfile.spouseDisabled ? 5e3 : 0).add(childReliefTotal).add(accumulatedLP).add(currentLP1).add(epfRelief);
  const totalNormalIncome = accumulatedNormal.add(Y1).add(Y2.mul(n));
  const PWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, totalNormalIncome.toIntegerCents() - reliefsTotal.toIntegerCents()));
  let M = 0;
  let R = 0;
  let B = 0;
  let T = 0;
  let annualTaxWithoutCurrentAdditional = dec(0);
  const calcType = employeeTaxProfile.taxCalculationType || "RESIDENT_PROGRESSIVE";
  if (employeeTaxProfile.taxResidenceStatus === "NON_RESIDENT") {
  } else if (calcType === "RETURNING_EXPERT_PROGRAMME" || calcType === "KNOWLEDGE_WORKER_SPECIFIED_REGION") {
    R = 0.15;
    const pVal = PWithoutCurrentAdditional.toNumber();
    if (pVal <= 35e3) {
      T = category === "CATEGORY_2" ? 800 : 400;
    } else {
      T = 0;
    }
    const tax = PWithoutCurrentAdditional.mul(0.15).sub(T);
    annualTaxWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else if (calcType === "NON_CITIZEN_C_SUITE_APPROVED_COMPANY") {
    R = 0.15;
    const tax = PWithoutCurrentAdditional.mul(0.15);
    annualTaxWithoutCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else {
    const prog = calculateAnnualTaxProgressive(PWithoutCurrentAdditional, category);
    annualTaxWithoutCurrentAdditional = prog.annualTax;
    M = prog.M;
    R = prog.R;
    B = prog.B;
  }
  const Z = accumulatedPaidZakat.add(accumulatedPaidLevy);
  const X = accumulatedPaidPCB;
  let normalPCBUntruncated = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === "NON_RESIDENT") {
    const nonResTaxable = Y1.add(taxableBenefitsInKind || 0).add(valueOfLivingAccommodation || 0).add(taxablePerquisites || 0);
    normalPCBUntruncated = nonResTaxable.mul(0.3);
  } else {
    const annualTaxNetOfXAndZ = Decimal.fromCents(Math.max(0, annualTaxWithoutCurrentAdditional.toIntegerCents() - (Z.toIntegerCents() + X.toIntegerCents())));
    if (n + 1 > 0) {
      normalPCBUntruncated = annualTaxNetOfXAndZ.div(n + 1);
    }
  }
  const normalPCBTruncated = Decimal.fromCents(Math.trunc(normalPCBUntruncated.toNumber() * 100));
  let normalPCBAfterMinimumRule = normalPCBTruncated;
  if (employeeTaxProfile.taxResidenceStatus !== "NON_RESIDENT") {
    if (normalPCBTruncated.toIntegerCents() < 1e3) {
      normalPCBAfterMinimumRule = dec(0);
    }
  }
  const currentMonthZakatVal = dec(currentZakat || 0);
  const currentMonthLevyVal = dec(currentDepartureLevy || 0);
  let netNormalPCBCents = normalPCBAfterMinimumRule.toIntegerCents() - (currentMonthZakatVal.toIntegerCents() + currentMonthLevyVal.toIntegerCents());
  if (netNormalPCBCents < 0) {
    netNormalPCBCents = 0;
  }
  const netNormalPCB = Decimal.fromCents(netNormalPCBCents);
  const totalPCBForYearWithoutCurrentAdditional = X.add(normalPCBAfterMinimumRule.mul(n + 1));
  const totalEPFWithBonus = accumulatedEPF.add(K1).add(Kt);
  const remainingEPFLimitWithBonus = Decimal.fromCents(Math.max(0, annualQualifyingLimit.toIntegerCents() - totalEPFWithBonus.toIntegerCents()));
  let K2WithBonus = dec(0);
  if (n > 0) {
    const projectedLimit = remainingEPFLimitWithBonus.div(n);
    K2WithBonus = projectedLimit.toIntegerCents() < K1.toIntegerCents() ? projectedLimit : K1;
  }
  const annualEpfWithBonus = accumulatedEPF.add(K1).add(Kt).add(K2WithBonus.mul(n));
  const epfReliefWithBonus = annualEpfWithBonus.toIntegerCents() > 4e5 ? dec(4e3) : annualEpfWithBonus;
  const reliefsTotalWithBonus = dec(9e3).add(category === "CATEGORY_2" ? 4e3 : 0).add(employeeTaxProfile.employeeDisabled ? 6e3 : 0).add(category === "CATEGORY_2" && employeeTaxProfile.spouseDisabled ? 5e3 : 0).add(childReliefTotal).add(accumulatedLP).add(currentLP1).add(epfReliefWithBonus);
  const totalIncomeWithBonus = accumulatedNormal.add(Y1).add(Yt).add(Y2.mul(n));
  const PWithCurrentAdditional = Decimal.fromCents(Math.max(0, totalIncomeWithBonus.toIntegerCents() - reliefsTotalWithBonus.toIntegerCents()));
  let annualTaxWithCurrentAdditional = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === "NON_RESIDENT") {
  } else if (calcType === "RETURNING_EXPERT_PROGRAMME" || calcType === "KNOWLEDGE_WORKER_SPECIFIED_REGION") {
    const tax = PWithCurrentAdditional.mul(0.15).sub(T);
    annualTaxWithCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else if (calcType === "NON_CITIZEN_C_SUITE_APPROVED_COMPANY") {
    const tax = PWithCurrentAdditional.mul(0.15);
    annualTaxWithCurrentAdditional = Decimal.fromCents(Math.max(0, tax.toIntegerCents()));
  } else {
    const prog = calculateAnnualTaxProgressive(PWithCurrentAdditional, category);
    annualTaxWithCurrentAdditional = prog.annualTax;
  }
  let additionalPCBUntruncated = dec(0);
  if (employeeTaxProfile.taxResidenceStatus === "NON_RESIDENT") {
    additionalPCBUntruncated = Yt.mul(0.3);
  } else {
    const diff = annualTaxWithCurrentAdditional.toIntegerCents() - totalPCBForYearWithoutCurrentAdditional.toIntegerCents();
    additionalPCBUntruncated = Decimal.fromCents(Math.max(0, diff));
  }
  const additionalPCBTruncated = Decimal.fromCents(Math.trunc(additionalPCBUntruncated.toNumber() * 100));
  let additionalPCBAfterMinimumRule = additionalPCBTruncated;
  if (employeeTaxProfile.taxResidenceStatus !== "NON_RESIDENT") {
    if (additionalPCBTruncated.toIntegerCents() < 1e3) {
      additionalPCBAfterMinimumRule = dec(0);
    }
  }
  const finalPCBPreFiveSenRounding = netNormalPCB.add(additionalPCBAfterMinimumRule);
  const finalPCBCents = finalPCBPreFiveSenRounding.toIntegerCents();
  const roundedPCBCents = roundUpToFiveSen(finalPCBCents / 100) * 100;
  const finalPCB = Decimal.fromCents(roundedPCBCents);
  return {
    employeeId: employeeTaxProfile.nricPassport || "",
    assessmentYear: 2026,
    payrollMonth,
    taxResidenceStatus: employeeTaxProfile.taxResidenceStatus || "RESIDENT",
    calculationType: calcType,
    employeeCategory: category,
    Y: accumulatedNormal.toNumber(),
    K: accumulatedEPF.toNumber(),
    Y1: Y1.toNumber(),
    K1: K1.toNumber(),
    Y2: Y2.toNumber(),
    K2: K2.toNumber(),
    Yt: Yt.toNumber(),
    Kt: Kt.toNumber(),
    n,
    D: 9e3,
    S: category === "CATEGORY_2" ? 4e3 : 0,
    Du: employeeTaxProfile.employeeDisabled ? 6e3 : 0,
    Su: category === "CATEGORY_2" && employeeTaxProfile.spouseDisabled ? 5e3 : 0,
    Q: childReliefTotal / 2e3,
    C: employeeChildren ? employeeChildren.length : employeeTaxProfile.dependantsCount || 0,
    accumulatedLP: accumulatedLP.toNumber(),
    currentLP1: currentLP1.toNumber(),
    PWithoutCurrentAdditional: PWithoutCurrentAdditional.toNumber(),
    PWithCurrentAdditional: PWithCurrentAdditional.toNumber(),
    M,
    R,
    B,
    T,
    annualTaxWithoutCurrentAdditional: annualTaxWithoutCurrentAdditional.toNumber(),
    normalPCBUntruncated: normalPCBUntruncated.toNumber(),
    normalPCBTruncated: normalPCBTruncated.toNumber(),
    normalPCBAfterMinimumRule: normalPCBAfterMinimumRule.toNumber(),
    currentMonthZakatOffset: currentMonthZakatVal.toNumber(),
    currentMonthDepartureLevyOffset: currentMonthLevyVal.toNumber(),
    netNormalPCB: netNormalPCB.toNumber(),
    totalPCBForYearWithoutCurrentAdditional: totalPCBForYearWithoutCurrentAdditional.toNumber(),
    annualTaxWithCurrentAdditional: annualTaxWithCurrentAdditional.toNumber(),
    additionalPCBUntruncated: additionalPCBUntruncated.toNumber(),
    additionalPCBTruncated: additionalPCBTruncated.toNumber(),
    additionalPCBAfterMinimumRule: additionalPCBAfterMinimumRule.toNumber(),
    finalPCBPreFiveSenRounding: finalPCBPreFiveSenRounding.toNumber(),
    finalPCB: finalPCB.toNumber(),
    cp38: cp38Instruction || 0,
    totalTaxPayrollDeduction: finalPCB.add(cp38Instruction || 0).toNumber(),
    configurationVersion: statutoryConfiguration?.configurationVersion || "v1.0.0",
    formulaVersion: "HASiL 2026 progressive v1",
    calculationTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    warnings: validationWarnings,
    errors: validationErrors,
    status: validationErrors.length > 0 ? "failed" : "calculated",
    // Section 17 compliant fields
    taxCategory: category,
    accumulatedPreviousEmployerRemuneration: prevEmployerRemuneration,
    accumulatedCurrentEmployerRemuneration: currentEmployerRemuneration,
    accumulatedQualifyingEPF: accumulatedEPF.toNumber(),
    accumulatedAllowableDeductions: accumulatedLP.toNumber(),
    accumulatedPreviousEmployerPCB: previousEmployerPCB,
    accumulatedCurrentEmployerPCB: currentEmployerPreviousPCB,
    accumulatedAdjustedPCB: validAdjustmentPCB,
    accumulatedPCB_X: X.toNumber(),
    accumulatedZakat_Z: Z.toNumber(),
    estimatedAnnualChargeableIncome_P: PWithoutCurrentAdditional.toNumber(),
    selectedTaxBracket: `Bracket (M=${M}, R=${R})`,
    estimatedAnnualTax: annualTaxWithoutCurrentAdditional.toNumber(),
    remainingEstimatedTax: Math.max(0, annualTaxWithoutCurrentAdditional.toNumber() - X.toNumber() - Z.toNumber()),
    currentAndRemainingMonthCount: n + 1,
    CP38: cp38Instruction || 0,
    totalTaxDeduction: finalPCB.add(cp38Instruction || 0).toNumber()
  };
}
function calculatePcb2026(salary, maritalStatus, spouseIsWorking, dependantsCount, epfMonthly, month = 1) {
  const profile = {
    maritalStatus,
    spouseIsWorking,
    dependantsCount,
    eligibleForStatutory: "Yes",
    taxResidenceStatus: "RESIDENT",
    taxCalculationType: "RESIDENT_PROGRESSIVE"
  };
  const annualIncome = salary * 12;
  const annualEpf = epfMonthly * 12;
  const epfRelief = Math.min(4e3, annualEpf);
  const childRelief = dependantsCount * 2e3;
  const spouseRelief = maritalStatus === "Married" && spouseIsWorking === "No" ? 4e3 : 0;
  const totalReliefs = 9e3 + spouseRelief + childRelief + epfRelief;
  const chargeableIncome = Math.max(0, annualIncome - totalReliefs);
  const hasChildren = dependantsCount > 0;
  const category = determineTaxCategory(maritalStatus, spouseIsWorking, hasChildren);
  const prog = calculateAnnualTaxProgressive(Decimal.fromCents(chargeableIncome * 100), category);
  const estimatedAnnualTax = prog.annualTax.toNumber();
  const estimatedMonthlyPCB = estimatedAnnualTax / 12;
  const priorMonths = Math.max(0, month - 1);
  const accumulatedNormal = salary * priorMonths;
  const accumulatedEPF = epfMonthly * priorMonths;
  const accumulatedPCB = estimatedMonthlyPCB * priorMonths;
  const result = calculatePCB2026({
    employeeTaxProfile: profile,
    payrollMonth: month,
    currentNormalRemuneration: salary,
    currentQualifyingEPF: epfMonthly,
    currentAdditionalRemuneration: 0,
    accumulatedNormal,
    accumulatedEPF,
    accumulatedPCB
  });
  return result.finalPCB;
}
var parsePayrollDate = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(year, month, 0).getDate();
  if (month < 1 || month > 12 || day < 1 || day > maxDay) return null;
  return { year, month, day };
};
var comparePayrollMonth = (date, month, year) => date.year * 12 + date.month - (year * 12 + month);
var isEmployeeSeparationStatus = (status) => status === "Resigned" || status === "Terminated";
var getSortedEffectiveProfiles = (employee) => [...employee.effectiveDatedProfiles || []].filter((profile) => Boolean(parsePayrollDate(profile.effectiveDate))).sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
var getCareerHistoryStatus = (value) => {
  switch (value) {
    case "Active":
    case "Active - Probation":
    case "Active - Confirmation":
    case "On Leave":
    case "Resigned":
    case "Terminated":
    case "Suspended":
      return value;
    default:
      return null;
  }
};
var getSortedStatusChangeHistory = (employee) => [...employee.careerHistory || []].filter((entry) => entry.type === "Status Change" && Boolean(parsePayrollDate(entry.date)) && Boolean(getCareerHistoryStatus(entry.newValue))).sort((left, right) => left.date.localeCompare(right.date));
var getStatusChangeEntryForDate = (employee, targetDateStr) => {
  let matched;
  for (const entry of getSortedStatusChangeHistory(employee)) {
    if (entry.date > targetDateStr) continue;
    matched = entry;
  }
  return matched;
};
var getFallbackEffectiveProfile = (employee) => ({
  effectiveDate: employee.dateOfJoined || "2026-01-01",
  basicSalary: employee.basicSalary,
  employmentStatus: employee.status,
  housingAllowance: employee.housingAllowance || 0,
  transportAllowance: employee.transportAllowance || 0,
  allowanceGeneral: employee.allowanceGeneral || 0,
  allowanceTransport: employee.allowanceTransport || 0,
  allowanceParking: employee.allowanceParking || 0,
  allowanceMeal: employee.allowanceMeal || 0,
  allowanceAccommodation: employee.allowanceAccommodation || 0,
  allowancePhone: employee.allowancePhone || 0,
  commissionAmount: employee.commissionAmount || 0,
  maritalStatus: employee.maritalStatus || "Single",
  spouseIsWorking: employee.spouseIsWorking || "No",
  spouseNric: employee.spouseNric || "",
  spouseName: employee.spouseName || "",
  hasDependants: employee.hasDependants || "No",
  dependantsCount: employee.dependants?.length || 0,
  eligibleForStatutory: employee.eligibleForStatutory || "Yes",
  epfRateEmployee: employee.epfRateEmployee || 11,
  epfRateEmployer: employee.epfRateEmployer || 13,
  taxNumber: employee.taxNumber || "",
  nricPassport: employee.nricPassport || "",
  dateOfJoined: employee.dateOfJoined || "",
  dateOfTermination: employee.dateOfTermination,
  approvedAt: getGmt8DateString(),
  assistReconciliationRequired: false
});
function getEffectiveTerminationDateForDate(employee, targetDateStr) {
  const directDate = parsePayrollDate(employee.dateOfTermination) ? employee.dateOfTermination : void 0;
  const profile = getEffectiveProfileForDate(employee, targetDateStr);
  const historyEntry = getStatusChangeEntryForDate(employee, targetDateStr);
  const historyStatus = getCareerHistoryStatus(historyEntry?.newValue);
  if (historyStatus) {
    if (isEmployeeSeparationStatus(historyStatus)) {
      return profile.dateOfTermination || directDate || historyEntry?.date;
    }
    return void 0;
  }
  const profileStatus = profile.employmentStatus || employee.status;
  if (profile.dateOfTermination && profile.dateOfTermination <= targetDateStr) {
    return profile.dateOfTermination;
  }
  if (isEmployeeSeparationStatus(profileStatus)) {
    return profile.dateOfTermination || directDate || profile.effectiveDate;
  }
  return directDate && directDate <= targetDateStr ? directDate : void 0;
}
var getEmployeeTerminationDate = (employee, targetDateStr = getGmt8DateString()) => getEffectiveTerminationDateForDate(employee, targetDateStr);
function getSalaryProration(employee, month, year) {
  const calendarDays = new Date(year, month, 0).getDate();
  const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(calendarDays).padStart(2, "0")}`;
  const joinDate = parsePayrollDate(employee.dateOfJoined);
  const terminationDateValue = getEmployeeTerminationDate(employee, targetDateStr);
  const terminationDate = parsePayrollDate(terminationDateValue);
  const periodBeforeEmployment = !!joinDate && comparePayrollMonth(joinDate, month, year) > 0;
  const periodAfterEmployment = !!terminationDate && comparePayrollMonth(terminationDate, month, year) < 0;
  if (periodBeforeEmployment || periodAfterEmployment) {
    return {
      fullPeriodSalary: 0,
      payableSalary: 0,
      prorationDeduction: 0,
      calendarDays,
      eligibleDays: 0,
      excludedDays: calendarDays,
      eligibleStartDay: null,
      eligibleEndDay: null,
      joinDate: employee.dateOfJoined,
      terminationDate: terminationDateValue,
      isProrated: false
    };
  }
  const eligibleStartDay = joinDate && comparePayrollMonth(joinDate, month, year) === 0 ? joinDate.day : 1;
  const eligibleEndDay = terminationDate && comparePayrollMonth(terminationDate, month, year) === 0 ? terminationDate.day : calendarDays;
  const eligibleDays = Math.max(0, eligibleEndDay - eligibleStartDay + 1);
  const salaryAdjustments = (employee.salaryAdjustments || []).map((adjustment) => ({ adjustment, date: parsePayrollDate(adjustment.effectiveDate) })).filter((entry) => entry.date !== null && Number(entry.adjustment.adjustedSalary) >= 0).sort((left, right) => left.date.year - right.date.year || left.date.month - right.date.month || left.date.day - right.date.day);
  let fullPeriodSalary = 0;
  let payableSalary = 0;
  for (let day = 1; day <= calendarDays; day++) {
    let monthlyRate = Number(employee.basicSalary || 0);
    for (const entry of salaryAdjustments) {
      const effectiveKey = entry.date.year * 1e4 + entry.date.month * 100 + entry.date.day;
      const payrollDayKey = year * 1e4 + month * 100 + day;
      if (effectiveKey <= payrollDayKey) monthlyRate = Number(entry.adjustment.adjustedSalary || 0);
    }
    const dailyRate = monthlyRate / calendarDays;
    fullPeriodSalary += dailyRate;
    if (day >= eligibleStartDay && day <= eligibleEndDay) payableSalary += dailyRate;
  }
  const roundedFullPeriodSalary = Number(fullPeriodSalary.toFixed(2));
  const roundedPayableSalary = Number(payableSalary.toFixed(2));
  const prorationDeduction = Number(Math.max(0, roundedFullPeriodSalary - roundedPayableSalary).toFixed(2));
  return {
    fullPeriodSalary: roundedFullPeriodSalary,
    payableSalary: roundedPayableSalary,
    prorationDeduction,
    calendarDays,
    eligibleDays,
    excludedDays: calendarDays - eligibleDays,
    eligibleStartDay,
    eligibleEndDay,
    joinDate: employee.dateOfJoined,
    terminationDate: terminationDateValue,
    isProrated: eligibleDays < calendarDays
  };
}
function getAdjustedBasicSalary(employee, month, year) {
  return getSalaryProration(employee, month, year).payableSalary;
}
function getHistoricalPayrollRecord(employee, month, year) {
  return (employee.historicalPayrollRecords || []).find((record) => !isSeparatePayrollRecord(record) && record.payrollMonth === month && (year === void 0 || record.payrollYear === void 0 || record.payrollYear === year));
}
function getPayrollBasicSalary(employee, month, year) {
  const savedRecord = getHistoricalPayrollRecord(employee, month, year);
  return savedRecord?.basicSalary ?? getAdjustedBasicSalary(employee, month, year);
}
function getEmployeeForMonth(employee, month, year) {
  const resolvedYear = year ?? (/* @__PURE__ */ new Date()).getFullYear();
  const effectiveProfile = getEffectiveProfileForMonth(employee, month, resolvedYear);
  const effectiveStatus = getEffectiveEmploymentStatus(employee, month, resolvedYear);
  const monthEndDay = new Date(resolvedYear, month, 0).getDate();
  const monthEndDate = `${resolvedYear}-${String(month).padStart(2, "0")}-${String(monthEndDay).padStart(2, "0")}`;
  const effectiveEmployee = {
    ...employee,
    status: effectiveStatus,
    paymentDate: employee.paymentDate,
    payslipDescriptions: employee.payslipDescriptions,
    basicSalary: effectiveProfile.basicSalary,
    housingAllowance: effectiveProfile.housingAllowance !== void 0 ? effectiveProfile.housingAllowance : employee.housingAllowance,
    transportAllowance: effectiveProfile.transportAllowance !== void 0 ? effectiveProfile.transportAllowance : employee.transportAllowance,
    allowanceGeneral: effectiveProfile.allowanceGeneral !== void 0 ? effectiveProfile.allowanceGeneral : employee.allowanceGeneral,
    allowanceTransport: effectiveProfile.allowanceTransport !== void 0 ? effectiveProfile.allowanceTransport : employee.allowanceTransport,
    allowanceParking: effectiveProfile.allowanceParking !== void 0 ? effectiveProfile.allowanceParking : employee.allowanceParking,
    allowanceMeal: effectiveProfile.allowanceMeal !== void 0 ? effectiveProfile.allowanceMeal : employee.allowanceMeal,
    allowanceAccommodation: effectiveProfile.allowanceAccommodation !== void 0 ? effectiveProfile.allowanceAccommodation : employee.allowanceAccommodation,
    allowancePhone: effectiveProfile.allowancePhone !== void 0 ? effectiveProfile.allowancePhone : employee.allowancePhone,
    commissionAmount: effectiveProfile.commissionAmount !== void 0 ? effectiveProfile.commissionAmount : employee.commissionAmount,
    maritalStatus: effectiveProfile.maritalStatus || employee.maritalStatus,
    spouseIsWorking: effectiveProfile.spouseIsWorking !== void 0 ? effectiveProfile.spouseIsWorking : employee.spouseIsWorking,
    spouseNric: effectiveProfile.spouseNric !== void 0 ? effectiveProfile.spouseNric : employee.spouseNric,
    spouseName: effectiveProfile.spouseName !== void 0 ? effectiveProfile.spouseName : employee.spouseName,
    hasDependants: effectiveProfile.hasDependants !== void 0 ? effectiveProfile.hasDependants : employee.hasDependants,
    eligibleForStatutory: effectiveProfile.eligibleForStatutory !== void 0 ? effectiveProfile.eligibleForStatutory : employee.eligibleForStatutory,
    contractStatutoryTreatment: effectiveProfile.contractStatutoryTreatment !== void 0 ? effectiveProfile.contractStatutoryTreatment : employee.contractStatutoryTreatment,
    payrollDocumentDisplaySettings: effectiveProfile.payrollDocumentDisplaySettings !== void 0 ? effectiveProfile.payrollDocumentDisplaySettings : employee.payrollDocumentDisplaySettings,
    epfRateEmployee: effectiveProfile.epfRateEmployee !== void 0 ? effectiveProfile.epfRateEmployee : employee.epfRateEmployee,
    epfRateEmployer: effectiveProfile.epfRateEmployer !== void 0 ? effectiveProfile.epfRateEmployer : employee.epfRateEmployer,
    taxNumber: effectiveProfile.taxNumber !== void 0 ? effectiveProfile.taxNumber : employee.taxNumber,
    nricPassport: effectiveProfile.nricPassport !== void 0 ? effectiveProfile.nricPassport : employee.nricPassport,
    dateOfJoined: effectiveProfile.dateOfJoined !== void 0 ? effectiveProfile.dateOfJoined : employee.dateOfJoined,
    dateOfTermination: getEffectiveTerminationDateForDate(employee, monthEndDate)
  };
  const histRecord = getHistoricalPayrollRecord(employee, month, year);
  if (!histRecord) {
    return effectiveEmployee;
  }
  return {
    ...effectiveEmployee,
    paymentDate: histRecord.paymentDate !== void 0 ? histRecord.paymentDate : effectiveEmployee.paymentDate,
    payslipDescriptions: histRecord.payslipDescriptions !== void 0 ? histRecord.payslipDescriptions : effectiveEmployee.payslipDescriptions,
    allowanceGeneral: histRecord.allowanceGeneral !== void 0 ? histRecord.allowanceGeneral : effectiveEmployee.allowanceGeneral,
    allowanceTransport: histRecord.allowanceTransport !== void 0 ? histRecord.allowanceTransport : effectiveEmployee.allowanceTransport,
    allowanceParking: histRecord.allowanceParking !== void 0 ? histRecord.allowanceParking : effectiveEmployee.allowanceParking,
    allowanceMeal: histRecord.allowanceMeal !== void 0 ? histRecord.allowanceMeal : effectiveEmployee.allowanceMeal,
    allowanceAccommodation: histRecord.allowanceAccommodation !== void 0 ? histRecord.allowanceAccommodation : effectiveEmployee.allowanceAccommodation,
    allowancePhone: histRecord.allowancePhone !== void 0 ? histRecord.allowancePhone : effectiveEmployee.allowancePhone,
    overtime: histRecord.overtime !== void 0 ? histRecord.overtime : effectiveEmployee.overtime,
    bonusAmount: histRecord.bonusAmount !== void 0 ? histRecord.bonusAmount : histRecord.performanceBonus !== void 0 ? histRecord.performanceBonus : effectiveEmployee.bonusAmount,
    bonusDesc: histRecord.bonusDesc !== void 0 ? histRecord.bonusDesc : effectiveEmployee.bonusDesc,
    commissionAmount: histRecord.commissionAmount !== void 0 ? histRecord.commissionAmount : effectiveEmployee.commissionAmount,
    commissionDesc: histRecord.commissionDesc !== void 0 ? histRecord.commissionDesc : effectiveEmployee.commissionDesc,
    backPayAmount: histRecord.backPayAmount !== void 0 ? histRecord.backPayAmount : effectiveEmployee.backPayAmount,
    backPayDesc: histRecord.backPayDesc !== void 0 ? histRecord.backPayDesc : effectiveEmployee.backPayDesc,
    awsAmount: histRecord.awsAmount !== void 0 ? histRecord.awsAmount : effectiveEmployee.awsAmount,
    awsDesc: histRecord.awsDesc !== void 0 ? histRecord.awsDesc : effectiveEmployee.awsDesc,
    compensationAmount: histRecord.compensationAmount !== void 0 ? histRecord.compensationAmount : effectiveEmployee.compensationAmount,
    compensationDesc: histRecord.compensationDesc !== void 0 ? histRecord.compensationDesc : effectiveEmployee.compensationDesc,
    reimbursementAmount: histRecord.reimbursementAmount !== void 0 ? histRecord.reimbursementAmount : effectiveEmployee.reimbursementAmount,
    reimbursementDesc: histRecord.reimbursementDesc !== void 0 ? histRecord.reimbursementDesc : effectiveEmployee.reimbursementDesc,
    unpaidLeave: histRecord.unpaidLeave !== void 0 ? histRecord.unpaidLeave : effectiveEmployee.unpaidLeave,
    incompleteMonthDeduction: histRecord.incompleteMonthDeduction !== void 0 ? histRecord.incompleteMonthDeduction : effectiveEmployee.incompleteMonthDeduction,
    deductionInLieu: histRecord.deductionInLieu !== void 0 ? histRecord.deductionInLieu : effectiveEmployee.deductionInLieu,
    deductionCp38: histRecord.deductionCp38 !== void 0 ? histRecord.deductionCp38 : histRecord.cp38 !== void 0 ? histRecord.cp38 : effectiveEmployee.deductionCp38,
    deductionOthers: histRecord.deductionOthers !== void 0 ? histRecord.deductionOthers : effectiveEmployee.deductionOthers,
    deductionOthersDesc: histRecord.deductionOthersDesc !== void 0 ? histRecord.deductionOthersDesc : effectiveEmployee.deductionOthersDesc,
    taxPcb: histRecord.actualPCBDeducted !== void 0 ? histRecord.actualPCBDeducted : effectiveEmployee.taxPcb
  };
}
function calculatePayslip(employee, month, year, options = {}) {
  const mergedEmployee = month !== void 0 ? getEmployeeForMonth(employee, month, year) : employee;
  const savedRecord = month !== void 0 && !options.ignoreSavedStatutory ? getHistoricalPayrollRecord(employee, month, year) : void 0;
  const savedStatutory = savedRecord ? {
    epfEmployee: savedRecord.epfEmployee,
    epfEmployer: savedRecord.epfEmployer,
    socsoEmployee: savedRecord.socsoEmployee,
    socsoEmployer: savedRecord.socsoEmployer,
    lindung24Employee: savedRecord.lindung24Employee,
    eisEmployee: savedRecord.eisEmployee,
    eisEmployer: savedRecord.eisEmployer,
    taxPcb: options.ignoreSavedPcb ? void 0 : savedRecord.actualPCBDeducted,
    hrdCorp: savedRecord.hrdCorp
  } : {};
  const statutoryOverrides = { ...savedStatutory, ...options.statutoryOverrides };
  const calculationVersion = options.calculationVersion || savedRecord?.calculationVersion || "legacy";
  const isSeparateCalculation = isSeparatePayrollRecord(savedRecord);
  const useGrossPayFormula = calculationVersion === "gross_pay_v2" && !isSeparateCalculation;
  const basicSalary = options.basicSalaryOverride !== void 0 ? options.basicSalaryOverride : month !== void 0 && year !== void 0 ? getPayrollBasicSalary(employee, month, year) : mergedEmployee.basicSalary || 0;
  const statutorySalary = options.statutorySalaryOverride !== void 0 ? options.statutorySalaryOverride : basicSalary;
  const allowanceGen = mergedEmployee.allowanceGeneral || 0;
  const allowanceTrans = mergedEmployee.allowanceTransport !== void 0 ? mergedEmployee.allowanceTransport : mergedEmployee.transportAllowance || 0;
  const allowancePark = mergedEmployee.allowanceParking || 0;
  const allowanceMl = mergedEmployee.allowanceMeal || 0;
  const allowanceAccom = mergedEmployee.allowanceAccommodation !== void 0 ? mergedEmployee.allowanceAccommodation : mergedEmployee.housingAllowance || 0;
  const allowancePh = mergedEmployee.allowancePhone || 0;
  const allowancesSum = allowanceGen + allowanceTrans + allowancePark + allowanceMl + allowanceAccom + allowancePh;
  const overtimeVal = mergedEmployee.overtime || 0;
  const bonusVal = mergedEmployee.bonusAmount !== void 0 ? mergedEmployee.bonusAmount : mergedEmployee.performanceBonus || 0;
  const commissionVal = mergedEmployee.commissionAmount || 0;
  const backPayVal = mergedEmployee.backPayAmount || 0;
  const awsVal = mergedEmployee.awsAmount || 0;
  const compensationVal = mergedEmployee.compensationAmount || 0;
  const reimbursementsSum = mergedEmployee.reimbursementAmount || 0;
  const unpaidLeaveVal = mergedEmployee.unpaidLeave || 0;
  const incompleteMonthDeductionVal = mergedEmployee.incompleteMonthDeduction || 0;
  const legacyGrossEarnings = basicSalary + allowancesSum + overtimeVal + bonusVal + commissionVal + backPayVal + awsVal + compensationVal;
  const calculatedGrossPay = Math.max(
    0,
    basicSalary + allowancesSum + commissionVal - unpaidLeaveVal - incompleteMonthDeductionVal
  );
  const grossPay = useGrossPayFormula ? options.grossPayOverride ?? savedRecord?.grossPay ?? calculatedGrossPay : legacyGrossEarnings;
  const grossReductions = useGrossPayFormula ? unpaidLeaveVal + incompleteMonthDeductionVal : 0;
  const isEligible = options.statutoryEligibilityOverride ?? getPayrollDocumentProfile(mergedEmployee).statutoryEnabled;
  const appliedStatutoryOverrides = isEligible ? statutoryOverrides : {};
  const optInEpf = mergedEmployee.optInEpf !== false;
  const optInSocso = mergedEmployee.optInSocso !== false;
  const optInEis = mergedEmployee.optInEis !== false;
  const optInPcb = mergedEmployee.optInPcb !== false;
  const epfRateEmp = mergedEmployee.epfRateEmployee || 11;
  const contributionBasis = useGrossPayFormula ? grossPay : statutorySalary;
  const epfRateEmployerCalculated = contributionBasis <= 5e3 ? 13 : 12;
  const epfRateEmployer = mergedEmployee.epfRateEmployer || epfRateEmployerCalculated;
  const autoEpfEmployeeValue = isEligible && optInEpf ? Math.round(contributionBasis * epfRateEmp / 100) : 0;
  const autoEpfEmployerValue = isEligible && optInEpf ? Math.round(contributionBasis * epfRateEmployer / 100) : 0;
  const epfEmployeeValue = appliedStatutoryOverrides.epfEmployee ?? autoEpfEmployeeValue;
  const epfEmployerValue = appliedStatutoryOverrides.epfEmployer ?? autoEpfEmployerValue;
  const deductionInLieuVal = mergedEmployee.deductionInLieu || 0;
  const deductionCp38Val = mergedEmployee.deductionCp38 || 0;
  const deductionOthersVal = mergedEmployee.deductionOthers || 0;
  const stat2026 = getStatutoryDeductions2026(contributionBasis);
  const payrollItems = useGrossPayFormula ? [{ code: "basic_salary", amount: grossPay }] : options.statutorySalaryOverride !== void 0 ? [{ code: "basic_salary", amount: statutorySalary }] : [
    { code: "basic_salary", amount: basicSalary },
    { code: "overtime", amount: overtimeVal },
    { code: "commission", amount: commissionVal },
    { code: "allowance_general", amount: allowanceGen },
    { code: "allowance_transport", amount: allowanceTrans },
    { code: "allowance_parking", amount: allowancePark },
    { code: "allowance_meal", amount: allowanceMl },
    { code: "allowance_accommodation", amount: allowanceAccom },
    { code: "allowance_phone", amount: allowancePh },
    { code: "backpay", amount: backPayVal }
  ];
  if (!useGrossPayFormula && unpaidLeaveVal > 0) {
    payrollItems.push({ code: "unpaid_leave", amount: unpaidLeaveVal });
  }
  const actMonth = month !== void 0 ? month : (/* @__PURE__ */ new Date()).getMonth() + 1;
  const actYear = year !== void 0 ? year : (/* @__PURE__ */ new Date()).getFullYear();
  const periodStr = `${actYear}-${String(actMonth).padStart(2, "0")}`;
  const socsoRes = calculateSocsoContribution({
    employee: mergedEmployee,
    payrollPeriod: periodStr,
    payrollItems
  });
  const autoSocsoEmployeeVal = isEligible && optInSocso ? socsoRes.employeeInvalidity : 0;
  const autoSocsoEmployerVal = isEligible && optInSocso ? socsoRes.employerSocsoTotal : 0;
  const isLindung24OptedIn = optInSocso && mergedEmployee.enableLindung24 === true;
  const autoSkbbkEmpVal = isEligible && isLindung24OptedIn ? socsoRes.employeeLindung24 : 0;
  const socsoEmployeeVal = appliedStatutoryOverrides.socsoEmployee ?? autoSocsoEmployeeVal;
  const socsoEmployerVal = appliedStatutoryOverrides.socsoEmployer ?? autoSocsoEmployerVal;
  const skbbkEmpVal = appliedStatutoryOverrides.lindung24Employee ?? autoSkbbkEmpVal;
  const skbbkEmplyrVal = 0;
  const autoEisEmployeeVal = isEligible && optInEis ? stat2026.eisEmployee : 0;
  const autoEisEmployerVal = isEligible && optInEis ? stat2026.eisEmployer : 0;
  const eisEmployeeVal = appliedStatutoryOverrides.eisEmployee ?? autoEisEmployeeVal;
  const eisEmployerVal = appliedStatutoryOverrides.eisEmployer ?? autoEisEmployerVal;
  const baseEmp = INITIAL_EMPLOYEES.find((e) => e.id === mergedEmployee.id);
  const isSalaryChanged = baseEmp ? baseEmp.basicSalary !== basicSalary : false;
  const pcbBasis = useGrossPayFormula ? basicSalary : statutorySalary;
  const autoTaxPcbVal = isEligible && optInPcb ? options.ignoreSavedPcb || isSalaryChanged || mergedEmployee.taxPcb === void 0 ? calculatePcb2026(pcbBasis, mergedEmployee.maritalStatus || "Single", mergedEmployee.spouseIsWorking || "No", mergedEmployee.dependants?.length || 0, autoEpfEmployeeValue, actMonth) : mergedEmployee.taxPcb : 0;
  const taxPcbVal = appliedStatutoryOverrides.taxPcb ?? autoTaxPcbVal;
  const hrdLevyWages = basicSalary + allowancesSum;
  const hrdCorpDateStr = `${actYear}-${String(actMonth).padStart(2, "0")}-${String(new Date(actYear, actMonth, 0).getDate()).padStart(2, "0")}`;
  const autoHrdCorpVal = calculateHrdCorpLevy(
    mergedEmployee,
    hrdLevyWages,
    options.companyEmployees,
    hrdCorpDateStr
  );
  const hrdCorpVal = isEligible ? appliedStatutoryOverrides.hrdCorp ?? autoHrdCorpVal : 0;
  const netDeductions = epfEmployeeValue + socsoEmployeeVal + eisEmployeeVal + skbbkEmpVal + taxPcbVal + deductionInLieuVal + deductionCp38Val + deductionOthersVal;
  const totalDeductions = useGrossPayFormula ? netDeductions : netDeductions + unpaidLeaveVal;
  const totalEmployerContributions = epfEmployerValue + socsoEmployerVal + eisEmployerVal + skbbkEmplyrVal + hrdCorpVal;
  const netPay = useGrossPayFormula ? grossPay + reimbursementsSum - netDeductions : legacyGrossEarnings + reimbursementsSum - totalDeductions;
  return {
    grossEarnings: grossPay,
    grossPay,
    grossReductions,
    netDeductions,
    epfEmployeeValue,
    epfEmployerValue,
    socsoEmployeeVal,
    socsoEmployerVal,
    eisEmployeeVal,
    eisEmployerVal,
    taxPcbVal,
    skbbkEmpVal,
    skbbkEmplyrVal,
    hrdCorpVal,
    totalDeductions,
    totalEmployerContributions,
    netPay,
    allowancesSum,
    reimbursementsSum
  };
}
function getEffectiveProfileForDate(employee, targetDateStr) {
  const fallback = getFallbackEffectiveProfile(employee);
  let matched = fallback;
  for (const profile of getSortedEffectiveProfiles(employee)) {
    if (profile.effectiveDate > targetDateStr) continue;
    matched = {
      ...matched,
      ...profile,
      employmentStatus: profile.employmentStatus || matched.employmentStatus || employee.status
    };
    if (profile.employmentStatus) {
      matched.dateOfTermination = isEmployeeSeparationStatus(profile.employmentStatus) ? profile.dateOfTermination || profile.effectiveDate : profile.dateOfTermination;
    }
  }
  return matched;
}
function getEffectiveEmploymentStatusForDate(employee, targetDateStr) {
  const historyStatus = getCareerHistoryStatus(
    getStatusChangeEntryForDate(employee, targetDateStr)?.newValue
  );
  if (historyStatus) {
    return historyStatus;
  }
  return getEffectiveProfileForDate(employee, targetDateStr).employmentStatus || employee.status;
}
function getEffectiveEmploymentStatus(employee, month, year) {
  const lastDay = new Date(year, month, 0).getDate();
  const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return getEffectiveEmploymentStatusForDate(employee, targetDateStr);
}
var CURRENT_EMPLOYMENT_STATUSES = [
  "Active",
  "Active - Probation",
  "Active - Confirmation"
];
function isCurrentEmploymentStatus(status) {
  return Boolean(status && CURRENT_EMPLOYMENT_STATUSES.includes(status));
}
function isCurrentActiveEmployee(employee, targetDateStr = getGmt8DateString()) {
  if (employee.dateOfJoined && employee.dateOfJoined > targetDateStr) {
    return false;
  }
  const terminationDate = getEffectiveTerminationDateForDate(employee, targetDateStr);
  if (terminationDate && terminationDate <= targetDateStr) {
    return false;
  }
  return isCurrentEmploymentStatus(getEffectiveEmploymentStatusForDate(employee, targetDateStr));
}
var NRIC_FORMAT_PATTERN = /^\d{6}-?\d{2}-?\d{4}$/;
function isLocalWorkerForHrdCorp(employee) {
  const nationality = (employee.nationality || "").trim().toLowerCase();
  if (["malaysian", "malaysia", "local"].includes(nationality)) {
    return true;
  }
  return !nationality && NRIC_FORMAT_PATTERN.test((employee.nricPassport || "").trim());
}
function getHrdCorpLocalWorkerCount(companyEmployees, entityId, targetDateStr = getGmt8DateString()) {
  return companyEmployees.filter((employee) => employee.entityId === entityId && isCurrentActiveEmployee(employee, targetDateStr) && isLocalWorkerForHrdCorp(employee)).length;
}
function getHrdCorpLevyRate(localWorkerCount) {
  if (localWorkerCount >= 10) return 0.01;
  if (localWorkerCount >= 5) return 5e-3;
  return 0;
}
function calculateHrdCorpLevy(employee, levyWages, companyEmployees, targetDateStr = getGmt8DateString()) {
  if (!isLocalWorkerForHrdCorp(employee)) {
    return 0;
  }
  const workerCount = companyEmployees?.length ? getHrdCorpLocalWorkerCount(companyEmployees, employee.entityId, targetDateStr) : employee.hrdCorp && employee.hrdCorp > 0 ? 10 : 0;
  const levyRate = getHrdCorpLevyRate(workerCount);
  return levyRate > 0 ? Number((levyWages * levyRate).toFixed(2)) : 0;
}
function getEffectiveProfileForMonth(employee, month, year) {
  const targetDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  return getEffectiveProfileForDate(employee, targetDateStr);
}
function calculateAccumulatedPCBHistory(params) {
  const { employeeId, assessmentYear, currentPayrollMonth, verifiedTP3Records, finalizedPayrollHistory } = params;
  let previousEmployerPCB = 0;
  let currentEmployerPreviousPCB = 0;
  let reversedPCB = 0;
  let validAdjustmentPCB = 0;
  const sourceBreakdown = [];
  const excludedRecords = [];
  const exclusionReasonsSet = /* @__PURE__ */ new Set();
  const uniqueKeys = /* @__PURE__ */ new Map();
  for (const tp3 of verifiedTP3Records) {
    if (tp3.taxYear !== assessmentYear) {
      excludedRecords.push({ id: tp3.id || "tp3", reason: `Tax year ${tp3.taxYear} does not match assessment year ${assessmentYear}` });
      exclusionReasonsSet.add(`TP3 tax year mismatch`);
      continue;
    }
    if (tp3.verificationStatus !== "VERIFIED") {
      excludedRecords.push({ id: tp3.id || "tp3", reason: `Verification status is ${tp3.verificationStatus}` });
      exclusionReasonsSet.add(`TP3 unverified or cancelled`);
      continue;
    }
    const amt = tp3.previousEmployerPcb || 0;
    const key = `${employeeId}-${assessmentYear}-TP3_PREVIOUS_EMPLOYER-tp3-${currentPayrollMonth}`;
    if (uniqueKeys.has(key)) {
      excludedRecords.push({ id: tp3.id || "tp3", reason: `Duplicate TP3 entry key: ${key}` });
      exclusionReasonsSet.add(`Duplicate TP3 record`);
      continue;
    }
    uniqueKeys.set(key, tp3);
    previousEmployerPCB += amt;
    sourceBreakdown.push({
      month: 0,
      sourceType: "TP3_PREVIOUS_EMPLOYER",
      ref: "TP3 Form",
      amount: amt,
      status: tp3.verificationStatus,
      details: "Verified previous employer TP3"
    });
  }
  const ELIGIBLE_STATUSES = ["FINALIZED", "APPROVED", "LOCKED", "PAID", "SUBMITTED", "REVERSED"];
  for (const ledger of finalizedPayrollHistory) {
    if (ledger.assessment_year !== assessmentYear) {
      excludedRecords.push({ id: ledger.id, reason: `Ledger year ${ledger.assessment_year} mismatch` });
      exclusionReasonsSet.add(`Ledger year mismatch`);
      continue;
    }
    if (ledger.payroll_month >= currentPayrollMonth) {
      excludedRecords.push({ id: ledger.id, reason: `Ledger month ${ledger.payroll_month} is >= current month ${currentPayrollMonth}` });
      exclusionReasonsSet.add(`Ledger month is current/future`);
      continue;
    }
    const key = `${employeeId}-${assessmentYear}-${ledger.source_type}-${ledger.source_reference || "ref"}-${ledger.payroll_month}`;
    if (uniqueKeys.has(key)) {
      excludedRecords.push({ id: ledger.id, reason: `Duplicate ledger entry key: ${key}` });
      exclusionReasonsSet.add(`Duplicate ledger record`);
      continue;
    }
    uniqueKeys.set(key, ledger);
    if (!ELIGIBLE_STATUSES.includes(ledger.status)) {
      excludedRecords.push({ id: ledger.id, reason: `Status is ${ledger.status}` });
      exclusionReasonsSet.add(`Ledger status not final/eligible`);
      continue;
    }
    const effectiveAmount = ledger.effective_amount !== void 0 ? ledger.effective_amount : ledger.total_pcb;
    if (ledger.source_type === "CURRENT_EMPLOYER_PAYROLL") {
      currentEmployerPreviousPCB += effectiveAmount;
      sourceBreakdown.push({
        month: ledger.payroll_month,
        sourceType: "CURRENT_EMPLOYER_PAYROLL",
        ref: ledger.source_reference,
        amount: effectiveAmount,
        status: ledger.status,
        details: `Finalized payroll for Month ${ledger.payroll_month}`
      });
    } else if (ledger.source_type === "APPROVED_ADJUSTMENT") {
      validAdjustmentPCB += effectiveAmount;
      sourceBreakdown.push({
        month: ledger.payroll_month,
        sourceType: "APPROVED_ADJUSTMENT",
        ref: ledger.source_reference,
        amount: effectiveAmount,
        status: ledger.status,
        details: `Approved manual adjustment: ${ledger.exclusion_reason || ""}`
      });
    } else if (ledger.source_type === "REVERSAL") {
      reversedPCB += Math.abs(effectiveAmount);
      sourceBreakdown.push({
        month: ledger.payroll_month,
        sourceType: "REVERSAL",
        ref: ledger.source_reference,
        amount: effectiveAmount,
        status: ledger.status,
        details: `Reversed deduction reference ${ledger.reversal_reference || ""}`
      });
    }
  }
  const accumulatedPCB_X = Math.max(0, previousEmployerPCB + currentEmployerPreviousPCB + validAdjustmentPCB - reversedPCB);
  return {
    previousEmployerPCB,
    currentEmployerPreviousPCB,
    reversedPCB,
    validAdjustmentPCB,
    accumulatedPCB_X,
    sourceBreakdown,
    excludedRecords,
    exclusionReasons: Array.from(exclusionReasonsSet)
  };
}

// src/components/PayslipPDFDocument.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingHorizontal: 30,
    paddingVertical: 25,
    lineHeight: 1.35,
    flexDirection: "column",
    backgroundColor: "#ffffff"
  },
  watermark: {
    position: "absolute",
    top: 10,
    right: 30,
    fontSize: 6,
    color: "#d1d5db",
    fontFamily: "Helvetica-Bold"
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    borderBottomWidth: 3,
    borderBottomColor: "#A32626",
    paddingBottom: 8,
    marginBottom: 10
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  logoPlaceholder: {
    width: 120,
    height: 44,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center"
  },
  logoImage: {
    width: 120,
    height: 44,
    objectFit: "contain",
    borderRadius: 4
  },
  logoText: {
    fontSize: 12,
    color: "#A32626",
    fontFamily: "Helvetica-Bold"
  },
  companyName: {
    fontSize: 14.5,
    fontFamily: "Helvetica-Bold",
    color: "#A32626",
    marginBottom: 3,
    lineHeight: 1.15
  },
  companyReg: {
    fontSize: 7,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  companyAddress: {
    fontSize: 7,
    color: "#333333",
    maxWidth: 240,
    lineHeight: 1.2
  },
  rightHeaderBlock: {
    backgroundColor: "#A32626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 3,
    minWidth: 90
  },
  rightHeaderLabel: {
    color: "#F2E8D8",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1
  },
  rightHeaderMonth: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 1
  },
  detailsCard: {
    backgroundColor: "#F2E8D8",
    borderWidth: 1,
    borderColor: "#E5DED5",
    borderRadius: 5,
    padding: 8,
    marginBottom: 10
  },
  detailsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5DED5",
    paddingBottom: 2,
    marginBottom: 4
  },
  detailsTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#A32626",
    textTransform: "uppercase"
  },
  employeeName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    textTransform: "uppercase",
    marginBottom: 6
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  detailsCol: {
    width: "32%"
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 3
  },
  detailLabelLeft: {
    width: 80,
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold"
  },
  detailLabelMiddle: {
    width: 60,
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold"
  },
  detailLabel: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold"
  },
  detailValue: {
    flex: 1,
    fontSize: 7,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    textAlign: "left"
  },
  bankTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#A32626",
    marginBottom: 3
  },
  bankBox: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1,
    borderColor: "#E5DED5",
    borderRadius: 3,
    padding: 3
  },
  bankText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#333333"
  },
  tableContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  tableCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5DED5",
    borderRadius: 5,
    padding: 6,
    backgroundColor: "#ffffff"
  },
  tableHeaderBlock: {
    backgroundColor: "#A32626",
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 4
  },
  tableHeaderTitle: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    textAlign: "center"
  },
  tableThRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5DED5",
    paddingBottom: 2,
    marginBottom: 3
  },
  tableThText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280"
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6"
  },
  tableTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#A32626",
    paddingVertical: 3,
    marginTop: 4
  },
  tableTotalText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#A32626"
  },
  tableRowSocsoTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    backgroundColor: "#F2E8D8",
    paddingHorizontal: 3,
    borderRadius: 2,
    marginVertical: 1
  },
  itemName: {
    fontSize: 7,
    color: "#333333"
  },
  itemDescriptionGroup: {
    flex: 1,
    paddingRight: 4
  },
  itemDescription: {
    fontSize: 6,
    color: "#6b7280",
    marginTop: 1
  },
  itemVal: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    textAlign: "right"
  },
  summaryStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F2E8D8",
    borderWidth: 1,
    borderColor: "#E5DED5",
    borderRadius: 5,
    padding: 6,
    flexDirection: "column",
    justifyContent: "center",
    height: 38
  },
  summaryCardNetPay: {
    flex: 1,
    backgroundColor: "#A32626",
    borderRadius: 5,
    padding: 6,
    flexDirection: "column",
    justifyContent: "center",
    height: 38
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase"
  },
  summaryLabelNetPay: {
    fontSize: 7,
    color: "#F2E8D8",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase"
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginTop: 1
  },
  summaryValueNetPay: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginTop: 1
  },
  contributionsCard: {
    backgroundColor: "#F2E8D8",
    borderWidth: 1.5,
    borderColor: "#D8CFC4",
    borderRadius: 5,
    padding: 6,
    marginBottom: 10
  },
  contributionsTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#A32626",
    textTransform: "uppercase",
    marginBottom: 4
  },
  contributionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  contributionCol: {
    flex: 1,
    alignItems: "center"
  },
  contributionDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: "#D8CFC4"
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5DED5",
    paddingTop: 6,
    marginBottom: 6
  },
  footerCol: {
    width: "48%"
  },
  footerTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#A32626",
    textTransform: "uppercase",
    marginBottom: 1
  },
  footerText: {
    fontSize: 7,
    color: "#6b7280",
    lineHeight: 1.25
  },
  footerTextBold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#333333"
  },
  confidentialBar: {
    backgroundColor: "#A32626",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  confidentialBarText: {
    color: "#ffffff",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase"
  },
  confidentialBarLabel: {
    color: "#F2E8D8",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1
  }
});
var PayslipPDFDocument = ({ employee: sourceEmployee, entity, month = 10, year = 2026, payrollRecordOverride, displaySettingsOverride, logoSrc }) => {
  const activePayrollRecord = payrollRecordOverride || null;
  const baseEmployee = getEmployeeForMonth(sourceEmployee, month, year);
  const isSeparatePayoutDocument = !!activePayrollRecord && isSeparatePayrollRecord(activePayrollRecord);
  const payoutConfig = isSeparatePayoutDocument && activePayrollRecord?.payoutKind && activePayrollRecord.payoutKind !== "regular" ? getSeparatePayoutConfig(activePayrollRecord.payoutKind) : null;
  const payoutAmount = isSeparatePayoutDocument && payoutConfig ? Number(activePayrollRecord?.[payoutConfig.amountField] || 0) : 0;
  const payslipEmployee = activePayrollRecord ? {
    ...baseEmployee,
    basicSalary: isSeparatePayoutDocument ? 0 : activePayrollRecord.basicSalary ?? baseEmployee.basicSalary,
    allowanceGeneral: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceGeneral ?? baseEmployee.allowanceGeneral,
    allowanceTransport: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceTransport ?? baseEmployee.allowanceTransport,
    allowanceParking: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceParking ?? baseEmployee.allowanceParking,
    allowanceMeal: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceMeal ?? baseEmployee.allowanceMeal,
    allowanceAccommodation: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowanceAccommodation ?? baseEmployee.allowanceAccommodation,
    allowancePhone: isSeparatePayoutDocument ? 0 : activePayrollRecord.allowancePhone ?? baseEmployee.allowancePhone,
    overtime: isSeparatePayoutDocument ? 0 : activePayrollRecord.overtime ?? baseEmployee.overtime,
    bonusAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.bonusAmount || 0) : activePayrollRecord.bonusAmount ?? baseEmployee.bonusAmount,
    bonusDesc: activePayrollRecord.bonusDesc ?? baseEmployee.bonusDesc,
    commissionAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.commissionAmount || 0) : activePayrollRecord.commissionAmount ?? baseEmployee.commissionAmount,
    commissionDesc: activePayrollRecord.commissionDesc ?? baseEmployee.commissionDesc,
    backPayAmount: isSeparatePayoutDocument ? 0 : activePayrollRecord.backPayAmount ?? baseEmployee.backPayAmount,
    backPayDesc: activePayrollRecord.backPayDesc ?? baseEmployee.backPayDesc,
    awsAmount: isSeparatePayoutDocument ? 0 : activePayrollRecord.awsAmount ?? baseEmployee.awsAmount,
    awsDesc: activePayrollRecord.awsDesc ?? baseEmployee.awsDesc,
    compensationAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.compensationAmount || 0) : activePayrollRecord.compensationAmount ?? baseEmployee.compensationAmount,
    compensationDesc: activePayrollRecord.compensationDesc ?? baseEmployee.compensationDesc,
    reimbursementAmount: isSeparatePayoutDocument ? Number(activePayrollRecord.reimbursementAmount || 0) : activePayrollRecord.reimbursementAmount ?? baseEmployee.reimbursementAmount,
    reimbursementDesc: activePayrollRecord.reimbursementDesc ?? baseEmployee.reimbursementDesc,
    unpaidLeave: activePayrollRecord.unpaidLeave ?? baseEmployee.unpaidLeave,
    incompleteMonthDeduction: activePayrollRecord.incompleteMonthDeduction ?? baseEmployee.incompleteMonthDeduction,
    deductionInLieu: activePayrollRecord.deductionInLieu ?? baseEmployee.deductionInLieu,
    deductionCp38: activePayrollRecord.deductionCp38 ?? baseEmployee.deductionCp38,
    deductionOthers: activePayrollRecord.deductionOthers ?? baseEmployee.deductionOthers,
    deductionOthersDesc: activePayrollRecord.deductionOthersDesc ?? baseEmployee.deductionOthersDesc,
    payslipDescriptions: activePayrollRecord.payslipDescriptions ?? baseEmployee.payslipDescriptions,
    contractStatutoryTreatment: activePayrollRecord.statutoryTreatment ?? baseEmployee.contractStatutoryTreatment,
    eligibleForStatutory: activePayrollRecord.statutoryTreatment === "with_statutory" ? "Yes" : activePayrollRecord.statutoryTreatment === "without_statutory" ? "No" : baseEmployee.eligibleForStatutory,
    paymentDate: activePayrollRecord.paymentDate || baseEmployee.paymentDate
  } : baseEmployee;
  const documentProfile = activePayrollRecord ? getPayrollDocumentProfileForRecord(payslipEmployee, activePayrollRecord) : getPayrollDocumentProfile(payslipEmployee);
  const documentFieldLabels = getPayrollDocumentFieldLabels(documentProfile);
  const displaySettings = {
    ...activePayrollRecord?.displaySettingsSnapshot || getPayrollDocumentDisplaySettings(payslipEmployee),
    ...displaySettingsOverride || {}
  };
  if (!documentProfile.statutoryEnabled) {
    displaySettings.showEpfNumber = false;
    displaySettings.showEmployerContributions = false;
  }
  const employee = payslipEmployee;
  const breakdown = activePayrollRecord ? calculatePayslip(employee, month, year, {
    basicSalaryOverride: isSeparatePayoutDocument ? 0 : employee.basicSalary,
    statutorySalaryOverride: isSeparatePayoutDocument ? payoutAmount : void 0,
    calculationVersion: isSeparatePayoutDocument || activePayrollRecord.calculationVersion !== GROSS_PAY_CALCULATION_VERSION ? void 0 : GROSS_PAY_CALCULATION_VERSION,
    grossPayOverride: isSeparatePayoutDocument || activePayrollRecord.calculationVersion !== GROSS_PAY_CALCULATION_VERSION ? void 0 : activePayrollRecord.grossPay,
    statutoryEligibilityOverride: isSeparatePayoutDocument ? documentProfile.statutoryEnabled : void 0,
    ignoreSavedStatutory: true,
    statutoryOverrides: {
      epfEmployee: activePayrollRecord.epfEmployee,
      epfEmployer: activePayrollRecord.epfEmployer,
      socsoEmployee: activePayrollRecord.socsoEmployee,
      socsoEmployer: activePayrollRecord.socsoEmployer,
      lindung24Employee: activePayrollRecord.lindung24Employee,
      eisEmployee: activePayrollRecord.eisEmployee,
      eisEmployer: activePayrollRecord.eisEmployer,
      taxPcb: activePayrollRecord.actualPCBDeducted,
      hrdCorp: activePayrollRecord.hrdCorp
    }
  }) : calculatePayslip(employee, month, year);
  const lastWorkingDay = getEffectiveTerminationDateForDate(
    employee,
    `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`
  );
  const getDescription = (key, fallback) => payslipEmployee.payslipDescriptions?.[key] || fallback;
  const getLineNote = (field) => activePayrollRecord?.lineNotes?.[field] || "";
  const renderItemDescription = (label, field) => {
    const note = getLineNote(field);
    return /* @__PURE__ */ jsxs(View, { style: styles.itemDescriptionGroup, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.itemName, children: label }),
      note && /* @__PURE__ */ jsx(Text, { style: styles.itemDescription, children: note })
    ] });
  };
  const formatCurrency = (val) => {
    return `RM ${val.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const allowanceGen = employee.allowanceGeneral || 0;
  const allowanceTrans = employee.allowanceTransport !== void 0 ? employee.allowanceTransport : employee.transportAllowance || 0;
  const allowanceAccom = employee.allowanceAccommodation !== void 0 ? employee.allowanceAccommodation : employee.housingAllowance || 0;
  const allowancePark = employee.allowanceParking || 0;
  const allowanceMeal = employee.allowanceMeal || 0;
  const allowancePhone = employee.allowancePhone || 0;
  const overtimeVal = employee.overtime || 0;
  const bonusVal = employee.bonusAmount !== void 0 ? employee.bonusAmount : employee.performanceBonus || 0;
  const commissionVal = employee.commissionAmount || 0;
  const backPayVal = employee.backPayAmount || 0;
  const awsVal = employee.awsAmount || 0;
  const compensationVal = employee.compensationAmount || 0;
  const reimbursementVal = employee.reimbursementAmount || 0;
  const unpaidLeaveVal = employee.unpaidLeave || 0;
  const basicSalaryForSocso = isSeparatePayoutDocument ? 0 : getPayrollBasicSalary(sourceEmployee, month, year);
  const payrollItemsForSocso = [
    { code: "basic_salary", amount: basicSalaryForSocso },
    { code: "overtime", amount: overtimeVal },
    { code: "commission", amount: commissionVal },
    { code: "allowance_general", amount: allowanceGen },
    { code: "allowance_transport", amount: allowanceTrans },
    { code: "allowance_parking", amount: allowancePark },
    { code: "allowance_meal", amount: allowanceMeal },
    { code: "allowance_accommodation", amount: allowanceAccom },
    { code: "allowance_phone", amount: allowancePhone },
    { code: "backpay", amount: backPayVal }
  ];
  if (unpaidLeaveVal > 0) {
    payrollItemsForSocso.push({ code: "unpaid_leave", amount: unpaidLeaveVal });
  }
  const socsoRes = calculateSocsoContribution({
    employee,
    payrollPeriod: `${year}-${String(month).padStart(2, "0")}`,
    payrollItems: payrollItemsForSocso
  });
  const socsoEmployerScale = socsoRes.employerSocsoTotal > 0 ? breakdown.socsoEmployerVal / socsoRes.employerSocsoTotal : 0;
  const socsoEmployerInjury = socsoRes.employerEmploymentInjury * socsoEmployerScale;
  const socsoEmployerInvalidity = breakdown.socsoEmployerVal - socsoEmployerInjury;
  const skbbkEmployeeVal = breakdown.skbbkEmpVal;
  const epfRateEmp = employee.epfRateEmployee || 11;
  const epfEmployeeValue = breakdown.epfEmployeeValue;
  const socsoEmployeeVal = breakdown.socsoEmployeeVal;
  const eisEmployeeVal = breakdown.eisEmployeeVal;
  const taxPcbVal = breakdown.taxPcbVal;
  const deductionInLieuVal = employee.deductionInLieu || 0;
  const deductionCp38Val = employee.deductionCp38 || 0;
  const deductionOthersVal = employee.deductionOthers || 0;
  const epfRateEmployer = employee.epfRateEmployer || (employee.basicSalary <= 5e3 ? 13 : 12);
  const epfEmployerValue = breakdown.epfEmployerValue;
  const salaryProration = getSalaryProration(employee, month, year);
  const actualBasic = isSeparatePayoutDocument ? 0 : employee.basicSalary;
  const monthsList = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const lastDay = new Date(year, month, 0).getDate();
  const payPeriodText = `01 ${monthsList[month - 1]} ${year} - ${lastDay} ${monthsList[month - 1]} ${year}`;
  const getBankAccount = () => {
    const acc = String(employee.accountNo || "");
    if (!acc) return "Bank account not available.";
    return `${employee.bankName || "N/A"} - ${acc}`;
  };
  return /* @__PURE__ */ jsx(Document, { children: /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
    /* @__PURE__ */ jsx(Text, { style: styles.watermark, children: "CONFIDENTIAL - STRICTLY PRIVATE" }),
    /* @__PURE__ */ jsxs(View, { style: styles.headerContainer, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.logoContainer, children: [
        /* @__PURE__ */ jsx(
          Image2,
          {
            src: logoSrc || "/redpoint-logo.png",
            style: styles.logoImage
          }
        ),
        /* @__PURE__ */ jsxs(View, { children: [
          /* @__PURE__ */ jsx(Text, { style: styles.companyName, children: entity?.name || "Red Point Sdn Bhd" }),
          entity?.registrationNumber && /* @__PURE__ */ jsxs(Text, { style: styles.companyReg, children: [
            "Co. Reg: ",
            entity.registrationNumber
          ] }),
          displaySettings.showCompanyAddress && /* @__PURE__ */ jsx(Text, { style: styles.companyAddress, children: entity?.address || "No registered corporate address" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: styles.rightHeaderBlock, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.rightHeaderLabel, children: documentProfile.documentType.toUpperCase() }),
        /* @__PURE__ */ jsxs(Text, { style: styles.rightHeaderMonth, children: [
          monthsList[month - 1].substring(0, 3),
          " ",
          year
        ] }),
        activePayrollRecord?.payoutTitle && /* @__PURE__ */ jsx(Text, { style: styles.rightHeaderMonth, children: activePayrollRecord.payoutTitle })
      ] })
    ] }),
    activePayrollRecord?.payoutDescription && /* @__PURE__ */ jsxs(View, { style: styles.detailsCard, children: [
      /* @__PURE__ */ jsx(View, { style: styles.detailsTitleContainer, children: /* @__PURE__ */ jsx(Text, { style: styles.detailsTitle, children: "Payout Notes" }) }),
      /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: activePayrollRecord.payoutDescription })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: styles.detailsCard, children: [
      /* @__PURE__ */ jsx(View, { style: styles.detailsTitleContainer, children: /* @__PURE__ */ jsx(Text, { style: styles.detailsTitle, children: documentFieldLabels.detailsTitle }) }),
      /* @__PURE__ */ jsx(Text, { style: styles.employeeName, children: employee.name }),
      /* @__PURE__ */ jsxs(View, { style: styles.detailsGrid, children: [
        /* @__PURE__ */ jsxs(View, { style: styles.detailsCol, children: [
          displaySettings.showTin && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: "TIN / Tax Number" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.taxNumber || "IG 29068110030" })
          ] }),
          displaySettings.showEpfNumber && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: "EPF Member Number" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.epfNumber || "-" })
          ] }),
          displaySettings.showNricPassport && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: "NRIC / Passport" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.nricPassport || "-" })
          ] }),
          displaySettings.showDateJoined && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: documentFieldLabels.dateJoined }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: formatToDDMMMYYYY(employee.dateOfJoined) })
          ] }),
          lastWorkingDay && displaySettings.showLastWorkingDay && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: "Last Working Day" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: formatToDDMMMYYYY(lastWorkingDay) })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelLeft, children: documentFieldLabels.employmentStatus }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.employmentType || "Confirmation" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.detailsCol, children: [
          displaySettings.showEmail && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelMiddle, children: "Email Address" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.email })
          ] }),
          displaySettings.showDepartment && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelMiddle, children: "Department" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.department })
          ] }),
          displaySettings.showDesignation && /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelMiddle, children: documentFieldLabels.designation }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: employee.designation })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.detailItem, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.detailLabelMiddle, children: "Payment Date" }),
            /* @__PURE__ */ jsx(Text, { style: styles.detailValue, children: formatToDDMMMYYYY(employee.paymentDate || `${year}-${String(month).padStart(2, "0")}-28`) })
          ] })
        ] }),
        displaySettings.showBankAccount && /* @__PURE__ */ jsxs(View, { style: styles.detailsCol, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.bankTitle, children: "Bank Details" }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailLabel, { marginBottom: 2 }], children: "Bank Account" }),
          /* @__PURE__ */ jsx(View, { style: styles.bankBox, children: /* @__PURE__ */ jsx(Text, { style: styles.bankText, children: getBankAccount() }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: styles.tableContainer, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.tableCol, children: [
        /* @__PURE__ */ jsx(View, { style: styles.tableHeaderBlock, children: /* @__PURE__ */ jsx(Text, { style: styles.tableHeaderTitle, children: "Earnings & Additions" }) }),
        /* @__PURE__ */ jsxs(View, { style: styles.tableThRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.tableThText, children: "Description" }),
          /* @__PURE__ */ jsx(Text, { style: styles.tableThText, children: "Amount (RM)" })
        ] }),
        !isSeparatePayoutDocument && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(
            salaryProration.isProrated ? `Prorated ${getDescription("basicSalary", documentProfile.compensationLabel)}` : getDescription("basicSalary", documentProfile.compensationLabel),
            "basicSalary"
          ),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(actualBasic) })
        ] }),
        displaySettings.showEarningsDetails && /* @__PURE__ */ jsxs(Fragment, { children: [
          allowanceGen > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowanceGeneral", "General Allowance"), "allowanceGeneral"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowanceGen) })
          ] }),
          allowanceTrans > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowanceTransport", "Transport Allowance"), "allowanceTransport"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowanceTrans) })
          ] }),
          allowancePark > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowanceParking", "Parking Allowance"), "allowanceParking"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowancePark) })
          ] }),
          allowanceMeal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowanceMeal", "Meal Allowance"), "allowanceMeal"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowanceMeal) })
          ] }),
          allowanceAccom > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowanceAccommodation", "Accommodation Allowance"), "allowanceAccommodation"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowanceAccom) })
          ] }),
          allowancePhone > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("allowancePhone", "Phone Allowance"), "allowancePhone"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(allowancePhone) })
          ] }),
          overtimeVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("overtime", "Overtime"), "overtime"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(overtimeVal) })
          ] }),
          bonusVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(payslipEmployee.bonusDesc || "Performance Bonus", "bonusAmount"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(bonusVal) })
          ] }),
          commissionVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(payslipEmployee.commissionDesc || "Commissions", "commissionAmount"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(commissionVal) })
          ] }),
          backPayVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(payslipEmployee.backPayDesc || "BackPay / Arrears", "backPayAmount"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(backPayVal) })
          ] }),
          awsVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(payslipEmployee.awsDesc || "AWS (13th Month)", "awsAmount"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(awsVal) })
          ] }),
          compensationVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(payslipEmployee.compensationDesc || "Compensation / Severance", "compensationAmount"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(compensationVal) })
          ] }),
          reimbursementVal > 0 && /* @__PURE__ */ jsxs(View, { style: [styles.tableRow, { backgroundColor: "#f9fafb" }], children: [
            /* @__PURE__ */ jsxs(View, { style: styles.itemDescriptionGroup, children: [
              /* @__PURE__ */ jsx(Text, { style: [styles.itemName, { fontFamily: "Helvetica-Bold" }], children: payslipEmployee.reimbursementDesc || "Reimbursements (Tax-Free)" }),
              getLineNote("reimbursementAmount") && /* @__PURE__ */ jsx(Text, { style: styles.itemDescription, children: getLineNote("reimbursementAmount") })
            ] }),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(reimbursementVal) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.tableTotalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.tableTotalText, children: documentProfile.isPaymentVoucher ? "Gross Amount" : "Total Earnings & Additions" }),
          /* @__PURE__ */ jsx(Text, { style: styles.tableTotalText, children: formatCurrency(breakdown.grossPay + breakdown.reimbursementsSum) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: styles.tableCol, children: [
        /* @__PURE__ */ jsx(View, { style: styles.tableHeaderBlock, children: /* @__PURE__ */ jsx(Text, { style: styles.tableHeaderTitle, children: "Deductions" }) }),
        /* @__PURE__ */ jsxs(View, { style: styles.tableThRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.tableThText, children: "Description" }),
          /* @__PURE__ */ jsx(Text, { style: styles.tableThText, children: "Amount (RM)" })
        ] }),
        documentProfile.statutoryEnabled && epfEmployeeValue > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("epfEmployee", `EPF (Employee ${epfRateEmp}%)`), "epfEmployee"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(epfEmployeeValue) })
        ] }),
        documentProfile.statutoryEnabled && (skbbkEmployeeVal > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("socsoEmployee", "SOCSO - Invalidity"), "socsoEmployee"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(socsoEmployeeVal) })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
            renderItemDescription(getDescription("lindung24Employee", "SOCSO - LINDUNG 24 Jam"), "lindung24Employee"),
            /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(skbbkEmployeeVal) })
          ] }),
          /* @__PURE__ */ jsxs(View, { style: styles.tableRowSocsoTotal, children: [
            /* @__PURE__ */ jsx(Text, { style: [styles.itemName, { fontFamily: "Helvetica-Bold" }], children: "SOCSO Employee Total" }),
            /* @__PURE__ */ jsx(Text, { style: [styles.itemVal, { fontFamily: "Helvetica-Bold" }], children: formatCurrency(socsoEmployeeVal + skbbkEmployeeVal) })
          ] })
        ] }) : socsoEmployeeVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("socsoEmployee", "SOCSO"), "socsoEmployee"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(socsoEmployeeVal) })
        ] })),
        documentProfile.statutoryEnabled && eisEmployeeVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("eisEmployee", "EIS"), "eisEmployee"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(eisEmployeeVal) })
        ] }),
        documentProfile.statutoryEnabled && taxPcbVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("taxPcb", "Income Tax (PCB)"), "taxPcb"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(taxPcbVal) })
        ] }),
        displaySettings.showDeductionDetails && unpaidLeaveVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("unpaidLeave", "Unpaid Leave"), "unpaidLeave"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(unpaidLeaveVal) })
        ] }),
        displaySettings.showDeductionDetails && deductionInLieuVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("deductionInLieu", "Payment in Lieu"), "deductionInLieu"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(deductionInLieuVal) })
        ] }),
        displaySettings.showDeductionDetails && documentProfile.statutoryEnabled && deductionCp38Val > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("deductionCp38", "CP38 Direct Tax"), "deductionCp38"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(deductionCp38Val) })
        ] }),
        displaySettings.showDeductionDetails && deductionOthersVal > 0 && /* @__PURE__ */ jsxs(View, { style: styles.tableRow, children: [
          renderItemDescription(getDescription("deductionOthers", payslipEmployee.deductionOthersDesc || "Other Deduction"), "deductionOthers"),
          /* @__PURE__ */ jsx(Text, { style: styles.itemVal, children: formatCurrency(deductionOthersVal) })
        ] }),
        /* @__PURE__ */ jsxs(View, { style: styles.tableTotalRow, children: [
          /* @__PURE__ */ jsx(Text, { style: styles.tableTotalText, children: documentProfile.isPaymentVoucher ? "Other Deductions" : "Total Deductions" }),
          /* @__PURE__ */ jsx(Text, { style: styles.tableTotalText, children: formatCurrency(breakdown.totalDeductions) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(View, { style: styles.summaryStrip, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.summaryCard, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.summaryLabel, children: documentProfile.isPaymentVoucher ? "Gross Amount" : "Gross Pay" }),
        /* @__PURE__ */ jsx(Text, { style: styles.summaryValue, children: formatCurrency(breakdown.grossPay) })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: styles.summaryCard, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.summaryLabel, children: documentProfile.isPaymentVoucher ? "Other Deductions" : "Total Deductions" }),
        /* @__PURE__ */ jsx(Text, { style: styles.summaryValue, children: formatCurrency(breakdown.totalDeductions) })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: styles.summaryCardNetPay, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.summaryLabelNetPay, children: documentProfile.isPaymentVoucher ? "Net Payable" : "Net Pay" }),
        /* @__PURE__ */ jsx(Text, { style: styles.summaryValueNetPay, children: formatCurrency(breakdown.netPay) })
      ] })
    ] }),
    documentProfile.statutoryEnabled && displaySettings.showEmployerContributions && /* @__PURE__ */ jsxs(View, { style: styles.contributionsCard, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.contributionsTitle, children: "Employer Contributions (Not Paid to Employee)" }),
      /* @__PURE__ */ jsxs(View, { style: styles.contributionsGrid, children: [
        /* @__PURE__ */ jsxs(View, { style: styles.contributionCol, children: [
          /* @__PURE__ */ jsxs(Text, { style: [styles.detailLabel, { color: "#6b7280" }], children: [
            "EPF (",
            epfRateEmployer,
            "%)"
          ] }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailValue, { color: "#333333" }], children: formatCurrency(epfEmployerValue) })
        ] }),
        /* @__PURE__ */ jsx(View, { style: styles.contributionDivider }),
        /* @__PURE__ */ jsxs(View, { style: styles.contributionCol, children: [
          /* @__PURE__ */ jsx(Text, { style: [styles.detailLabel, { color: "#6b7280" }], children: "SOCSO - Injury" }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailValue, { color: "#333333" }], children: formatCurrency(socsoEmployerInjury) })
        ] }),
        /* @__PURE__ */ jsx(View, { style: styles.contributionDivider }),
        /* @__PURE__ */ jsxs(View, { style: styles.contributionCol, children: [
          /* @__PURE__ */ jsx(Text, { style: [styles.detailLabel, { color: "#6b7280" }], children: "SOCSO - Invalidity" }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailValue, { color: "#333333" }], children: formatCurrency(socsoEmployerInvalidity) })
        ] }),
        /* @__PURE__ */ jsx(View, { style: styles.contributionDivider }),
        /* @__PURE__ */ jsxs(View, { style: styles.contributionCol, children: [
          /* @__PURE__ */ jsx(Text, { style: [styles.detailLabel, { color: "#A32626" }], children: "SOCSO Employer Total" }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailValue, { color: "#A32626" }], children: formatCurrency(breakdown.socsoEmployerVal) })
        ] }),
        /* @__PURE__ */ jsx(View, { style: styles.contributionDivider }),
        /* @__PURE__ */ jsxs(View, { style: styles.contributionCol, children: [
          /* @__PURE__ */ jsx(Text, { style: [styles.detailLabel, { color: "#6b7280" }], children: "EIS" }),
          /* @__PURE__ */ jsx(Text, { style: [styles.detailValue, { color: "#333333" }], children: formatCurrency(breakdown.eisEmployerVal) })
        ] })
      ] })
    ] }),
    displaySettings.showNotesFooter && /* @__PURE__ */ jsxs(View, { style: styles.footerSection, children: [
      /* @__PURE__ */ jsxs(View, { style: styles.footerCol, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.footerTitle, children: "Important Note" }),
        /* @__PURE__ */ jsx(Text, { style: styles.footerText, children: "This is a computer generated document." }),
        /* @__PURE__ */ jsx(Text, { style: styles.footerText, children: "No signature is required." })
      ] }),
      /* @__PURE__ */ jsxs(View, { style: [styles.footerCol, { alignItems: "flex-end" }], children: [
        /* @__PURE__ */ jsx(Text, { style: styles.footerTitle, children: "Pay Period" }),
        /* @__PURE__ */ jsx(Text, { style: styles.footerTextBold, children: payPeriodText })
      ] })
    ] }),
    displaySettings.showNotesFooter && /* @__PURE__ */ jsxs(View, { style: styles.confidentialBar, children: [
      /* @__PURE__ */ jsxs(Text, { style: styles.confidentialBarText, children: [
        "Thank you for your continued contribution to ",
        entity?.name || "Red Point Sdn Bhd",
        "."
      ] }),
      /* @__PURE__ */ jsx(Text, { style: styles.confidentialBarLabel, children: "CONFIDENTIAL" })
    ] })
  ] }) });
};

// api/_lib/officialPayslipPdf.tsx
var numberValue = (value) => Number(value ?? 0) || 0;
var stringValue = (value) => String(value ?? "");
var parseJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
var validEmploymentTypes = /* @__PURE__ */ new Set([
  "Internship",
  "Probation",
  "Permanent",
  "Contract",
  "Fixed Term Contract",
  "Independent Contractor",
  "Part Time",
  "Probationary",
  "Confirmation",
  "Independent Contractor / Freelance"
]);
var validStatuses = /* @__PURE__ */ new Set([
  "Active",
  "Active - Probation",
  "Active - Confirmation",
  "On Leave",
  "Resigned",
  "Terminated",
  "Suspended"
]);
var validMaritalStatuses = /* @__PURE__ */ new Set([
  "Single",
  "Married",
  "Divorced",
  "Widowed"
]);
var asEmploymentType = (value) => validEmploymentTypes.has(value) ? value : "Permanent";
var asStatus = (value) => validStatuses.has(value) ? value : "Active";
var asMaritalStatus = (value) => validMaritalStatuses.has(value) ? value : "Single";
var mapPayrollRowToEmployee = (row, payrollRow) => ({
  id: stringValue(row.id || row.email || payrollRow.employee_email),
  entityId: stringValue(row.entity_id || row.entity_name || payrollRow.entity_id),
  name: stringValue(row.name || payrollRow.employee_name || payrollRow.employee_email),
  email: stringValue(row.email || payrollRow.employee_email),
  designation: stringValue(row.designation),
  department: stringValue(row.department),
  status: asStatus(row.status),
  bankName: stringValue(row.bank_name || row.bankName),
  accountNo: stringValue(row.account_no || row.accountNo),
  basicSalary: numberValue(row.basic_salary),
  housingAllowance: numberValue(row.housing_allowance),
  transportAllowance: numberValue(row.transport_allowance),
  overtime: numberValue(row.overtime),
  performanceBonus: numberValue(row.performance_bonus),
  allowanceGeneral: numberValue(row.allowance_general),
  allowanceTransport: numberValue(row.allowance_transport),
  allowanceParking: numberValue(row.allowance_parking),
  allowanceMeal: numberValue(row.allowance_meal),
  allowanceAccommodation: numberValue(row.allowance_accommodation),
  allowancePhone: numberValue(row.allowance_phone),
  paymentDate: row.payment_date ? stringValue(row.payment_date) : void 0,
  payslipDescriptions: parseJson(row.payslip_descriptions, void 0),
  reimbursementAmount: numberValue(row.reimbursement_amount),
  reimbursementDesc: row.reimbursement_desc ? stringValue(row.reimbursement_desc) : void 0,
  incompleteMonthDeduction: numberValue(row.incomplete_month_deduction),
  bonusAmount: numberValue(row.bonus_amount),
  bonusDesc: row.bonus_desc ? stringValue(row.bonus_desc) : void 0,
  commissionAmount: numberValue(row.commission_amount),
  commissionDesc: row.commission_desc ? stringValue(row.commission_desc) : void 0,
  backPayAmount: numberValue(row.back_pay_amount),
  backPayDesc: row.back_pay_desc ? stringValue(row.back_pay_desc) : void 0,
  awsAmount: numberValue(row.aws_amount),
  awsDesc: row.aws_desc ? stringValue(row.aws_desc) : void 0,
  compensationAmount: numberValue(row.compensation_amount),
  compensationDesc: row.compensation_desc ? stringValue(row.compensation_desc) : void 0,
  deductionInLieu: numberValue(row.deduction_in_lieu),
  deductionCp38: numberValue(row.deduction_cp38),
  deductionOthers: numberValue(row.deduction_others),
  deductionOthersDesc: row.deduction_others_desc ? stringValue(row.deduction_others_desc) : void 0,
  epfRateEmployee: numberValue(row.epf_rate_employee) || 11,
  epfRateEmployer: numberValue(row.epf_rate_employer) || 13,
  socsoEmployee: numberValue(row.socso_employee),
  socsoEmployer: numberValue(row.socso_employer),
  eisEmployee: numberValue(row.eis_employee),
  eisEmployer: numberValue(row.eis_employer),
  skbbkEmployee: numberValue(row.skbbk_employee || row.lindung24_employee),
  skbbkEmployer: numberValue(row.skbbk_employer),
  taxPcb: numberValue(row.tax_pcb),
  unpaidLeave: numberValue(row.unpaid_leave),
  hrdCorp: numberValue(row.hrd_corp),
  nricPassport: stringValue(row.nric_passport),
  nationality: stringValue(row.nationality),
  contactNumber: row.contact_number ? stringValue(row.contact_number) : void 0,
  taxNumber: stringValue(row.tax_number),
  epfNumber: row.epf_number ? stringValue(row.epf_number) : void 0,
  employmentType: asEmploymentType(row.employment_type),
  maritalStatus: asMaritalStatus(row.marital_status),
  eligibleForStatutory: row.eligible_for_statutory === "No" ? "No" : "Yes",
  contractStatutoryTreatment: row.contract_statutory_treatment || void 0,
  payrollDocumentDisplaySettings: parseJson(
    row.payroll_document_display_settings,
    void 0
  ),
  optInEpf: row.opt_in_epf !== false,
  optInSocso: row.opt_in_socso !== false,
  optInEis: row.opt_in_eis !== false,
  optInPcb: row.opt_in_pcb !== false,
  enableLindung24: row.enable_lindung24 === true,
  emergencyContactName: stringValue(row.emergency_contact_name),
  emergencyContactRelation: stringValue(row.emergency_contact_relation),
  emergencyContactPhone: stringValue(row.emergency_contact_phone),
  dateOfJoined: stringValue(row.date_of_joined),
  dateOfConfirmation: row.date_of_confirmation ? stringValue(row.date_of_confirmation) : void 0,
  dateOfTermination: row.date_of_termination ? stringValue(row.date_of_termination) : void 0,
  spouseName: row.spouse_name ? stringValue(row.spouse_name) : void 0,
  spouseNric: row.spouse_nric ? stringValue(row.spouse_nric) : void 0,
  spouseIsWorking: row.spouse_is_working || void 0,
  spouseCompany: row.spouse_company ? stringValue(row.spouse_company) : void 0,
  spousePosition: row.spouse_position ? stringValue(row.spouse_position) : void 0,
  hasDependants: row.has_dependants || void 0,
  dependants: parseJson(row.dependants, void 0),
  careerHistory: parseJson(row.career_history, []),
  salaryAdjustments: parseJson(row.salary_adjustments, [])
});
var mapPayrollRowToRecord = (row, employee) => ({
  id: stringValue(row.id),
  employeeId: stringValue(row.employee_id || employee.id),
  employeeEmail: stringValue(row.employee_email || employee.email),
  payrollMonth: Number(row.payroll_month || (/* @__PURE__ */ new Date()).getMonth() + 1),
  payrollYear: Number(row.payroll_year || (/* @__PURE__ */ new Date()).getFullYear()),
  status: row.status || "Draft",
  paymentDate: row.payment_date ? stringValue(row.payment_date) : void 0,
  basicSalary: numberValue(row.basic_salary),
  allowanceGeneral: numberValue(row.allowance_general),
  allowanceTransport: numberValue(row.allowance_transport),
  allowanceParking: numberValue(row.allowance_parking),
  allowanceMeal: numberValue(row.allowance_meal),
  allowanceAccommodation: numberValue(row.allowance_accommodation),
  allowancePhone: numberValue(row.allowance_phone),
  overtime: numberValue(row.overtime),
  bonusAmount: numberValue(row.bonus_amount),
  bonusDesc: row.bonus_desc ? stringValue(row.bonus_desc) : void 0,
  commissionAmount: numberValue(row.commission_amount),
  commissionDesc: row.commission_desc ? stringValue(row.commission_desc) : void 0,
  backPayAmount: numberValue(row.back_pay_amount),
  backPayDesc: row.back_pay_desc ? stringValue(row.back_pay_desc) : void 0,
  awsAmount: numberValue(row.aws_amount),
  awsDesc: row.aws_desc ? stringValue(row.aws_desc) : void 0,
  compensationAmount: numberValue(row.compensation_amount),
  compensationDesc: row.compensation_desc ? stringValue(row.compensation_desc) : void 0,
  reimbursementAmount: numberValue(row.reimbursement_amount),
  reimbursementDesc: row.reimbursement_desc ? stringValue(row.reimbursement_desc) : void 0,
  unpaidLeave: numberValue(row.unpaid_leave),
  incompleteMonthDeduction: numberValue(row.incomplete_month_deduction || row.proration_deduction),
  deductionInLieu: numberValue(row.deduction_in_lieu),
  deductionCp38: numberValue(row.deduction_cp38),
  deductionOthers: numberValue(row.deduction_others),
  deductionOthersDesc: row.deduction_others_desc ? stringValue(row.deduction_others_desc) : void 0,
  payslipDescriptions: parseJson(row.payslip_descriptions, void 0),
  payoutKind: row.payout_kind || "regular",
  isSeparatePayout: row.is_separate_payout === true || row.is_separate_payout === "true",
  statutoryTreatment: row.statutory_treatment || void 0,
  payoutTitle: row.payout_title ? stringValue(row.payout_title) : void 0,
  payoutDescription: row.payout_description ? stringValue(row.payout_description) : void 0,
  lineNotes: parseJson(row.line_notes, void 0),
  documentType: row.document_type || void 0,
  compensationLabel: row.compensation_label || void 0,
  displaySettingsSnapshot: parseJson(row.display_settings_snapshot, void 0),
  grossPay: row.gross_pay === null || row.gross_pay === void 0 ? void 0 : numberValue(row.gross_pay),
  calculationVersion: row.calculation_version || void 0,
  actualPCBDeducted: numberValue(row.actual_pcb_deducted || row.tax_pcb),
  epfEmployee: numberValue(row.epf_employee),
  epfEmployer: numberValue(row.epf_employer),
  socsoEmployee: numberValue(row.socso_employee),
  socsoEmployer: numberValue(row.socso_employer),
  lindung24Employee: numberValue(row.lindung24_employee || row.skbbk_employee),
  eisEmployee: numberValue(row.eis_employee),
  eisEmployer: numberValue(row.eis_employer),
  hrdCorp: numberValue(row.hrd_corp),
  netPay: numberValue(row.net_pay || row.net_salary),
  createdAt: stringValue(row.created_at),
  updatedAt: row.updated_at ? stringValue(row.updated_at) : void 0,
  publishedAt: row.published_at ? stringValue(row.published_at) : void 0,
  publishedBy: row.published_by ? stringValue(row.published_by) : void 0,
  publishError: row.publish_error ? stringValue(row.publish_error) : void 0,
  payslipSentAt: row.payslip_sent_at ? stringValue(row.payslip_sent_at) : void 0,
  payslipSentBy: row.payslip_sent_by ? stringValue(row.payslip_sent_by) : void 0,
  payslipEmailStatus: row.payslip_email_status || void 0,
  payslipEmailError: row.payslip_email_error ? stringValue(row.payslip_email_error) : void 0
});
var mapEntityRow = (row, employee) => ({
  id: stringValue(row?.id || employee.entityId || "default"),
  name: stringValue(row?.name || employee.entityId || "Red Point Sdn Bhd"),
  registrationNumber: stringValue(row?.registration_number),
  address: stringValue(row?.address),
  taxReferenceNo: stringValue(row?.tax_reference_no),
  epfReferenceNo: stringValue(row?.epf_reference_no),
  socsoReferenceNo: stringValue(row?.socso_reference_no),
  currency: stringValue(row?.currency || "RM"),
  isActive: row?.is_active !== false,
  logoUrl: row?.logo_url ? stringValue(row.logo_url) : void 0,
  theme: row?.theme || void 0,
  googleScriptUrl: row?.google_script_url ? stringValue(row.google_script_url) : void 0,
  enableLindung24: row?.enable_lindung24 === true
});
var defaultLogoDataUri = async () => {
  const logoPath = path.join(process.cwd(), "public", "redpoint-logo.png");
  const contents = await readFile(logoPath);
  return `data:image/png;base64,${contents.toString("base64")}`;
};
var ensureServerLocalStorage = () => {
  const current = globalThis.localStorage;
  if (current && typeof current.getItem === "function" && typeof current.setItem === "function") return;
  const values = /* @__PURE__ */ new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(String(key)) ?? null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: (key) => values.delete(String(key)),
      clear: () => values.clear()
    }
  });
};
var logoDataUri = async (logoUrl) => {
  if (!logoUrl) return defaultLogoDataUri();
  if (logoUrl.startsWith("data:image/")) return logoUrl;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error(`Logo request returned ${response.status}.`);
    const type = response.headers.get("content-type") || "image/png";
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch (error) {
    console.warn("[Payslip PDF] Could not load entity logo, using default logo:", error);
    return defaultLogoDataUri();
  }
};
var toBuffer = async (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  stream.on("end", () => resolve(Buffer.concat(chunks)));
  stream.on("error", reject);
});
var renderOfficialPayslipPdf = async (payrollRow, employeeRow, entityRow, options = {}) => {
  ensureServerLocalStorage();
  seedSocsoConfigurationsAndBrackets();
  const sensitiveAllowed = options.sensitiveAllowed !== false;
  const employee = mapPayrollRowToEmployee(employeeRow, payrollRow);
  const record = mapPayrollRowToRecord(payrollRow, employee);
  const entity = mapEntityRow(entityRow, employee);
  const displaySettingsOverride = sensitiveAllowed ? {} : {
    showTin: false,
    showEpfNumber: false,
    showNricPassport: false,
    showBankAccount: false
  };
  const restrictedEmployee = sensitiveAllowed ? employee : {
    ...employee,
    taxNumber: "",
    epfNumber: "",
    nricPassport: "",
    bankName: "",
    accountNo: ""
  };
  const document2 = React.createElement(PayslipPDFDocument, {
    employee: restrictedEmployee,
    entity,
    month: record.payrollMonth,
    year: record.payrollYear,
    payrollRecordOverride: record,
    displaySettingsOverride,
    logoSrc: await logoDataUri(entity.logoUrl)
  });
  return toBuffer(await pdf(document2).toBuffer());
};
export {
  mapEntityRow,
  mapPayrollRowToEmployee,
  mapPayrollRowToRecord,
  renderOfficialPayslipPdf
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
