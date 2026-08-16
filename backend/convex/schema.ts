import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("company_admin"),
  v.literal("manager"),
  v.literal("operations"),
  v.literal("technician"),
  v.literal("customer"),
  v.literal("auditor"),
);

const jobStatus = v.union(
  v.literal("draft"),
  v.literal("scheduled"),
  v.literal("assigned"),
  v.literal("in_progress"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("delivered"),
  v.literal("accepted"),
  v.literal("closed"),
  v.literal("rejected"),
  v.literal("cancelled"),
);

export default defineSchema({
  users: defineTable({
    clerkSubject: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role,
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkSubject", ["clerkSubject"]),

  branches: defineTable({
    name: v.string(),
    code: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active_name", ["active", "name"])
    .index("by_code", ["code"]),

  memberships: defineTable({
    userId: v.id("users"),
    branchId: v.id("branches"),
    role,
    createdAt: v.number(),
  })
    .index("by_user_branch", ["userId", "branchId"])
    .index("by_branch_user", ["branchId", "userId"]),

  companySettings: defineTable({
    key: v.literal("singleton"),
    approvalPolicy: v.union(
      v.literal("manager_required"),
      v.literal("manager_and_customer"),
      v.literal("technician_direct"),
    ),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  customers: defineTable({
    branchId: v.id("branches"),
    name: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_branch_status_name", ["branchId", "status", "name"])
    .index("by_branch_updatedAt", ["branchId", "updatedAt"]),

  customerUsers: defineTable({
    customerId: v.id("customers"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user_customer", ["userId", "customerId"])
    .index("by_customer_user", ["customerId", "userId"]),

  sites: defineTable({
    customerId: v.id("customers"),
    branchId: v.id("branches"),
    name: v.string(),
    address: v.string(),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    accessNotes: v.optional(v.string()),
    riskNotes: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_customer_status", ["customerId", "status"])
    .index("by_branch_status", ["branchId", "status"]),

  chemicalProducts: defineTable({
    name: v.string(),
    activeIngredient: v.string(),
    unit: v.string(),
    safetyNotes: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active_name", ["active", "name"]),

  stockBalances: defineTable({
    branchId: v.id("branches"),
    productId: v.id("chemicalProducts"),
    quantity: v.number(),
    updatedAt: v.number(),
  })
    .index("by_branch_product", ["branchId", "productId"])
    .index("by_branch_updatedAt", ["branchId", "updatedAt"]),

  stockLedger: defineTable({
    branchId: v.id("branches"),
    productId: v.id("chemicalProducts"),
    jobId: v.optional(v.id("jobs")),
    submissionKey: v.optional(v.string()),
    type: v.union(v.literal("receipt"), v.literal("adjustment"), v.literal("consumption")),
    quantityDelta: v.number(),
    balanceAfter: v.number(),
    note: v.optional(v.string()),
    actorId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_branch_product_createdAt", ["branchId", "productId", "createdAt"])
    .index("by_job", ["jobId"])
    .index("by_submissionKey", ["submissionKey"]),

  checklistTemplates: defineTable({
    name: v.string(),
    version: v.number(),
    active: v.boolean(),
    items: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        required: v.boolean(),
        evidence: v.union(v.literal("none"), v.literal("before_photo"), v.literal("after_photo")),
      }),
    ),
    createdAt: v.number(),
  }).index("by_active_version", ["active", "version"]),

  jobs: defineTable({
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    siteId: v.id("sites"),
    assignedTechnicianId: v.optional(v.id("users")),
    checklistTemplateId: v.id("checklistTemplates"),
    status: jobStatus,
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    serviceType: v.string(),
    targetPest: v.string(),
    instructions: v.optional(v.string()),
    approvalPolicy: v.union(
      v.literal("manager_required"),
      v.literal("manager_and_customer"),
      v.literal("technician_direct"),
    ),
    snapshot: v.object({
      customerName: v.string(),
      siteName: v.string(),
      siteAddress: v.string(),
      checklistVersion: v.number(),
      checklistItems: v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          required: v.boolean(),
          evidence: v.union(v.literal("none"), v.literal("before_photo"), v.literal("after_photo")),
        }),
      ),
    }),
    revision: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_branch_scheduledStart", ["branchId", "scheduledStart"])
    .index("by_branch_status_scheduledStart", ["branchId", "status", "scheduledStart"])
    .index("by_technician_scheduledStart", ["assignedTechnicianId", "scheduledStart"])
    .index("by_technician_status_scheduledStart", ["assignedTechnicianId", "status", "scheduledStart"])
    .index("by_customer_scheduledStart", ["customerId", "scheduledStart"]),

  fieldSubmissions: defineTable({
    jobId: v.id("jobs"),
    submissionKey: v.string(),
    jobRevision: v.number(),
    submittedBy: v.id("users"),
    actualStart: v.number(),
    actualEnd: v.number(),
    method: v.string(),
    treatedAreas: v.array(v.string()),
    dosage: v.string(),
    durationMinutes: v.number(),
    observations: v.optional(v.string()),
    chemicalUsage: v.array(
      v.object({
        productId: v.id("chemicalProducts"),
        productName: v.string(),
        activeIngredient: v.string(),
        quantity: v.number(),
        unit: v.string(),
        batchNumber: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
      }),
    ),
    checklistAnswers: v.array(v.object({ key: v.string(), completed: v.boolean(), note: v.optional(v.string()) })),
    technicianSignature: v.string(),
    technicianSignerName: v.string(),
    customerSignature: v.optional(v.string()),
    customerSignerName: v.optional(v.string()),
    representativeAbsentReason: v.optional(v.string()),
    location: v.object({
      status: v.union(v.literal("captured"), v.literal("denied"), v.literal("unavailable"), v.literal("unsupported")),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      accuracy: v.optional(v.number()),
    }),
    submittedAt: v.number(),
  })
    .index("by_submissionKey", ["submissionKey"])
    .index("by_job_submittedAt", ["jobId", "submittedAt"]),

  evidenceFiles: defineTable({
    jobId: v.id("jobs"),
    submissionKey: v.string(),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("before"), v.literal("after"), v.literal("other")),
    mimeType: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_job_createdAt", ["jobId", "createdAt"])
    .index("by_submissionKey", ["submissionKey"])
    .index("by_storageId", ["storageId"]),

  evidenceUploadIntents: defineTable({
    uploadKey: v.string(),
    jobId: v.id("jobs"),
    branchId: v.id("branches"),
    submissionKey: v.string(),
    kind: v.union(v.literal("before"), v.literal("after"), v.literal("other")),
    mimeType: v.string(),
    size: v.number(),
    ownedBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  })
    .index("by_uploadKey", ["uploadKey"])
    .index("by_owner_job", ["ownedBy", "jobId"]),

  reports: defineTable({
    reportNumber: v.string(),
    jobId: v.id("jobs"),
    customerId: v.id("customers"),
    branchId: v.optional(v.id("branches")),
    fieldSubmissionId: v.id("fieldSubmissions"),
    version: v.number(),
    status: v.union(v.literal("approved"), v.literal("delivered"), v.literal("accepted")),
    snapshot: v.object({
      customerName: v.string(),
      siteName: v.string(),
      siteAddress: v.string(),
      serviceType: v.string(),
      targetPest: v.string(),
      actualStart: v.number(),
      actualEnd: v.number(),
      method: v.string(),
      treatedAreas: v.array(v.string()),
      dosage: v.optional(v.string()),
      durationMinutes: v.optional(v.number()),
      observations: v.optional(v.string()),
      checklistAnswers: v.optional(v.array(v.object({ key: v.string(), label: v.string(), completed: v.boolean(), note: v.optional(v.string()) }))),
      evidence: v.optional(v.array(v.object({ evidenceId: v.id("evidenceFiles"), kind: v.union(v.literal("before"), v.literal("after"), v.literal("other")), storageId: v.id("_storage"), mimeType: v.string(), size: v.number() }))),
      chemicalUsage: v.array(
        v.object({
          productName: v.string(),
          activeIngredient: v.string(),
          quantity: v.number(),
          unit: v.string(),
          batchNumber: v.optional(v.string()),
        }),
      ),
      technicianSignerName: v.string(),
      customerSignerName: v.optional(v.string()),
      technicianSignaturePresent: v.optional(v.boolean()),
      customerSignaturePresent: v.optional(v.boolean()),
      representativeAbsentReason: v.optional(v.string()),
      location: v.optional(v.object({
        status: v.union(v.literal("captured"), v.literal("denied"), v.literal("unavailable"), v.literal("unsupported")),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        accuracy: v.optional(v.number()),
      })),
      submittedAt: v.optional(v.number()),
    }),
    approvedBy: v.id("users"),
    approvedAt: v.number(),
    deliveredAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_reportNumber", ["reportNumber"])
    .index("by_job_version", ["jobId", "version"])
    .index("by_customer_approvedAt", ["customerId", "approvedAt"])
    .index("by_branch_approvedAt", ["branchId", "approvedAt"]),

  reportAcceptances: defineTable({
    reportId: v.id("reports"),
    acceptedBy: v.id("users"),
    signerName: v.string(),
    signature: v.string(),
    acceptedAt: v.number(),
  }).index("by_report", ["reportId"]),

  auditEvents: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actorId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_entity_createdAt", ["entityType", "entityId", "createdAt"])
    .index("by_actor_createdAt", ["actorId", "createdAt"])
    .index("by_branch_createdAt", ["branchId", "createdAt"]),
});
