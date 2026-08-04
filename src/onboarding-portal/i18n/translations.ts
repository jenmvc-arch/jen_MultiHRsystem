import { Language } from './types';
import { HandbookModule, QuizQuestion } from '../types';
import { OFFICIAL_HANDBOOK_MODULES } from '../data/fullHandbookData';

export const UI_TRANSLATIONS = {
  en: {
    // Brand & Common
    companyName: 'Red Point',
    companyFullName: 'Red Point Sdn. Bhd.',
    portalTitle: 'Employee Onboarding Portal',

    // Nav
    navDashboard: 'Dashboard',
    navHandbooks: 'Handbooks',
    navQuiz: 'Compliance Quiz',
    navHrAnalytics: 'HR Analytics',
    navDocuments: 'My Documents',
    navSettings: 'Settings',
    searchPlaceholder: 'Search handbooks, policies...',
    aiAssistant: 'AI Assistant',
    switchToHr: 'Switch to HR View',
    switchToEmployee: 'Switch to Employee',
    notifications: 'Notifications',
    helpSupport: 'Help & Support',

    // Login
    loginTitle: 'Welcome to Red Point',
    loginSubtitle: 'Please sign in to access your onboarding handbook and company policies',
    loginAsEmployee: 'Employee Login',
    loginAsHr: 'HR Admin Login',
    emailOrEmpId: 'Email or Employee ID',
    password: 'Password',
    loginButton: 'Sign In to Portal',
    demoPresets: 'Quick Demo Sign-In:',

    // Dashboard
    welcomeHeader: 'Welcome aboard,',
    welcomeSubtitle: 'Your onboarding journey is underway. Complete the remaining steps to finalize your employment setup.',
    overallProgress: 'Overall Progress',
    daysRemaining: 'Days remaining to complete',
    milestoneTitle: 'Onboarding Milestone Timeline',
    milestone1Title: 'Welcome & Profile Setup',
    milestone1Desc: 'Basic information and photo uploaded.',
    milestone1Completed: 'Completed Oct 24',
    milestone2Title: 'Employee Handbook Review',
    milestone2Desc: 'Read through the company policies and pass the basic comprehension quiz.',
    handbookProgress: 'Handbook Progress',
    sectionsRead: 'Sections Read',
    continueReading: 'Continue Reading',
    milestone3Title: 'Tax & Payroll Documents',
    milestone3Desc: 'Submit necessary tax forms (CP22, EA) for payroll processing.',
    uploadTaxForms: 'Upload Tax Forms →',
    milestone4Title: 'Final Sign-off',
    milestone4Desc: 'Acknowledge all policies with a digital e-signature.',
    initialsSigned: 'Initials Signed',
    quizStatusTitle: 'Compliance Quiz Status',
    quizPassed: 'Passed:',
    quizPending: 'Pending Completion',
    quizDescText: 'The 30-question compliance quiz tests understanding of ethics, gifts, and safety. Pass mark is 65% (Grade A).',
    reviewQuiz: 'Review Quiz Results',
    takeQuiz: 'Take Compliance Quiz',
    finalSignatureTitle: 'Final Signature',
    prereqNotice: 'Requires 100% prerequisite completion.',
    legalEsign: 'Final legal e-signature',
    step4of4: 'Step 4 of 4',

    // Handbook
    handbookHeaderTitle: 'Company Policy Handbooks',
    handbookHeaderSubtitle: 'Read and digitally acknowledge Red Point Sdn. Bhd. operational guidelines',
    filterAll: 'All Modules',
    filterCompleted: 'Completed',
    filterInProgress: 'In Progress',
    videoDuration: 'Video Duration:',
    sectionsLabel: 'Sections:',
    keyTakeawayLabel: 'Key Takeaway:',
    signAcknowledgeBtn: 'Sign & Acknowledge Module',
    moduleSignedBadge: 'Module Digitally Signed & Verified',
    askAiAboutModule: 'Ask AI Assistant About This Module',
    readingProgress: 'Reading Progress',

    // Quiz
    quizTitle: 'Compliance & Handbook Quiz',
    quizSubtitle: 'Answer the following questions to verify your understanding of Red Point policies and ethics.',
    questionCounter: 'Question',
    yourScore: 'Your Score:',
    passedBadge: 'PASSED',
    failedBadge: 'NOT PASSED',
    gradeLabel: 'Grade:',
    submitQuiz: 'Submit Quiz Answers',
    retakeQuiz: 'Retake Quiz',
    passCriteriaNote: 'Pass mark is 65% (Grade A). Passing is required before final onboarding sign-off.',
    categoryFilter: 'Category:',

    // HR Admin
    hrHeaderTitle: 'HR Analytics & Roster Management',
    hrHeaderSubtitle: 'Monitor onboarding completion, compliance metrics, and employee progress across departments.',
    statTotalEmp: 'Total Employees',
    statCompleted: 'Onboarding Completed',
    statInProgress: 'In Progress',
    statOverdue: 'Overdue / At Risk',
    searchRosterPlaceholder: 'Search employee name or email...',
    colEmployee: 'Employee',
    colDept: 'Department',
    colProgress: 'Progress',
    colQuizScore: 'Quiz Score',
    colDaysLeft: 'Days Remaining',
    colStatus: 'Status',
    colAction: 'Action',
    sendReminder: 'Send Reminder',
    exportCsv: 'Export CSV Report',

    // Documents
    docsHeaderTitle: 'Document & Form Repository',
    docsHeaderSubtitle: 'Download official policy templates and upload completed tax and payroll forms.',
    uploadNewDoc: 'Upload New Document',
    docNameCol: 'Document Name',
    categoryCol: 'Category',
    sizeCol: 'Size',
    dateCol: 'Date',
    statusCol: 'Status',
    downloadBtn: 'Download',
    exportPdfBtn: 'Export PDF',
    exportFormattedPdf: 'Export Formatted PDF',
    officialPoliciesTitle: 'Company Policies & Governance Documents',
    policySearchPlaceholder: 'Search policy title, category, or document code...',
    policyExportNotice: 'Exports an official formatted PDF with Red Point corporate header and digital governance stamp.',
    downloadingPdf: 'Generating PDF...',

    // Settings
    settingsTitle: 'Profile & App Settings',
    personalInfo: 'Personal Information',
    fullName: 'Full Name',
    emailAddr: 'Email Address',
    department: 'Department',
    languagePrefTitle: 'App Language Preference',
    languagePrefDesc: 'Select your preferred language for the onboarding portal interface and handbook content.',
    emailNotifTitle: 'Email Notifications',
    emailNotifDesc: 'Receive email reminders for pending onboarding modules and quiz due dates.',
    saveChanges: 'Save Changes',
    settingsSaved: 'Settings updated successfully!',

    // AI Assistant
    aiAssistantTitle: 'Handbook AI Assistant',
    aiAssistantSubtitle: 'Ask any questions regarding Red Point policies, benefits, code of conduct, and leave entitlements.',
    suggestedQuestions: 'Suggested Questions:',
    aiInputPlaceholder: 'Type your policy question in English, Malay, or Chinese...',
    aiSendBtn: 'Send',
    sampleAiQuestion1: 'What is the gift acceptance policy?',
    sampleAiQuestion2: 'How many days of annual leave do I get?',
    sampleAiQuestion3: 'What happens if I fail the compliance quiz?',
  },

  ms: {
    // Brand & Common
    companyName: 'Red Point',
    companyFullName: 'Red Point Sdn. Bhd.',
    portalTitle: 'Portal Suai Kenal Pekerja',

    // Nav
    navDashboard: 'Papan Pemuka',
    navHandbooks: 'Buku Panduan',
    navQuiz: 'Kuiz Pematuhan',
    navHrAnalytics: 'Analitik HR',
    navDocuments: 'Dokumen Saya',
    navSettings: 'Tetapan',
    searchPlaceholder: 'Cari buku panduan, dasar...',
    aiAssistant: 'Pembantu AI',
    switchToHr: 'Tukar ke Pandangan HR',
    switchToEmployee: 'Tukar ke Pandangan Pekerja',
    notifications: 'Pemberitahuan',
    helpSupport: 'Bantuan & Sokongan',

    // Login
    loginTitle: 'Selamat Datang ke Red Point',
    loginSubtitle: 'Sila log masuk untuk mengakses buku panduan suai kenal dan dasar syarikat anda',
    loginAsEmployee: 'Log Masuk Pekerja',
    loginAsHr: 'Log Masuk Pentadbir HR',
    emailOrEmpId: 'Emel atau ID Pekerja',
    password: 'Kata Laluan',
    loginButton: 'Log Masuk ke Portal',
    demoPresets: 'Log Masuk Segera (Demo):',

    // Dashboard
    welcomeHeader: 'Selamat datang,',
    welcomeSubtitle: 'Perjalanan suai kenal anda sedang berlangsung. Selesaikan langkah seterusnya untuk melengkapkan tetapan pekerjaan anda.',
    overallProgress: 'Kemajuan Keseluruhan',
    daysRemaining: 'Hari lagi untuk diselesaikan',
    milestoneTitle: 'Garisan Masa Pencapaian Suai Kenal',
    milestone1Title: 'Selamat Datang & Tetapan Profil',
    milestone1Desc: 'Maklumat asas dan foto telah dimuat naik.',
    milestone1Completed: 'Selesai pada 24 Okt',
    milestone2Title: 'Semakan Buku Panduan Pekerja',
    milestone2Desc: 'Baca dasar syarikat dan lulus kuiz kefahaman asas.',
    handbookProgress: 'Kemajuan Buku Panduan',
    sectionsRead: 'Bahagian Dibaca',
    continueReading: 'Teruskan Membaca',
    milestone3Title: 'Dokumen Cukai & Penggajian',
    milestone3Desc: 'Hantar borang cukai (CP22, EA) untuk pemprosesan gaji.',
    uploadTaxForms: 'Muat Naik Borang Cukai →',
    milestone4Title: 'Pengesahan Akhir',
    milestone4Desc: 'Sahkan semua dasar dengan tandatangan digital.',
    initialsSigned: 'Tandatangan Ringkas',
    quizStatusTitle: 'Status Kuiz Pematuhan',
    quizPassed: 'Lulus:',
    quizPending: 'Belum Selesai',
    quizDescText: 'Kuiz pematuhan 30 soalan menguji kefahaman etika, hadiah, dan keselamatan. Markah lulus ialah 65% (Gred A).',
    reviewQuiz: 'Semak Keputusan Kuiz',
    takeQuiz: 'Ambil Kuiz Pematuhan',
    finalSignatureTitle: 'Tandatangan Akhir',
    prereqNotice: 'Memerlukan 100% penyelesaian prasyarat.',
    legalEsign: 'Tandatangan digital rasmi akhir',
    step4of4: 'Langkah 4 daripada 4',

    // Handbook
    handbookHeaderTitle: 'Buku Panduan Dasar Syarikat',
    handbookHeaderSubtitle: 'Baca dan sahkan secara digital garis panduan operasi Red Point Sdn. Bhd.',
    filterAll: 'Semua Modul',
    filterCompleted: 'Selesai',
    filterInProgress: 'Dalam Proses',
    videoDuration: 'Masa Video:',
    sectionsLabel: 'Bahagian:',
    keyTakeawayLabel: 'Rumusan Kunci:',
    signAcknowledgeBtn: 'Tandatangan & Sahkan Modul Ini',
    moduleSignedBadge: 'Modul Telah Disahkan Secara Digital',
    askAiAboutModule: 'Tanya Pembantu AI Mengenai Modul Ini',
    readingProgress: 'Kemajuan Membaca',

    // Quiz
    quizTitle: 'Kuiz Pematuhan & Buku Panduan',
    quizSubtitle: 'Jawab soalan berikut untuk mengesahkan kefahaman anda mengenai dasar dan etika Red Point.',
    questionCounter: 'Soalan',
    yourScore: 'Markah Anda:',
    passedBadge: 'LULUS',
    failedBadge: 'TIDAK LULUS',
    gradeLabel: 'Gred:',
    submitQuiz: 'Hantar Jawapan Kuiz',
    retakeQuiz: 'Cuba Lagi Kuiz',
    passCriteriaNote: 'Markah lulus ialah 65% (Gred A). Lulus diperlukan sebelum kelulusan akhir suai kenal.',
    categoryFilter: 'Kategori:',

    // HR Admin
    hrHeaderTitle: 'Analitik HR & Pengurusan Senarai Pekerja',
    hrHeaderSubtitle: 'Pantau penyelesaian suai kenal, metrik pematuhan, dan kemajuan pekerja mengikut jabatan.',
    statTotalEmp: 'Jumlah Pekerja',
    statCompleted: 'Suai Kenal Selesai',
    statInProgress: 'Dalam Proses',
    statOverdue: 'Lewat / Berisiko',
    searchRosterPlaceholder: 'Cari nama atau emel pekerja...',
    colEmployee: 'Pekerja',
    colDept: 'Jabatan',
    colProgress: 'Kemajuan',
    colQuizScore: 'Markah Kuiz',
    colDaysLeft: 'Baki Hari',
    colStatus: 'Status',
    colAction: 'Tindakan',
    sendReminder: 'Hantar Peringatan',
    exportCsv: 'Eksport Laporan CSV',

    // Documents
    docsHeaderTitle: 'Repositori Dokumen & Borang',
    docsHeaderSubtitle: 'Muat turun templat dasar rasmi dan muat naik borang cukai serta gaji yang telah dilengkapkan.',
    uploadNewDoc: 'Muat Naik Dokumen Baharu',
    docNameCol: 'Nama Dokumen',
    categoryCol: 'Kategori',
    sizeCol: 'Saiz',
    dateCol: 'Tarikh',
    statusCol: 'Status',
    downloadBtn: 'Muat Turun',
    exportPdfBtn: 'Eksport PDF',
    exportFormattedPdf: 'Eksport PDF Format',
    officialPoliciesTitle: 'Dasar Syarikat & Dokumen Tata Kelola',
    policySearchPlaceholder: 'Cari tajuk dasar, kategori, atau kod rujukan...',
    policyExportNotice: 'Mengeksport PDF rasmi yang diformat dengan kepala surat korporat Red Point dan cap pengesahan digital.',
    downloadingPdf: 'Menjana PDF...',

    // Settings
    settingsTitle: 'Tetapan Profil & Aplikasi',
    personalInfo: 'Maklumat Peribadi',
    fullName: 'Nama Penuh',
    emailAddr: 'Alamat Emel',
    department: 'Jabatan',
    languagePrefTitle: 'Pilihan Bahasa Aplikasi',
    languagePrefDesc: 'Pilih bahasa pilihan anda untuk antaramuka portal suai kenal dan kandungan buku panduan.',
    emailNotifTitle: 'Pemberitahuan Emel',
    emailNotifDesc: 'Terima peringatan emel untuk modul suai kenal yang belum selesai dan tarikh akhir kuiz.',
    saveChanges: 'Simpan Perubahan',
    settingsSaved: 'Tetapan berjaya dikemaskini!',

    // AI Assistant
    aiAssistantTitle: 'Pembantu AI Buku Panduan',
    aiAssistantSubtitle: 'Tanya apa-apa soalan mengenai dasar, faedah, etika, dan kelayakan cuti Red Point.',
    suggestedQuestions: 'Cadangan Soalan:',
    aiInputPlaceholder: 'Taip soalan dasar anda dalam Bahasa Melayu, Inggeris, atau Cina...',
    aiSendBtn: 'Hantar',
    sampleAiQuestion1: 'Apakah dasar penerimaan hadiah syarikat?',
    sampleAiQuestion2: 'Berapakah kelayakan cuti tahunan saya?',
    sampleAiQuestion3: 'Apakah yang berlaku jika gagal kuiz pematuhan?',
  },

  zh: {
    // Brand & Common
    companyName: 'Red Point',
    companyFullName: 'Red Point Sdn. Bhd.',
    portalTitle: '员工入职培训门户',

    // Nav
    navDashboard: '仪表板',
    navHandbooks: '员工手册',
    navQuiz: '合规测试',
    navHrAnalytics: 'HR 分析',
    navDocuments: '我的文件',
    navSettings: '设置',
    searchPlaceholder: '搜索手册、政策...',
    aiAssistant: 'AI 助手',
    switchToHr: '切换至 HR 视图',
    switchToEmployee: '切换至员工视图',
    notifications: '通知',
    helpSupport: '帮助与支持',

    // Login
    loginTitle: '欢迎来到 Red Point',
    loginSubtitle: '请登录以访问您的入职培训手册和公司政策',
    loginAsEmployee: '员工登录',
    loginAsHr: 'HR 管理员登录',
    emailOrEmpId: '电子邮件或员工 ID',
    password: '密码',
    loginButton: '登录入职门户',
    demoPresets: '快速演示登录：',

    // Dashboard
    welcomeHeader: '欢迎加入，',
    welcomeSubtitle: '您的入职流程正在有序推进中。请完成剩余步骤以定稿您的入职设置。',
    overallProgress: '总体完成度',
    daysRemaining: '天内需完成',
    milestoneTitle: '入职里程碑时间线',
    milestone1Title: '欢迎与个人资料设置',
    milestone1Desc: '基本信息及照片已成功上传。',
    milestone1Completed: '于 10月24日 完成',
    milestone2Title: '员工手册审阅',
    milestone2Desc: '阅读公司各项政策并通关基础理解测试。',
    handbookProgress: '手册阅读进度',
    sectionsRead: '已读章节',
    continueReading: '继续阅读',
    milestone3Title: '税务与薪酬文件',
    milestone3Desc: '提交必要的税务表格（CP22、EA）以供薪资结算。',
    uploadTaxForms: '上传税务表格 →',
    milestone4Title: '最终签署 confirmation',
    milestone4Desc: '通过数字电子签名确认并签署所有政策条款。',
    initialsSigned: '已小签次数',
    quizStatusTitle: '合规测试状态',
    quizPassed: '已通过：',
    quizPending: '待完成',
    quizDescText: '包含30道题目的合规测试，考查对职业道德、礼品及安全政策的理解。合格分数为 65%（A 级）。',
    reviewQuiz: '查看测试结果',
    takeQuiz: '参加合规测试',
    finalSignatureTitle: '最终签署',
    prereqNotice: '需要完成 100% 前置条件。',
    legalEsign: '最终法律效力电子签名',
    step4of4: '第 4 / 4 步',

    // Handbook
    handbookHeaderTitle: '公司政策与规章手册',
    handbookHeaderSubtitle: '阅读并数字确认 Red Point Sdn. Bhd. 的各项运营与合规指南',
    filterAll: '所有模块',
    filterCompleted: '已完成',
    filterInProgress: '进行中',
    videoDuration: '视频时长：',
    sectionsLabel: '章节数：',
    keyTakeawayLabel: '核心要点：',
    signAcknowledgeBtn: '签署并确认本模块',
    moduleSignedBadge: '本模块已通过数字电子签名确认',
    askAiAboutModule: '向 AI 助手咨询此模块',
    readingProgress: '本章阅读进度',

    // Quiz
    quizTitle: '合规与手册在线测试',
    quizSubtitle: '请回答以下问题，以检验您对 Red Point 政策与道德规范的理解。',
    questionCounter: '题目',
    yourScore: '您的得分：',
    passedBadge: '已通过',
    failedBadge: '未通过',
    gradeLabel: '等级：',
    submitQuiz: '提交测试答案',
    retakeQuiz: '重新测试',
    passCriteriaNote: '合格分数为 65%（A 级）。入职最终批准前必须通过测试。',
    categoryFilter: '类别：',

    // HR Admin
    hrHeaderTitle: 'HR 分析与员工名册管理',
    hrHeaderSubtitle: '监控各部门员工入职完成率、合规指标及学习进度。',
    statTotalEmp: '员工总数',
    statCompleted: '已完成入职',
    statInProgress: '进行中人数',
    statOverdue: '逾期 / 预警',
    searchRosterPlaceholder: '按员工姓名或邮箱搜索...',
    colEmployee: '员工',
    colDept: '部门',
    colProgress: '完成进度',
    colQuizScore: '测试成绩',
    colDaysLeft: '剩余天数',
    colStatus: '状态',
    colAction: '操作',
    sendReminder: '发送提醒',
    exportCsv: '导出 CSV 报告',

    // Documents
    docsHeaderTitle: '文件与税务表格中心',
    docsHeaderSubtitle: '下载官方模板，并上传您已签署的薪酬及税务文件。',
    uploadNewDoc: '上传新文件',
    docNameCol: '文件名称',
    categoryCol: '类别',
    sizeCol: '大小',
    dateCol: '日期',
    statusCol: '状态',
    downloadBtn: '下载',
    exportPdfBtn: '导出 PDF',
    exportFormattedPdf: '导出格式化 PDF',
    officialPoliciesTitle: '公司政策与合规文件',
    policySearchPlaceholder: '按政策标题、类别或文件编号搜索...',
    policyExportNotice: '导出带有 Red Point 官方抬头及数字合规印章的高清格式化 PDF 文件。',
    downloadingPdf: '正在生成 PDF...',

    // Settings
    settingsTitle: '个人资料与应用设置',
    personalInfo: '个人信息',
    fullName: '姓名',
    emailAddr: '电子邮件',
    department: '部门',
    languagePrefTitle: '应用语言偏好',
    languagePrefDesc: '选择您在入职门户界面和手册内容中首选的语言。',
    emailNotifTitle: '电子邮件通知',
    emailNotifDesc: '接收未完成入职模块和测试截止日期的邮件提醒。',
    saveChanges: '保存更改',
    settingsSaved: '设置更新成功！',

    // AI Assistant
    aiAssistantTitle: '手册 AI 智能助手',
    aiAssistantSubtitle: '随时询问有关 Red Point 公司政策、福利、职业道德及休假权益的任何问题。',
    suggestedQuestions: '推荐问题：',
    aiInputPlaceholder: '请用中文、马来语或英语输入您的政策问题...',
    aiSendBtn: '发送',
    sampleAiQuestion1: '公司对于接受礼品的政策是什么？',
    sampleAiQuestion2: '我每年享有几天年假？',
    sampleAiQuestion3: '如果合规测试未通过会怎样？',
  },
};

export function getTranslatedHandbookModules(lang: Language): HandbookModule[] {
  if (lang === 'ms') {
    return [
      {
        id: 1,
        title: '1. Selamat Datang ke Red Point',
        subtitle: 'Sejarah syarikat, misi, visi, dan kepimpinan teras',
        status: 'completed',
        videoPosterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY',
        videoDuration: '2:15',
        sectionsCount: 3,
        completedSections: 3,
        content: {
          sectionTitle: 'Selamat Datang ke Red Point Sdn. Bhd.',
          bodyParagraphs: [
            'Selamat datang ke Red Point! Kami amat gembira menyambut anda menyertai pasukan kami. Di Red Point, misi kami adalah memperkasakan perniagaan melalui teknologi dan tatakelola yang jelas.',
            'Sepanjang dekad yang lalu, Red Point telah berkembang menjadi pemimpin industri di Asia Tenggara. Sebagai ahli pasukan, pandangan unik dan dedikasi anda akan menyumbang secara langsung kepada bab seterusnya.',
          ],
          keyTakeaway: 'Portal suai kenal anda ialah panduan rujukan pusat anda sepanjang kerjaya anda di Red Point.',
        },
      },
      {
        id: 2,
        title: '2. Tata Etika Kerja',
        subtitle: 'Etika, konflik kepentingan, integriti profesional, dan hadiah',
        status: 'in-progress',
        videoPosterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY',
        videoDuration: '3:45',
        sectionsCount: 6,
        completedSections: 4,
        content: {
          sectionTitle: 'Integriti Profesional & Konflik Kepentingan',
          bodyParagraphs: [
            'Di Red Point, Tata Etika Kerja kami adalah asas budaya korporat kami. Kami percaya dalam memupuk persekitaran saling menghormati, integriti, dan kecemerlangan profesional mutlak.',
            'Pekerja diharapkan bertindak dengan jujur dan mengekalkan piawaian etika tertinggi dalam semua urusan perniagaan. Konflik kepentingan mesti didedahkan dengan serta-merta kepada penyelia atau jabatan HR.',
            'Menerima hadiah luar daripada pelanggan atau pembekal memerlukan pematuhan ketat kepada had ambang korporat. Hadiah di bawah RM100 dibenarkan dengan syarat didedahkan kepada HR, manakala tunai atau barangan bernilai tinggi mesti ditolak.',
          ],
          keyTakeaway: 'Jika ragu-ragu tentang keputusan etika, hubungi Rakan Perniagaan HR atau pegawai pematuhan anda dengan segera.',
        },
      },
      {
        id: 3,
        title: '3. Keselamatan & Kesihatan Tempat Kerja',
        subtitle: 'Ergonomik, protokol kecemasan, dan sumber kesihatan mental',
        status: 'locked',
        videoDuration: '4:10',
        sectionsCount: 4,
        completedSections: 0,
        content: {
          sectionTitle: 'Keselamatan Tempat Kerja & Ergonomik',
          bodyParagraphs: [
            'Red Point komited untuk mengekalkan persekitaran yang selamat, sihat, dan menyokong untuk semua pekerja sama ada di pejabat atau bekerja dari jauh.',
            'Sila semak laluan laluan kecemasan yang terletak di setiap tiang bangunan dan lengkapkan penilaian kendiri ergonomik meja tahunan anda.',
          ],
          keyTakeaway: 'Laporkan sebarang masalah keselamatan atau bahaya kepada pengurusan fasiliti dengan segera.',
        },
      },
      {
        id: 4,
        title: '4. Gambaran Keseluruhan Faedah & Cuti',
        subtitle: 'Penjagaan kesihatan, kelayakan cuti, elaun pembelajaran, dan tuntutan',
        status: 'locked',
        videoDuration: '5:00',
        sectionsCount: 5,
        completedSections: 0,
        content: {
          sectionTitle: 'Faedah Pekerja & Program Kesejahteraan',
          bodyParagraphs: [
            'Pakej faedah komprehensif kami merangkumi insurans perubatan, perlindungan pergigian, 18 hari cuti tahunan, dan kredit pembangunan profesional tahunan sebanyak RM3,000.',
            'Tuntutan boleh dihantar secara terus melalui portal HR di bawah bahagian Dokumen.',
          ],
          keyTakeaway: 'Hantar semua resit pembayaran semula bulanan sebelum 25 hb setiap bulan.',
        },
      },
    ];
  }

  if (lang === 'zh') {
    return [
      {
        id: 1,
        title: '1. 欢迎来到 Red Point',
        subtitle: '公司历史、使命、愿景及核心领导层介绍',
        status: 'completed',
        videoPosterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY',
        videoDuration: '2:15',
        sectionsCount: 3,
        completedSections: 3,
        content: {
          sectionTitle: '欢迎加入 Red Point Sdn. Bhd.',
          bodyParagraphs: [
            '热烈欢迎您加入 Red Point 团队！在 Red Point，我们的使命是通过先进的技术和严谨的治理赋能企业成长。',
            '在过去的十年中，Red Point 已发展成为东南亚领军企业。作为团队重要的一员，您的独特视角与奉献精神将直接助力我们开启崭新篇章。',
          ],
          keyTakeaway: '入职门户是您在 Red Point 职业生涯全程的核心参考指南。',
        },
      },
      {
        id: 2,
        title: '2. 行为准则与道德规范',
        subtitle: '职业道德、利益冲突、专业诚信及礼品收受政策',
        status: 'in-progress',
        videoPosterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY',
        videoDuration: '3:45',
        sectionsCount: 6,
        completedSections: 4,
        content: {
          sectionTitle: '专业诚信与利益冲突',
          bodyParagraphs: [
            '在 Red Point，行为准则是我们企业文化的基石。我们致力于营造相互尊重、恪守诚信和追求卓越专业水准的工作环境。',
            '所有员工须在商业活动中秉持诚实与最高道德标准。如存在任何潜在利益冲突，必须立即向您的直接主管或 HR 部门申报。',
            '收受来自客户或供应商的外界礼品需严格遵循公司门槛规定。价值低于 RM100 的非现金礼品在向 HR 备案后方可接受；现金等价物或高价值礼品必须婉拒或上交。',
          ],
          keyTakeaway: '当对道德决策产生疑问时，请立即咨询您的 HR 业务伙伴或合规官。',
        },
      },
      {
        id: 3,
        title: '3. 职场安全与健康',
        subtitle: '工效学、紧急疏散预案及心理健康支持资源',
        status: 'locked',
        videoDuration: '4:10',
        sectionsCount: 4,
        completedSections: 0,
        content: {
          sectionTitle: '职场安全与办公桌工效学',
          bodyParagraphs: [
            'Red Point 致力于为所有员工（无论在办公司还是远程办公）提供安全、健康和充满关怀的环境。',
            '请仔细审阅位于各大楼柱子上的紧急疏散路线图，并完成年度工效学自评。',
          ],
          keyTakeaway: '如发现任何安全隐患，请立即向物业设施管理部门报告。',
        },
      },
      {
        id: 4,
        title: '4. 员工福利与休假概览',
        subtitle: '医疗保险、休假额度、专业学习津贴与报销流程',
        status: 'locked',
        videoDuration: '5:00',
        sectionsCount: 5,
        completedSections: 0,
        content: {
          sectionTitle: '员工福利与健康保障计划',
          bodyParagraphs: [
            '我们的综合福利包括全额医疗与牙科保险、18天年假以及每年 RM3,000 的个人专业发展与健康津贴。',
            '费用报销可直接通过 HR 门户的“我的文件”板块进行提交。',
          ],
          keyTakeaway: '请在每月 25 日前提交当月的所有报销凭证。',
        },
      },
    ];
  }

  // Default EN
  return OFFICIAL_HANDBOOK_MODULES;
}

export function getTranslatedQuizQuestions(lang: Language, defaultQuestions: QuizQuestion[]): QuizQuestion[] {
  if (lang === 'ms') {
    return defaultQuestions.map((q) => {
      if (q.id === 1) {
        return {
          ...q,
          question: 'Apakah nilai misi teras utama Red Point?',
          options: [
            'Memperkasakan pekerja melalui kejelasan, integriti, dan pengetahuan terstruktur',
            'Memaksimumkan margin keuntungan suku tahunan jangka pendek',
            'Hapuskan semua dokumentasi dalaman',
            'Enforce kehadiran pejabat wajib 12 jam sehari'
          ]
        };
      }
      if (q.id === 2) {
        return {
          ...q,
          question: 'Berapakah kelayakan cuti tahunan standard untuk pekerja sepenuh masa di Red Point?',
          options: ['10 hari', '14 hari', '18 hari', '25 hari']
        };
      }
      if (q.id === 3) {
        return {
          ...q,
          question: 'Apakah markah lulus yang diperlukan untuk Kuiz Pematuhan & Buku Panduan?',
          options: ['50%', '60%', '65% (Gred A)', '90%']
        };
      }
      if (q.id === 4) {
        return {
          ...q,
          question: 'Sekiranya pekerja gagal kuiz pematuhan, apakah tempoh bertenang sebelum menduduki semula?',
          options: ['Tiada tempoh menunggu', '1 jam', '12 jam', '24 jam']
        };
      }
      if (q.id === 5) {
        return {
          ...q,
          question: 'Waktu teras manakah yang wajib untuk semua pekerja hibrid pada hari bekerja?',
          options: ['8 AM - 12 PM', '10 AM - 4 PM MYT', '1 PM - 8 PM', '24/7 panggil balik']
        };
      }
      if (q.id === 6) {
        return {
          ...q,
          question: 'Jabatan manakah yang perlu dimaklumkan dengan serta-merta jika timbul konflik kepentingan?',
          options: ['Pemasaran', 'Penyelia Langsung atau Jabatan HR', 'Meja Perkhidmatan IT', 'Fasiliti']
        };
      }
      if (q.id === 7) {
        return {
          ...q,
          question: 'Berapakah elaun pembelajaran & kesejahteraan profesional tahunan untuk setiap pekerja?',
          options: ['RM500', 'RM1,000', 'RM3,000', 'RM5,000']
        };
      }
      if (q.id === 8) {
        return {
          ...q,
          question: 'Bila resit perbelanjaan bulanan mesti dihantar untuk pemprosesan tuntutan?',
          options: ['1 hb setiap bulan', '15 hb setiap bulan', '25 hb setiap bulan', 'Akhir tahun']
        };
      }
      if (q.id === 12) {
        return {
          ...q,
          question: 'Manakah antara berikut yang paling tepat menerangkan dasar Red Point mengenai hadiah pelanggan?',
          options: [
            'Terima semua hadiah tanpa mengira nilai.',
            'Terima hadiah di bawah RM100 dengan pengisytiharan kepada HR.',
            'Tolak semua hadiah tanpa syarat.',
            'Hanya terima hadiah semasa musim perayaan.'
          ]
        };
      }
      return q;
    });
  }

  if (lang === 'zh') {
    return defaultQuestions.map((q) => {
      if (q.id === 1) {
        return {
          ...q,
          question: 'Red Point 的核心使命价值观是什么？',
          options: [
            '通过清晰度、诚信和结构化知识赋能员工',
            '最大化短期季度利润率',
            '消除所有内部文档',
            '强制要求每日 12 小时坐班'
          ]
        };
      }
      if (q.id === 2) {
        return {
          ...q,
          question: 'Red Point 的全职员工每年享有几天标准法定年假？',
          options: ['10 天', '14 天', '18 天', '25 天']
        };
      }
      if (q.id === 3) {
        return {
          ...q,
          question: '合规与手册测试要求的合格分数是多少？',
          options: ['50%', '60%', '65%（A级）', '90%']
        };
      }
      if (q.id === 4) {
        return {
          ...q,
          question: '如果员工未通过合规测试，补考前需要多少时间的冷静等待期？',
          options: ['无需等待', '1 小时', '12 小时', '24 小时']
        };
      }
      if (q.id === 5) {
        return {
          ...q,
          question: '混合办公模式下，工作日必须在岗的核心工作时间段是？',
          options: ['上午 8 点 - 中午 12 点', '上午 10 点 - 下午 4 点 (MYT)', '下午 1 点 - 晚上 8 点', '24小时随时待命']
        };
      }
      if (q.id === 6) {
        return {
          ...q,
          question: '如果发生潜在利益冲突，应立即通知哪个部门？',
          options: ['市场部', '直接主管或 HR 部门', 'IT 服务台', '物业设施部']
        };
      }
      if (q.id === 7) {
        return {
          ...q,
          question: '每名员工每年的专业学习与健康发展津贴是多少？',
          options: ['RM500', 'RM1,000', 'RM3,000', 'RM5,000']
        };
      }
      if (q.id === 8) {
        return {
          ...q,
          question: '每月费用报销凭证必须在何时前提交？',
          options: ['每月 1 日', '每月 15 日', '每月 25 日', '年底集中提交']
        };
      }
      if (q.id === 12) {
        return {
          ...q,
          question: '以下哪项最准确地描述了 Red Point 关于客户外界礼品的政策？',
          options: [
            '无论价值多少，接受所有礼品。',
            '接受价值低于 RM100 的礼品，但须向 HR 备案。',
            '无条件婉拒一切礼品。',
            '仅在开斋节或农历新年等节日期间接受礼品。'
          ]
        };
      }
      return q;
    });
  }

  return defaultQuestions;
}
