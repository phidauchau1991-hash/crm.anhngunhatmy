const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/api/crm-alerts/route.js');
let c = fs.readFileSync(file, 'utf8');

if (!c.includes("getDismissedKeys")) {
  c = c.replace("import prisma from '@/lib/db';", "import prisma from '@/lib/db';\nimport { getDismissedKeys } from '@/lib/alertDismissals';");
  
  c = c.replace("const twentyDaysAgo = new Date();", "const dismissed = await getDismissedKeys();\n    const twentyDaysAgo = new Date();");
  
  const oldFilter = `const tuitionAlerts = unpaidOrders.filter(order => {
      if (!order.class || !order.class.startDate) return false;
      const startDate = new Date(order.class.startDate);
      return startDate <= twentyDaysAgo;
    });`;
    
  const newFilter = `const tuitionAlerts = unpaidOrders.map(order => ({
      ...order,
      key: \`tuition|\${order.id}\`
    })).filter(order => {
      if (!order.class || !order.class.startDate) return false;
      if (dismissed.has(order.key)) return false;
      const startDate = new Date(order.class.startDate);
      return startDate <= twentyDaysAgo;
    });`;
    
  c = c.replace(oldFilter, newFilter);
  fs.writeFileSync(file, c, 'utf8');
  console.log("crm-alerts API patched!");
} else {
  console.log("crm-alerts API already patched.");
}
