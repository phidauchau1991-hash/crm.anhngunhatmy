export const ROLES = {
  DIRECTOR: 'DIRECTOR',
  REGIONAL_MANAGER: 'REGIONAL_MANAGER',
  CHIEF_ACCOUNTANT: 'CHIEF_ACCOUNTANT',
  SALES_MANAGER: 'SALES_MANAGER',
  ACADEMIC_MANAGER: 'ACADEMIC_MANAGER',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CSKH: 'CSKH',
  ADVISOR: 'ADVISOR',
  TEACHER: 'TEACHER',
};

// Returns a prisma where clause for branch isolation
export function getBranchFilter(rolesStr, branchId, selectedBranch = null, domain = 'all') {
  if (!rolesStr) return { branchId }; // default to local if no role
  const roles = rolesStr.split(',');

  let isGlobal = false;

  // DIRECTOR and REGIONAL_MANAGER are global for EVERYTHING
  if (roles.includes(ROLES.DIRECTOR) || roles.includes(ROLES.REGIONAL_MANAGER)) {
    isGlobal = true;
  } 
  // Finance domain: CHIEF_ACCOUNTANT and SALES_MANAGER are global
  else if (domain === 'finance' && (roles.includes(ROLES.CHIEF_ACCOUNTANT) || roles.includes(ROLES.SALES_MANAGER))) {
    isGlobal = true;
  }
  // Academic domain: ACADEMIC_MANAGER is global
  else if (domain === 'academic' && roles.includes(ROLES.ACADEMIC_MANAGER)) {
    isGlobal = true;
  }

  if (isGlobal) {
    if (selectedBranch && selectedBranch !== 'ALL') {
      return { branchId: selectedBranch };
    }
    return {}; // No branch filter => access to all branches
  }

  // Fallback to local branch
  return { branchId: branchId || "CN1_BinhDuong" };
}
