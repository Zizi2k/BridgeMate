import {mysqlTable,varchar,text,mediumtext,int,bigint,uniqueIndex,index,primaryKey,json} from 'drizzle-orm/mysql-core';
const id=(name='id')=>varchar(name,{length:36});
const iso=(name:string)=>varchar(name,{length:32});
export const users=mysqlTable('users',{id:id().primaryKey(),name:varchar('name',{length:80}).notNull(),email:varchar('email',{length:254}).notNull().unique(),password:varchar('password',{length:255}).notNull(),demo:int('demo').notNull().default(0),mustChangePassword:int('must_change_password').notNull().default(0)});
export const sessions=mysqlTable('sessions',{id:varchar('id',{length:64}).primaryKey(),userId:id('user_id').notNull().references(()=>users.id),expires:bigint('expires',{mode:'number'}).notNull()},t=>[index('sessions_user_index').on(t.userId),index('sessions_expiry_index').on(t.expires)]);
export const teams=mysqlTable('teams',{id:id().primaryKey(),name:varchar('name',{length:80}).notNull(),description:text('description').notNull(),website:varchar('website',{length:2048}).notNull().default(''),ownerId:id('owner_id').notNull().references(()=>users.id),leaderId:id('leader_id').references(()=>users.id),deleted:int('deleted').notNull().default(0),invite:varchar('invite',{length:32}).notNull().unique()});
export const members=mysqlTable('members',{id:id().primaryKey(),teamId:id('team_id').notNull().references(()=>teams.id),userId:id('user_id').notNull().references(()=>users.id),role:varchar('role',{length:16}).notNull()},t=>[uniqueIndex('members_team_user_unique').on(t.teamId,t.userId)]);
export const tasks=mysqlTable('tasks',{id:id().primaryKey(),teamId:id('team_id').notNull().references(()=>teams.id),title:varchar('title',{length:160}).notNull(),description:text('description').notNull(),deliverable:text('deliverable').notNull(),assigneeId:id('assignee_id').notNull().references(()=>users.id),createdBy:id('created_by').notNull().references(()=>users.id),dueAt:iso('due_at').notNull(),priority:varchar('priority',{length:16}).notNull(),status:varchar('status',{length:16}).notNull(),deleted:int('deleted').notNull().default(0),version:int('version').notNull().default(1),createdAt:iso('created_at').notNull()});
export const understandings=mysqlTable('understandings',{id:id().primaryKey(),taskId:id('task_id').notNull().references(()=>tasks.id),taskVersion:int('task_version').notNull(),authorId:id('author_id').notNull().references(()=>users.id),content:text('content').notNull(),status:varchar('status',{length:16}).notNull(),feedback:text('feedback').notNull(),createdAt:iso('created_at').notNull()});
export const comments=mysqlTable('comments',{id:id().primaryKey(),taskId:id('task_id').notNull().references(()=>tasks.id),authorId:id('author_id').notNull().references(()=>users.id),content:text('content').notNull(),createdAt:iso('created_at').notNull()});
export const attempts=mysqlTable('attempts',{id:id().primaryKey(),userId:id('user_id').notNull().references(()=>users.id),score:int('score').notNull(),answers:text('answers').notNull(),createdAt:iso('created_at').notNull()});
export const aiUsage=mysqlTable('ai_usage',{id:varchar('id',{length:96}).primaryKey(),userId:id('user_id').notNull().references(()=>users.id),requests:int('requests').notNull().default(0),expires:bigint('expires',{mode:'number'}).notNull()},t=>[index('ai_usage_expiry_index').on(t.expires)]);

export const profiles=mysqlTable('profiles',{userId:id('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),bio:text('bio').notNull(),interests:text('interests').notNull(),slogan:varchar('slogan',{length:180}).notNull(),socials:text('socials').notNull(),avatar:mediumtext('avatar').notNull(),updatedAt:iso('updated_at').notNull()});

export const phraseEntries=mysqlTable('phrase_entries',{id:varchar('id',{length:64}).notNull(),userId:id('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),category:varchar('category',{length:32}).notNull(),en:text('en').notNull(),vi:text('vi').notNull(),deleted:int('deleted').notNull().default(0),updatedAt:iso('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);

export const practiceEntries=mysqlTable('practice_entries',{id:varchar('id',{length:64}).notNull(),userId:id('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),content:text('content').notNull(),deleted:int('deleted').notNull().default(0),updatedAt:iso('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);

export const leaderVotes=mysqlTable('leader_votes',{teamId:id('team_id').notNull().references(()=>teams.id,{onDelete:'cascade'}),voterId:id('voter_id').notNull().references(()=>users.id),candidateId:id('candidate_id').notNull().references(()=>users.id)},t=>[primaryKey({columns:[t.teamId,t.voterId]})]);
export const taskCollaborators=mysqlTable('task_collaborators',{taskId:id('task_id').notNull().references(()=>tasks.id,{onDelete:'cascade'}),userId:id('user_id').notNull().references(()=>users.id)},t=>[primaryKey({columns:[t.taskId,t.userId]})]);
export const subtasks=mysqlTable('subtasks',{id:id().primaryKey(),taskId:id('task_id').notNull().references(()=>tasks.id,{onDelete:'cascade'}),title:varchar('title',{length:160}).notNull(),description:text('description').notNull(),assigneeId:id('assignee_id').notNull().references(()=>users.id),dueAt:iso('due_at').notNull().default(''),status:varchar('status',{length:16}).notNull().default('todo'),deleted:int('deleted').notNull().default(0),createdAt:iso('created_at').notNull()},t=>[index('subtasks_task_index').on(t.taskId)]);

export const taskCompletions=mysqlTable('task_completions',{taskId:id('task_id').primaryKey().references(()=>tasks.id,{onDelete:'cascade'}),teamId:id('team_id').notNull().references(()=>teams.id,{onDelete:'cascade'}),recipients:text('recipients').notNull(),completedAt:iso('completed_at').notNull()},t=>[index('task_completions_team_index').on(t.teamId)]);

export const personalEntries=mysqlTable('personal_entries',{
 id:id().primaryKey(),
 userId:id('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 kind:varchar('kind',{length:8}).notNull(),
 data:json('data').notNull(),
},t=>[index('personal_entries_owner_kind').on(t.userId,t.kind)]);

export const accountAccess=mysqlTable('account_access',{
 userId:id('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),
 suspended:int('suspended').notNull().default(0),
});

export const payrollEntries=mysqlTable('payroll_entries',{
 id:id().primaryKey(),scopeId:varchar('scope_id',{length:48}).notNull(),data:json('data').notNull(),
},t=>[index('payroll_scope_idx').on(t.scopeId)]);

export const moduleApprovals=mysqlTable('module_approvals',{
 userId:id('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 module:varchar('module',{length:24}).notNull(),status:varchar('status',{length:12}).notNull(),
},t=>[primaryKey({columns:[t.userId,t.module]})]);
export const printSettings=mysqlTable('print_settings',{id:id().primaryKey(),data:json('data').notNull()});
export const removedAccounts=mysqlTable('removed_accounts',{
 userId:id('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),
});

export const aptisChallenges=mysqlTable('aptis_challenges',{
 sessionId:varchar('session_id',{length:64}).primaryKey().references(()=>sessions.id,{onDelete:'cascade'}),
 data:json('data').notNull(),
});

export const employeeAssignments=mysqlTable('employee_assignments',{
 userId:id('user_id').primaryKey().references(()=>users.id),
 code:varchar('code',{length:32}).notNull().unique(),name:varchar('name',{length:120}).notNull(),
 rate:bigint('rate',{mode:'number'}).notNull().default(0),manager:int('manager').notNull().default(0),
});
export const attendanceEntries=mysqlTable('attendance_entries',{
 id:id().primaryKey(),userId:id('user_id').notNull().references(()=>users.id),
 day:varchar('day',{length:10}).notNull(),start:iso('start').notNull(),end:iso('end'),
 breakMinutes:int('break_minutes').notNull().default(0),
 supplemented:int('supplemented').notNull().default(0),
 editable:int('editable').notNull().default(0),reason:text('reason').notNull(),
 updatedBy:id('updated_by').notNull(),updatedAt:iso('updated_at').notNull(),
},t=>[uniqueIndex('attendance_user_day').on(t.userId,t.day)]);
export const attendanceAudit=mysqlTable('attendance_audit',{
 id:id().primaryKey(),entryId:id('entry_id').notNull(),actorId:id('actor_id').notNull(),
 data:json('data').notNull(),createdAt:iso('created_at').notNull(),
});

export const departments=mysqlTable('departments',{
 id:id().primaryKey(),name:varchar('name',{length:120}).notNull().unique(),active:int('active').notNull().default(1),
});
export const accountDepartments=mysqlTable('account_departments',{
 userId:id('user_id').primaryKey().references(()=>users.id),departmentId:id('department_id').notNull().references(()=>departments.id),
 status:varchar('status',{length:12}).notNull(),
},t=>[index('account_department_idx').on(t.departmentId,t.status)]);
export const attendancePhotos=mysqlTable('attendance_photos',{
 id:id().primaryKey(),entryId:id('entry_id').notNull().references(()=>attendanceEntries.id,{onDelete:'cascade'}),
 name:varchar('name',{length:180}).notNull(),mime:varchar('mime',{length:120}).notNull(),data:mediumtext('data').notNull(),
 createdAt:iso('created_at').notNull(),expiresAt:iso('expires_at').notNull(),
},t=>[index('attendance_photos_expiry').on(t.expiresAt),index('attendance_photos_entry').on(t.entryId)]);
export const evidenceChangeRequests=mysqlTable('evidence_change_requests',{
 photoId:id('photo_id').primaryKey().references(()=>attendancePhotos.id,{onDelete:'cascade'}),
 reason:text('reason').notNull(),requestedBy:id('requested_by').notNull(),requestedAt:iso('requested_at').notNull(),
 status:varchar('status',{length:12}).notNull(),resolvedAt:iso('resolved_at'),
});

export const salaryPayments=mysqlTable('salary_payments',{
 id:id().primaryKey(),batchId:id('batch_id').notNull(),requestHash:varchar('request_hash',{length:64}).notNull(),
 recipientId:id('recipient_id').notNull().references(()=>users.id),departmentId:varchar('department_id',{length:36}).notNull(),period:varchar('period',{length:7}).notNull(),
 kind:varchar('kind',{length:12}).notNull(),amount:bigint('amount',{mode:'number'}).notNull(),paidAt:varchar('paid_at',{length:10}).notNull(),note:text('note').notNull(),metadata:json('metadata').notNull(),
 createdBy:id('created_by').notNull(),createdAt:iso('created_at').notNull(),voided:int('voided').notNull().default(0),voidReason:text('void_reason'),voidedBy:id('voided_by'),voidedAt:iso('voided_at'),
},t=>[index('salary_payments_scope').on(t.recipientId,t.departmentId,t.period),index('salary_payments_batch').on(t.batchId)]);
export const salaryPaymentBatches=mysqlTable('salary_payment_batches',{
 id:id().primaryKey(),requestHash:varchar('request_hash',{length:64}).notNull(),recipientId:id('recipient_id').notNull(),departmentId:varchar('department_id',{length:36}).notNull(),createdBy:id('created_by').notNull(),createdAt:iso('created_at').notNull(),
});

export const attendanceNotifications=mysqlTable('attendance_notifications',{
 id:varchar('id',{length:64}).primaryKey(),entryId:id('entry_id').notNull(),recipientId:id('recipient_id').notNull(),email:varchar('email',{length:254}).notNull(),payload:json('payload').notNull(),
 status:varchar('status',{length:16}).notNull().default('pending'),attempts:int('attempts').notNull().default(0),firstAttemptAt:iso('first_attempt_at'),createdAt:iso('created_at').notNull(),sentAt:iso('sent_at'),readAt:iso('read_at'),lastError:varchar('last_error',{length:80}).notNull().default(''),
},t=>[index('attendance_notification_status').on(t.status,t.createdAt)]);

export const passwordRecovery=mysqlTable('password_recovery',{
 userId:id('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),status:varchar('status',{length:16}).notNull(),requestedAt:iso('requested_at').notNull(),reviewedAt:iso('reviewed_at'),reviewedBy:id('reviewed_by'),
});
