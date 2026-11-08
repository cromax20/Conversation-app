-- CreateTable
CREATE TABLE "AiCache" (
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" JSONB,
    "bytes" BYTEA,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AiCache_kind_lastUsedAt_idx" ON "AiCache"("kind", "lastUsedAt");

