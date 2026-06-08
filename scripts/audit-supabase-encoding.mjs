import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getSupabaseConfig() {
  const envPath = path.resolve(".env.local");
  const fileEnv = readEnvFile(envPath);
  const merged = { ...fileEnv, ...process.env };

  const url =
    merged.NEXT_PUBLIC_SUPABASE_URL ||
    merged.SUPABASE_URL;

  const serviceKey =
    merged.SUPABASE_SERVICE_ROLE_KEY ||
    merged.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase URL or service role key in .env.local");
  }

  return { url, serviceKey };
}

function isSuspiciousText(value) {
  if (typeof value !== "string" || value.length < 4) return false;

  const replacement = value.includes("\uFFFD") || value.includes("пїЅ");
  const questionRuns = (value.match(/\?{4,}/g) || []).length > 0;
  const mojibakeRuns = (value.match(/(?:Р.|С.){3,}/g) || []).length > 0;

  return replacement || questionRuns || mojibakeRuns;
}

function preview(value) {
  if (typeof value !== "string") return "";
  return value.length > 140 ? `${value.slice(0, 137)}...` : value;
}

function collectIssues(rows, config) {
  const issues = [];

  for (const row of rows) {
    for (const field of config.fields) {
      const value = row[field];
      if (!isSuspiciousText(value)) continue;

      issues.push({
        table: config.table,
        id: row.id,
        field,
        preview: preview(value),
      });
    }
  }

  return issues;
}

async function fetchAll(supabase, table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

async function main() {
  const { url, serviceKey } = getSupabaseConfig();
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const tableConfigs = [
    {
      table: "children",
      columns: "id,name,class",
      fields: ["name", "class"],
    },
    {
      table: "sessions",
      columns: "id,context,final_note,history_insight",
      fields: ["context", "final_note", "history_insight"],
    },
    {
      table: "session_records",
      columns: "id,stage_title,scenario,feedback,question,answer",
      fields: ["stage_title", "feedback", "question", "answer"],
    },
  ];

  const issues = [];

  for (const config of tableConfigs) {
    const rows = await fetchAll(supabase, config.table, config.columns);
    issues.push(...collectIssues(rows, config));
  }

  const summary = issues.reduce((acc, issue) => {
    acc[issue.table] = (acc[issue.table] || 0) + 1;
    return acc;
  }, {});

  if (issues.length === 0) {
    console.log("No suspicious encoding patterns found.");
    return;
  }

  console.log("Suspicious rows found:");
  console.log(JSON.stringify({ total: issues.length, byTable: summary, issues }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
