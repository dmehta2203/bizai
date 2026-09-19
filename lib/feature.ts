// ========================================
// BIZAI FEATURE ACCESS SYSTEM
// ========================================

// ========================================
// PLAN TYPES
// ========================================

export type PlanName =
  | "Starter"
  | "Professional"
  | "Business";


// ========================================
// FEATURE TYPES
// ========================================

export type FeatureName =

  // STARTER FEATURES

  | "customers"
  | "leads"
  | "appointments"
  | "tasks"
  | "followups"


  // PROFESSIONAL FEATURES

  | "sales"
  | "smart_insights"
  | "email"


  // BUSINESS FEATURES

  | "ai_assistant"
  | "whatsapp";


// ========================================
// FEATURE REQUIRED PLAN
// ========================================

export const FEATURE_PLANS: Record<
  FeatureName,
  PlanName
> = {

  // ======================================
  // STARTER PLAN
  // ======================================

  customers:
    "Starter",

  leads:
    "Starter",

  appointments:
    "Starter",

  tasks:
    "Starter",

  followups:
    "Starter",


  // ======================================
  // PROFESSIONAL PLAN
  // ======================================

  sales:
    "Professional",

  smart_insights:
    "Professional",

  email:
    "Professional",


  // ======================================
  // BUSINESS PLAN
  // ======================================

  ai_assistant:
    "Business",

  whatsapp:
    "Business",

};


// ========================================
// PLAN LEVELS
// ========================================

export const PLAN_LEVELS: Record<
  PlanName,
  number
> = {

  Starter:
    1,

  Professional:
    2,

  Business:
    3,

};


// ========================================
// GET REQUIRED PLAN
// ========================================

export function getRequiredPlan(
  feature: FeatureName
) {

  return FEATURE_PLANS[
    feature
  ];

}


// ========================================
// CHECK FEATURE ACCESS
// ========================================

export function checkFeatureAccess(
  userPlan:
    | PlanName
    | null,

  feature:
    FeatureName
) {

  // ======================================
  // NO SUBSCRIPTION
  // ======================================

  if (!userPlan) {

    return false;

  }


  // ======================================
  // GET REQUIRED PLAN
  // ======================================

  const requiredPlan =
    FEATURE_PLANS[
      feature
    ];


  // ======================================
  // GET USER PLAN LEVEL
  // ======================================

  const userPlanLevel =
    PLAN_LEVELS[
      userPlan
    ];


  // ======================================
  // GET REQUIRED PLAN LEVEL
  // ======================================

  const requiredPlanLevel =
    PLAN_LEVELS[
      requiredPlan
    ];


  // ======================================
  // CHECK ACCESS
  // ======================================

  return (
    userPlanLevel >=
    requiredPlanLevel
  );

}


// ========================================
// GET ALL AVAILABLE FEATURES
// ========================================

export function getPlanFeatures(
  plan:
    | PlanName
    | null
) {

  // ======================================
  // NO PLAN
  // ======================================

  if (!plan) {

    return [];

  }


  // ======================================
  // RETURN AVAILABLE FEATURES
  // ======================================

  return (
    Object.keys(
      FEATURE_PLANS
    ) as FeatureName[]
  ).filter(
    (feature) =>

      checkFeatureAccess(
        plan,
        feature
      )

  );

}