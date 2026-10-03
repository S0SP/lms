import { db } from '../src/lib/drizzle';
import * as schema from '../src/db/schema';
import { getTableName, isTable, getTableColumns, sql } from 'drizzle-orm';

interface ColumnDiff {
  tableName: string;
  columnName: string;
  drizzleType: string;
  status: 'MISSING_TABLE' | 'MISSING_COLUMN';
}

async function main() {
  console.log('🔍 Auditing all Drizzle tables and columns against Neon PostgreSQL...\n');

  // Fetch all existing tables and columns in public schema
  const dbColumnsRes = await db.execute(sql`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public';
  `);

  const dbTableMap = new Map<string, Set<string>>();
  for (const row of dbColumnsRes as any[]) {
    const tName = row.table_name;
    const cName = row.column_name;
    if (!dbTableMap.has(tName)) {
      dbTableMap.set(tName, new Set());
    }
    dbTableMap.get(tName)!.add(cName);
  }

  const missingColumns: ColumnDiff[] = [];
  const missingTables = new Set<string>();
  let totalTablesChecked = 0;
  let totalColumnsChecked = 0;

  for (const [exportName, exportValue] of Object.entries(schema)) {
    if (isTable(exportValue)) {
      const tableName = getTableName(exportValue);
      totalTablesChecked++;
      const dbColumns = dbTableMap.get(tableName);

      if (!dbColumns) {
        missingTables.add(tableName);
        missingColumns.push({
          tableName,
          columnName: '*',
          drizzleType: 'TABLE',
          status: 'MISSING_TABLE',
        });
        continue;
      }

      const columns = getTableColumns(exportValue);
      for (const [colKey, colObj] of Object.entries(columns)) {
        totalColumnsChecked++;
        const colName = colObj.name;
        if (!dbColumns.has(colName)) {
          missingColumns.push({
            tableName,
            columnName: colName,
            drizzleType: colObj.dataType,
            status: 'MISSING_COLUMN',
          });
        }
      }
    }
  }

  console.log(`📊 Total Drizzle Tables Audited: ${totalTablesChecked}`);
  console.log(`📊 Total Drizzle Columns Audited: ${totalColumnsChecked}`);
  console.log(`📊 Discrepancies Found: ${missingColumns.length}\n`);

  if (missingColumns.length === 0) {
    console.log('✅ ALL Drizzle tables and columns exist in Neon PostgreSQL! Zero schema mismatches.\n');
  } else {
    console.log('❌ MISMATCHES DETECTED:');
    for (const diff of missingColumns) {
      if (diff.status === 'MISSING_TABLE') {
        console.log(`  - ❌ Table [${diff.tableName}] does NOT exist in the database!`);
      } else {
        console.log(`  - ⚠️  Table [${diff.tableName}] is MISSING column [${diff.columnName}] (${diff.drizzleType})`);
      }
    }
  }

  process.exit(missingColumns.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
