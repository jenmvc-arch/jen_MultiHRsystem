import { HandbookModule, QuizQuestion, EmployeeRecord, UserProfile } from './types';
import { OFFICIAL_HANDBOOK_MODULES } from './data/fullHandbookData';
import { OFFICIAL_QUIZ_QUESTIONS } from './data/quizData';

export const INITIAL_USER: UserProfile = {
  id: 'EMP-1234',
  name: 'Sarah Lin',
  email: 'sarah.lin@redpoint.com.my',
  role: 'employee',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCQezdY_FdXSHas0RCxHwijlToTaoUmZ5ddh_Z-s2C8GbqUwTxTO4NrBSFd5aYqSbWoeD5uffALZv5SmOk2uqZ4VvlsRhEYmFx6HUZ7kjrNcW7hJ5b5O0X6_ragOwL9hmuv_G6mZ4OmCleemyH0CzsIgO06ZbY4KxMXuYlMvJJ3lZgJLfauE34FoEdXSSgPNbVDvDV5Ozmmv8Gjhks-7L_YCFEqwu3O86PEy-9KZq2a6vIW0ujgNWN2QgpW5k5IIOvKAk5y0yQUbg',
  department: 'Product Design',
  joinDate: 'Oct 24, 2024',
};

export const HANDBOOK_MODULES: HandbookModule[] = OFFICIAL_HANDBOOK_MODULES;

export const QUIZ_QUESTIONS: QuizQuestion[] = OFFICIAL_QUIZ_QUESTIONS;

export const EMPLOYEE_ROSTER: EmployeeRecord[] = [];
