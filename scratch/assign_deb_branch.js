const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.eicvdtpylfqchhhwceyn:EnfyconSupabase2026!@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    const tenantRes = await pool.query("SELECT id, name FROM tenants WHERE domain = 'deb' OR name ILIKE '%Deb%' LIMIT 1");
    if (tenantRes.rows.length === 0) {
      console.log("Deb tenant not found!");
      process.exit(1);
    }
    const tenantId = tenantRes.rows[0].id;
    console.log("Found tenant:", tenantRes.rows[0].name, tenantId);

    // Find bbsr-domestic branch
    const branchRes = await pool.query("SELECT id, name FROM branches WHERE tenant_id = $1 AND (name ILIKE '%bbsr%' OR name ILIKE '%domestic%') LIMIT 1", [tenantId]);
    if (branchRes.rows.length === 0) {
      console.log("bbsr-domestic branch not found!");
      process.exit(1);
    }
    const branchId = branchRes.rows[0].id;
    console.log("Found target branch:", branchRes.rows[0].name, branchId);

    // Update all users of this tenant to have branch_id = branchId
    const updateRes = await pool.query("UPDATE users SET branch_id = $1 WHERE tenant_id = $2 AND (branch_id IS NULL OR branch_id != $1)", [branchId, tenantId]);
    console.log(`Updated ${updateRes.rowCount} users to branch ${branchRes.rows[0].name}`);

    process.exit(0);
  } catch (err) {
    console.error("Error updating users:", err);
    process.exit(1);
  }
}

run();
