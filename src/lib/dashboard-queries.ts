import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ProjectDashboardData, 
  DashboardMetrics, 
  SpendByVendor, 
  SpendByMaterialGroup,
  SpendTrend,
  BudgetBreakdown
} from '@/types/dashboard';

export async function getDashboardData(
  projectId: string, 
  userId: string
): Promise<ProjectDashboardData> {
  // Verify user has access to this project
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  if (!projectDoc.exists() || projectDoc.data().userId !== userId) {
    throw new Error('Project not found or access denied');
  }

  const projectData = projectDoc.data();
  
  // Get all the dashboard data in parallel
  const [
    metrics,
    spendByVendor,
    spendByMaterialGroup,
    spendTrend,
    budgetBreakdown
  ] = await Promise.all([
    getDashboardMetrics(projectId, userId),
    getSpendByVendor(projectId, userId),
    getSpendByMaterialGroup(projectId, userId),
    getSpendTrend(projectId, userId),
    getBudgetBreakdown(projectId, userId, projectData.budget || 0)
  ]);

  return {
    projectId,
    projectName: projectData.name,
    lastUpdated: new Date(),
    metrics,
    spendByVendor,
    spendByMaterialGroup,
    spendTrend,
    budgetBreakdown
  };
}

async function getDashboardMetrics(
  projectId: string, 
  userId: string
): Promise<DashboardMetrics> {
  // Get total spend from purchase orders
  const poQuery = query(
    collection(db, 'purchaseOrders'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );
  const poSnapshot = await getDocs(poQuery);
  
  let totalSpend = 0;
  let openPurchaseOrders = 0;
  
  poSnapshot.docs.forEach(doc => {
    const po = doc.data();
    totalSpend += po.total || 0;
    if (['draft', 'sent', 'acknowledged', 'partially_received'].includes(po.status)) {
      openPurchaseOrders++;
    }
  });

  // Get budget amount from project
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  const budgetAmount = projectDoc.data()?.budget || 0;
  const budgetUtilization = budgetAmount > 0 ? (totalSpend / budgetAmount) * 100 : 0;

  // Get open requisitions count
  const reqQuery = query(
    collection(db, 'requisitions'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    where('status', 'in', ['draft', 'pending', 'approved'])
  );
  const reqSnapshot = await getDocs(reqQuery);
  const openRequisitions = reqSnapshot.size;

  // Get shipments in transit count
  const shipmentQuery = query(
    collection(db, 'shipments'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'in_transit'])
  );
  const shipmentSnapshot = await getDocs(shipmentQuery);
  const shipmentsInTransit = shipmentSnapshot.size;

  // Get open issues count
  const issueQuery = query(
    collection(db, 'issues'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    where('status', 'in', ['open', 'in_progress'])
  );
  const issueSnapshot = await getDocs(issueQuery);
  const openIssues = issueSnapshot.size;

  return {
    totalSpend,
    budgetAmount,
    budgetUtilization,
    openRequisitions,
    openPurchaseOrders,
    shipmentsInTransit,
    openIssues
  };
}

async function getSpendByVendor(
  projectId: string, 
  userId: string
): Promise<SpendByVendor[]> {
  const poQuery = query(
    collection(db, 'purchaseOrders'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );
  const poSnapshot = await getDocs(poQuery);
  
  const vendorSpend = new Map<string, { name: string; total: number; count: number }>();
  let totalSpend = 0;
  
  poSnapshot.docs.forEach(doc => {
    const po = doc.data();
    const vendorId = po.vendorId;
    const vendorName = po.vendorName;
    const amount = po.total || 0;
    
    totalSpend += amount;
    
    if (vendorSpend.has(vendorId)) {
      const existing = vendorSpend.get(vendorId)!;
      existing.total += amount;
      existing.count += 1;
    } else {
      vendorSpend.set(vendorId, {
        name: vendorName,
        total: amount,
        count: 1
      });
    }
  });
  
  return Array.from(vendorSpend.entries()).map(([vendorId, data]) => ({
    vendorId,
    vendorName: data.name,
    totalSpend: data.total,
    percentage: totalSpend > 0 ? (data.total / totalSpend) * 100 : 0,
    orderCount: data.count
  })).sort((a, b) => b.totalSpend - a.totalSpend);
}

async function getSpendByMaterialGroup(
  projectId: string, 
  userId: string
): Promise<SpendByMaterialGroup[]> {
  // Get all purchase order items with material group information
  const poQuery = query(
    collection(db, 'purchaseOrders'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );
  const poSnapshot = await getDocs(poQuery);
  
  const groupSpend = new Map<string, { name: string; total: number; count: number }>();
  let totalSpend = 0;
  
  for (const poDoc of poSnapshot.docs) {
    const po = poDoc.data();
    const items = po.items || [];
    
    for (const item of items) {
      const materialGroupId = item.materialGroupId || 'uncategorized';
      const materialGroupName = materialGroupId === 'uncategorized' ? 'Uncategorized' : 
        await getMaterialGroupName(materialGroupId);
      const amount = item.totalPrice || 0;
      
      totalSpend += amount;
      
      if (groupSpend.has(materialGroupId)) {
        const existing = groupSpend.get(materialGroupId)!;
        existing.total += amount;
        existing.count += 1;
      } else {
        groupSpend.set(materialGroupId, {
          name: materialGroupName,
          total: amount,
          count: 1
        });
      }
    }
  }
  
  return Array.from(groupSpend.entries()).map(([materialGroupId, data]) => ({
    materialGroupId,
    materialGroupName: data.name,
    totalSpend: data.total,
    percentage: totalSpend > 0 ? (data.total / totalSpend) * 100 : 0,
    itemCount: data.count
  })).sort((a, b) => b.totalSpend - a.totalSpend);
}

async function getMaterialGroupName(materialGroupId: string): Promise<string> {
  try {
    const groupDoc = await getDoc(doc(db, 'materialGroups', materialGroupId));
    return groupDoc.exists() ? groupDoc.data().name : 'Unknown Group';
  } catch (error) {
    return 'Unknown Group';
  }
}

async function getSpendTrend(
  projectId: string, 
  userId: string
): Promise<SpendTrend[]> {
  const poQuery = query(
    collection(db, 'purchaseOrders'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    orderBy('orderDate', 'asc')
  );
  const poSnapshot = await getDocs(poQuery);
  
  const dailySpend = new Map<string, number>();
  
  poSnapshot.docs.forEach(doc => {
    const po = doc.data();
    const orderDate = po.orderDate?.toDate();
    if (orderDate) {
      const dateKey = orderDate.toISOString().split('T')[0];
      const amount = po.total || 0;
      
      if (dailySpend.has(dateKey)) {
        dailySpend.set(dateKey, dailySpend.get(dateKey)! + amount);
      } else {
        dailySpend.set(dateKey, amount);
      }
    }
  });
  
  // Convert to array and calculate cumulative amounts
  const sortedDates = Array.from(dailySpend.keys()).sort();
  let cumulativeAmount = 0;
  
  return sortedDates.map(date => {
    const amount = dailySpend.get(date)!;
    cumulativeAmount += amount;
    
    return {
      date,
      amount,
      cumulativeAmount
    };
  });
}

async function getBudgetBreakdown(
  projectId: string, 
  userId: string,
  totalBudget: number
): Promise<BudgetBreakdown[]> {
  // For now, we'll create a simple breakdown by material groups
  // In a real implementation, you might have predefined budget categories
  const spendByGroup = await getSpendByMaterialGroup(projectId, userId);
  
  const totalSpent = spendByGroup.reduce((sum, group) => sum + group.totalSpend, 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  
  const breakdown: BudgetBreakdown[] = spendByGroup.map(group => ({
    category: group.materialGroupName,
    budgeted: totalBudget * (group.percentage / 100), // Proportional allocation
    spent: group.totalSpend,
    remaining: Math.max(0, (totalBudget * (group.percentage / 100)) - group.totalSpend),
    percentage: group.percentage
  }));
  
  // Add remaining budget as a separate category if there's unallocated budget
  if (remainingBudget > 0) {
    breakdown.push({
      category: 'Unallocated',
      budgeted: remainingBudget,
      spent: 0,
      remaining: remainingBudget,
      percentage: totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0
    });
  }
  
  return breakdown;
}
