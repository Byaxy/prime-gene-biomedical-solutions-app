import { paymentMethodEnum, taxRatesTable, usersTable } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  PgColumn,
  pgEnum,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// A custom numeric type that parses to number
const numeric = customType<{ data: number; driverData: string }>({
  dataType() {
    return "numeric(12, 2)";
  },
  toDriver(value: number): string {
    return value.toString();
  },
  fromDriver(value: string): number {
    return parseFloat(value);
  },
});

// Chart of Accounts Structure
export const accountTypesTable = pgTable("account_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // Asset, Liability, Equity, Revenue, Expense
  isDebitBalance: boolean("is_debit_balance").notNull(), // True for Assets and Expenses
  systemDefined: boolean("system_defined").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountGroupsTable = pgTable("account_groups", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(),
  accountTypeId: uuid("account_type_id")
    .notNull()
    .references(() => accountTypesTable.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references(
    (): PgColumn => accountGroupsTable.id,
    { onDelete: "set null" }
  ),
  path: text("path"), // For hierarchical navigation
  depth: integer("depth").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountsTable = pgTable("accounts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  accountGroupId: uuid("account_group_id")
    .notNull()
    .references(() => accountGroupsTable.id, { onDelete: "cascade" }),
  description: text("description"),
  isBankAccount: boolean("is_bank_account").notNull().default(false),
  bankDetails: text("bank_details"), // JSON string for bank account details
  openingBalance: numeric("opening_balance").notNull().default(0),
  currentBalance: numeric("current_balance").notNull().default(0),
  isReconciled: boolean("is_reconciled").notNull().default(false),
  lastReconciledDate: timestamp("last_reconciled_date"),
  isSystemAccount: boolean("is_system_account").notNull().default(false), // For accounts that shouldn't be deleted
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fiscal Years and Periods
export const fiscalYearsTable = pgTable("fiscal_years", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fiscalPeriodsTable = pgTable("fiscal_periods", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fiscalYearId: uuid("fiscal_year_id")
    .notNull()
    .references(() => fiscalYearsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "January 2025"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Journal Entries
export const journalEntryStatusEnum = pgEnum("journal_entry_status", [
  "draft",
  "posted",
  "voided",
]);

export const journalEntriesTable = pgTable("journal_entries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: timestamp("entry_date").notNull(),
  fiscalPeriodId: uuid("fiscal_period_id")
    .notNull()
    .references(() => fiscalPeriodsTable.id, { onDelete: "restrict" }),
  reference: text("reference"), // Reference to source document if applicable
  referenceType: text("reference_type"), // Type of reference (e.g., "sale", "purchase", "payroll")
  referenceId: uuid("reference_id"), // ID of the reference document
  memo: text("memo"),
  status: journalEntryStatusEnum("status").notNull().default("draft"),
  totalDebit: numeric("total_debit").notNull().default(0),
  totalCredit: numeric("total_credit").notNull().default(0),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }),
  isRecurring: boolean("is_recurring").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const journalEntryLinesTable = pgTable("journal_entry_lines", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => journalEntriesTable.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "restrict" }),
  description: text("description"),
  debitAmount: numeric("debit_amount").notNull().default(0),
  creditAmount: numeric("credit_amount").notNull().default(0),
  taxRateId: uuid("tax_rate_id").references(() => taxRatesTable.id, {
    onDelete: "set null",
  }),
  taxAmount: numeric("tax_amount").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recurring Templates
export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export const recurringTemplatesTable = pgTable("recurring_templates", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(), // journal_entry, expense, etc.
  frequency: recurringFrequencyEnum("frequency").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // Optional end date
  nextRunDate: timestamp("next_run_date"),
  jsonData: text("json_data").notNull(), // Store template data as JSON
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank Transactions and Reconciliation
export const bankTransactionTypeEnum = pgEnum("bank_transaction_type", [
  "deposit",
  "withdrawal",
  "transfer",
  "interest",
  "fee",
  "other",
]);

export const bankTransactionsTable = pgTable("bank_transactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  transactionDate: timestamp("transaction_date").notNull(),
  valueDate: timestamp("value_date"),
  amount: numeric("amount").notNull(),
  description: text("description"),
  reference: text("reference"),
  transactionType: bankTransactionTypeEnum("transaction_type").notNull(),
  journalEntryId: uuid("journal_entry_id").references(
    () => journalEntriesTable.id,
    { onDelete: "set null" }
  ),
  isReconciled: boolean("is_reconciled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bankReconciliationsTable = pgTable("bank_reconciliations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  statementDate: timestamp("statement_date").notNull(),
  statementBalance: numeric("statement_balance").notNull(),
  startingBalance: numeric("starting_balance").notNull(),
  endingBalance: numeric("ending_balance").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedDate: timestamp("completed_date"),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }),
  memo: text("memo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Financial Reports Definitions
export const reportTypesTable = pgTable("report_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportDefinitionsTable = pgTable("report_definitions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  reportTypeId: uuid("report_type_id")
    .notNull()
    .references(() => reportTypesTable.id, { onDelete: "cascade" }),
  description: text("description"),
  jsonDefinition: text("json_definition").notNull(), // Store report structure as JSON
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HR Module Enhancements

// Employment Related Enums
export const employmentStatusEnum = pgEnum("employment_status", [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "probation",
  "terminated",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "permanent",
  "temporary",
  "seasonal",
  "project_based",
]);

export const salaryTypeEnum = pgEnum("salary_type", [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "annual",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "calculated",
  "approved",
  "paid",
  "cancelled",
]);

// Departments and Job Positions
export const departmentsTable = pgTable("departments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  managerId: uuid("manager_id").references(() => employeesTable.id, {
    onDelete: "set null",
  }),
  parentDepartmentId: uuid("parent_department_id").references(
    (): PgColumn => departmentsTable.id,
    { onDelete: "set null" }
  ),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobPositionsTable = pgTable("job_positions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  code: text("code").notNull(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "cascade" }),
  description: text("description"),
  minSalary: numeric("min_salary"),
  maxSalary: numeric("max_salary"),
  isManagement: boolean("is_management").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced Employees Table
export const employeesTable = pgTable("employees", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").notNull().unique(), // Employee number/code
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  nationalId: text("national_id"),
  passportNumber: text("passport_number"),
  email: text("email").notNull(),
  personalEmail: text("personal_email"),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  jobPositionId: uuid("job_position_id")
    .notNull()
    .references((): PgColumn => jobPositionsTable.id, { onDelete: "restrict" }),
  departmentId: uuid("department_id")
    .notNull()
    .references((): PgColumn => departmentsTable.id, { onDelete: "restrict" }),
  managerId: uuid("manager_id").references((): PgColumn => employeesTable.id, {
    onDelete: "set null",
  }),
  hireDate: timestamp("hire_date").notNull(),
  probationEndDate: timestamp("probation_end_date"),
  terminationDate: timestamp("termination_date"),
  employmentStatus: employmentStatusEnum("employment_status")
    .notNull()
    .default("probation"),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  profileImageId: text("profile_image_id"),
  profileImageUrl: text("profile_image_url"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  bankRoutingNumber: text("bank_routing_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employment History
export const employmentHistoryTable = pgTable("employment_history", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  jobPositionId: uuid("job_position_id")
    .notNull()
    .references(() => jobPositionsTable.id, { onDelete: "restrict" }),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "restrict" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  employmentStatus: employmentStatusEnum("employment_status").notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Salary and Compensation
export const salaryStructuresTable = pgTable("salary_structures", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaryComponentsTable = pgTable("salary_components", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // earnings, deductions, etc.
  code: text("code").notNull().unique(),
  description: text("description"),
  taxable: boolean("taxable").notNull().default(false),
  calculateInPercentage: boolean("calculate_in_percentage")
    .notNull()
    .default(false),
  percentageOf: text("percentage_of"), // base, gross, etc.
  accountId: uuid("account_id").references(() => accountsTable.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSalariesTable = pgTable("employee_salaries", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  salaryStructureId: uuid("salary_structure_id")
    .notNull()
    .references(() => salaryStructuresTable.id, { onDelete: "restrict" }),
  baseSalary: numeric("base_salary").notNull(),
  salaryType: salaryTypeEnum("salary_type").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSalaryComponentsTable = pgTable(
  "employee_salary_components",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    employeeSalaryId: uuid("employee_salary_id")
      .notNull()
      .references(() => employeeSalariesTable.id, { onDelete: "cascade" }),
    salaryComponentId: uuid("salary_component_id")
      .notNull()
      .references(() => salaryComponentsTable.id, { onDelete: "cascade" }),
    amount: numeric("amount"),
    percentage: numeric("percentage"),
    formula: text("formula"), // For complex calculations
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// Attendance and Time Tracking
export const attendanceTypeEnum = pgEnum("attendance_type", [
  "present",
  "absent",
  "half_day",
  "work_from_home",
  "on_leave",
  "holiday",
]);

export const attendanceTable = pgTable("attendance", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  attendanceDate: timestamp("attendance_date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  attendanceType: attendanceTypeEnum("attendance_type").notNull(),
  workHours: numeric("work_hours"),
  overtime: numeric("overtime"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Work Schedules
export const workSchedulesTable = pgTable("work_schedules", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduleDetailsTable = pgTable("schedule_details", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  workScheduleId: uuid("work_schedule_id")
    .notNull()
    .references(() => workSchedulesTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  isWorkday: boolean("is_workday").notNull().default(true),
  startTime: text("start_time"), // Format: HH:MM
  endTime: text("end_time"), // Format: HH:MM
  breakStartTime: text("break_start_time"),
  breakEndTime: text("break_end_time"),
  workHours: numeric("work_hours").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSchedulesTable = pgTable("employee_schedules", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  workScheduleId: uuid("work_schedule_id")
    .notNull()
    .references(() => workSchedulesTable.id, { onDelete: "cascade" }),
  effectiveDate: timestamp("effective_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leave Management
export const leaveTypesTable = pgTable("leave_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  allowedDays: numeric("allowed_days").notNull(),
  isPaid: boolean("is_paid").notNull().default(true),
  isCarryForward: boolean("is_carry_forward").notNull().default(false),
  maxCarryForwardDays: numeric("max_carry_forward_days"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveBalancesTable = pgTable("leave_balances", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  leaveTypeId: uuid("leave_type_id")
    .notNull()
    .references(() => leaveTypesTable.id, { onDelete: "cascade" }),
  fiscalYearId: uuid("fiscal_year_id")
    .notNull()
    .references(() => fiscalYearsTable.id, { onDelete: "cascade" }),
  totalEntitlement: numeric("total_entitlement").notNull(),
  usedLeaves: numeric("used_leaves").notNull().default(0),
  pendingLeaves: numeric("pending_leaves").notNull().default(0),
  carriedForward: numeric("carried_forward").notNull().default(0),
  remainingBalance: numeric("remaining_balance").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveRequestsTable = pgTable("leave_requests", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  leaveTypeId: uuid("leave_type_id")
    .notNull()
    .references(() => leaveTypesTable.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: numeric("total_days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedById: uuid("approved_by_id").references(() => employeesTable.id, {
    onDelete: "set null",
  }),
  approvedDate: timestamp("approved_date"),
  rejectionReason: text("rejection_reason"),
  attachmentId: text("attachment_id"),
  attachmentUrl: text("attachment_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payroll
export const payrollPeriodsTable = pgTable("payroll_periods", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
  fiscalYearId: uuid("fiscal_year_id")
    .notNull()
    .references(() => fiscalYearsTable.id, { onDelete: "cascade" }),
  fiscalPeriodId: uuid("fiscal_period_id")
    .notNull()
    .references(() => fiscalPeriodsTable.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payrollRunsTable = pgTable("payroll_runs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  payrollPeriodId: uuid("payroll_period_id")
    .notNull()
    .references(() => payrollPeriodsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  runDate: timestamp("run_date")
    .notNull()
    .default(sql`now()`),
  status: payrollStatusEnum("status").notNull().default("draft"),
  processedBy: uuid("processed_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }),
  approvedBy: uuid("approved_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  approvedDate: timestamp("approved_date"),
  totalEmployees: integer("total_employees").notNull(),
  totalGrossSalary: numeric("total_gross_salary").notNull(),
  totalDeductions: numeric("total_deductions").notNull(),
  totalNetSalary: numeric("total_net_salary").notNull(),
  journalEntryId: uuid("journal_entry_id").references(
    () => journalEntriesTable.id,
    { onDelete: "set null" }
  ),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payslipsTable = pgTable("payslips", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  payrollRunId: uuid("payroll_run_id")
    .notNull()
    .references(() => payrollRunsTable.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  payslipNumber: text("payslip_number").notNull().unique(),
  baseSalary: numeric("base_salary").notNull(),
  grossSalary: numeric("gross_salary").notNull(),
  totalDeductions: numeric("total_deductions").notNull(),
  netSalary: numeric("net_salary").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("bank"),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentDate: timestamp("payment_date"),
  bankTransactionId: uuid("bank_transaction_id").references(
    () => bankTransactionsTable.id,
    { onDelete: "set null" }
  ),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recruitment
export const jobOpeningsTable = pgTable("job_openings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  jobPositionId: uuid("job_position_id")
    .notNull()
    .references(() => jobPositionsTable.id, { onDelete: "restrict" }),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departmentsTable.id, { onDelete: "restrict" }),
  description: text("description"),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  status: text("status").notNull().default("draft"), // draft, open, closed, cancelled
  openingDate: timestamp("opening_date").notNull(),
  closingDate: timestamp("closing_date"),
  expectedHires: integer("expected_hires"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobApplicantsTable = pgTable("job_applicants", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jobOpeningId: uuid("job_opening_id")
    .notNull()
    .references(() => jobOpeningsTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  resumeId: text("resume_id"),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("applied"), // applied, under_review, interview_scheduled, rejected, hired
  source: text("source"), // How they found the job
  currentCompany: text("current_company"),
  currentJobTitle: text("current_job_title"),
  expectedSalary: numeric("expected_salary"),
  noticePeriod: text("notice_period"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviewsTable = pgTable("interviews", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jobApplicantId: uuid("job_applicant_id")
    .notNull()
    .references(() => jobApplicantsTable.id, { onDelete: "cascade" }),
  scheduledDate: timestamp("scheduled_date").notNull(),
  interviewType: text("interview_type").notNull(), // phone, video, in-person
  interviewers: text("interviewers"), // Comma-separated list of interviewer IDs
  feedback: text("feedback"),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  rating: integer("rating"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training & Development
export const trainingProgramsTable = pgTable("training_programs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  duration: text("duration"), // e.g., "2 weeks", "3 months"
  trainer: text("trainer"),
  location: text("location"),
  cost: numeric("cost").default(0),
  status: text("status").notNull().default("planned"), // planned, in_progress, completed, cancelled
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeTrainingTable = pgTable("employee_training", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  trainingProgramId: uuid("training_program_id")
    .notNull()
    .references(() => trainingProgramsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("registered"), // registered, in_progress, completed, dropped
  completionDate: timestamp("completion_date"),
  feedback: text("feedback"),
  score: numeric("score"),
  certificateId: text("certificate_id"),
  certificateUrl: text("certificate_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const skillsTable = pgTable("skills", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSkillsTable = pgTable("employee_skills", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skillsTable.id, { onDelete: "cascade" }),
  proficiency: text("proficiency").notNull(), // beginner, intermediate, advanced, expert
  yearsOfExperience: numeric("years_of_experience"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Performance Management
export const performanceCyclesTable = pgTable("performance_cycles", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, completed
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const performanceReviewsTable = pgTable("performance_reviews", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "restrict" }),
  performanceCycleId: uuid("performance_cycle_id")
    .notNull()
    .references(() => performanceCyclesTable.id, { onDelete: "cascade" }),
  reviewDate: timestamp("review_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed
  overallRating: numeric("overall_rating"),
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  comments: text("comments"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const performanceGoalsTable = pgTable("performance_goals", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  targetValue: text("target_value"),
  currentValue: text("current_value"),
  progress: numeric("progress").default(0),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed, cancelled
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee Benefits
export const benefitTypesTable = pgTable("benefit_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isTaxable: boolean("is_taxable").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const benefitPlansTable = pgTable("benefit_plans", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  benefitTypeId: uuid("benefit_type_id")
    .notNull()
    .references(() => benefitTypesTable.id, { onDelete: "restrict" }),
  description: text("description"),
  costToCompany: numeric("cost_to_company").default(0),
  employeeContribution: numeric("employee_contribution").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeBenefitsTable = pgTable("employee_benefits", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  benefitPlanId: uuid("benefit_plan_id")
    .notNull()
    .references(() => benefitPlansTable.id, { onDelete: "restrict" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  amount: numeric("amount").default(0),
  status: text("status").notNull().default("active"), // active, cancelled, suspended
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee Documents
export const documentTypesTable = pgTable("document_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeDocumentsTable = pgTable("employee_documents", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  documentTypeId: uuid("document_type_id")
    .notNull()
    .references(() => documentTypesTable.id, { onDelete: "restrict" }),
  documentId: text("document_id").notNull(),
  documentUrl: text("document_url").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedBy: uuid("verified_by").references(() => employeesTable.id, {
    onDelete: "set null",
  }),
  verifiedDate: timestamp("verified_date"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Grievances & Disciplinary Actions
export const grievanceTypesTable = pgTable("grievance_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  severity: text("severity").notNull(), // low, medium, high, critical
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeGrievancesTable = pgTable("employee_grievances", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  grievanceTypeId: uuid("grievance_type_id")
    .notNull()
    .references(() => grievanceTypesTable.id, { onDelete: "restrict" }),
  reportedDate: timestamp("reported_date").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, investigating, resolved, closed
  resolution: text("resolution"),
  resolvedDate: timestamp("resolved_date"),
  resolvedBy: uuid("resolved_by").references(() => employeesTable.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const disciplinaryActionTypesTable = pgTable(
  "disciplinary_action_types",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    severity: text("severity").notNull(), // warning, reprimand, suspension, termination
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const disciplinaryActionsTable = pgTable("disciplinary_actions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  actionTypeId: uuid("action_type_id")
    .notNull()
    .references(() => disciplinaryActionTypesTable.id, {
      onDelete: "restrict",
    }),
  issuedDate: timestamp("issued_date").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  endDate: timestamp("end_date"),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("active"), // active, expired, cancelled
  issuedBy: uuid("issued_by")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "restrict" }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exit Management
export const exitTypesTable = pgTable("exit_types", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exitReasonsTable = pgTable("exit_reasons", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeExitsTable = pgTable("employee_exits", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  exitTypeId: uuid("exit_type_id")
    .notNull()
    .references(() => exitTypesTable.id, { onDelete: "restrict" }),
  exitReasonId: uuid("exit_reason_id").references(() => exitReasonsTable.id, {
    onDelete: "set null",
  }),
  resignationDate: timestamp("resignation_date"),
  lastWorkingDate: timestamp("last_working_date").notNull(),
  noticePeriod: text("notice_period"),
  status: text("status").notNull().default("initiated"), // initiated, in_progress, completed
  exitInterviewDate: timestamp("exit_interview_date"),
  exitInterviewNotes: text("exit_interview_notes"),
  feedback: text("feedback"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exitChecklistTable = pgTable("exit_checklist", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  employeeExitId: uuid("employee_exit_id")
    .notNull()
    .references(() => employeeExitsTable.id, { onDelete: "cascade" }),
  task: text("task").notNull(),
  assignedTo: uuid("assigned_to").references(() => employeesTable.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
