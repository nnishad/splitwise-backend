-- CreateEnum
CREATE TYPE "public"."GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."InviteType" AS ENUM ('EMAIL', 'PHONE', 'LINK');

-- CreateEnum
CREATE TYPE "public"."RecurringPattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."SplitType" AS ENUM ('EQUAL', 'PERCENTAGE', 'AMOUNT', 'SHARES');

-- CreateEnum
CREATE TYPE "public"."ExpenseAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ARCHIVED', 'RESTORED', 'SPLIT_CHANGED', 'PAYER_CHANGED', 'CATEGORY_CHANGED', 'TAGS_CHANGED');

-- CreateEnum
CREATE TYPE "public"."SettlementStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SettlementType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "public"."SettlementAction" AS ENUM ('CREATED', 'UPDATED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReminderFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "preferredCurrency" TEXT,
    "maxMembers" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_invites" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "inviteType" "public"."InviteType" NOT NULL DEFAULT 'EMAIL',
    "inviteValue" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(10,6),
    "originalCurrency" TEXT,
    "convertedAmount" DECIMAL(10,2),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" "public"."RecurringPattern",
    "nextRecurringDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_splits" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "shares" INTEGER,
    "settledAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSettlementDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_payers" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_tags" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_comments" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT,
    "splitType" "public"."SplitType" NOT NULL,
    "splits" JSONB NOT NULL,
    "payers" JSONB NOT NULL,
    "tagNames" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" "public"."RecurringPattern",
    "nextRecurringDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_history" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "action" "public"."ExpenseAction" NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settlements" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(10,6),
    "originalCurrency" TEXT,
    "convertedAmount" DECIMAL(10,2),
    "notes" TEXT,
    "status" "public"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settlementType" "public"."SettlementType" NOT NULL DEFAULT 'FULL',
    "partialAmount" DECIMAL(10,2),
    "originalSplitId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."balance_reminder_settings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" "public"."ReminderFrequency" NOT NULL DEFAULT 'OFF',
    "lastReminderSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settlement_history" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "action" "public"."SettlementAction" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_archives" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "compressedData" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_exports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "exportType" TEXT NOT NULL,
    "filters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "audit_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "public"."user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "public"."group_members"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_invites_inviteCode_key" ON "public"."group_invites"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_splits_expenseId_userId_key" ON "public"."expense_splits"("expenseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_payers_expenseId_userId_key" ON "public"."expense_payers"("expenseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "public"."tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_tags_expenseId_tagId_key" ON "public"."expense_tags"("expenseId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_key" ON "public"."exchange_rates"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "balance_reminder_settings_groupId_userId_key" ON "public"."balance_reminder_settings"("groupId", "userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "public"."audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_groupId_createdAt_idx" ON "public"."audit_logs"("userId", "groupId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_groupId_createdAt_idx" ON "public"."audit_logs"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_archives_entityType_entityId_archivedAt_idx" ON "public"."audit_archives"("entityType", "entityId", "archivedAt");

-- CreateIndex
CREATE INDEX "audit_archives_groupId_archivedAt_idx" ON "public"."audit_archives"("groupId", "archivedAt");

-- CreateIndex
CREATE INDEX "audit_exports_userId_createdAt_idx" ON "public"."audit_exports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_exports_groupId_createdAt_idx" ON "public"."audit_exports"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_invites" ADD CONSTRAINT "group_invites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_invites" ADD CONSTRAINT "group_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_splits" ADD CONSTRAINT "expense_splits_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_splits" ADD CONSTRAINT "expense_splits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_payers" ADD CONSTRAINT "expense_payers_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_payers" ADD CONSTRAINT "expense_payers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_tags" ADD CONSTRAINT "expense_tags_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_tags" ADD CONSTRAINT "expense_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_comments" ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_comments" ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_templates" ADD CONSTRAINT "expense_templates_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_templates" ADD CONSTRAINT "expense_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_templates" ADD CONSTRAINT "expense_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_history" ADD CONSTRAINT "expense_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_history" ADD CONSTRAINT "expense_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_originalSplitId_fkey" FOREIGN KEY ("originalSplitId") REFERENCES "public"."expense_splits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."balance_reminder_settings" ADD CONSTRAINT "balance_reminder_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."balance_reminder_settings" ADD CONSTRAINT "balance_reminder_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlement_history" ADD CONSTRAINT "settlement_history_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_exports" ADD CONSTRAINT "audit_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_exports" ADD CONSTRAINT "audit_exports_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
