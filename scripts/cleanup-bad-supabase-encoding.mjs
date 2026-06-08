import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TARGET_TEACHER_IDS = [
  "LOCAL_TEST_20260604173613",
  "LOCAL_TEST_20260604174725",
];

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envText = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    envText
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  const { data: children, error: childrenError } = await supabase
    .from("children")
    .select("id, teacher_id, name")
    .in("teacher_id", TARGET_TEACHER_IDS);

  if (childrenError) {
    throw childrenError;
  }

  if (!children?.length) {
    console.log("No matching test children found.");
    return;
  }

  const childIds = children.map((child) => child.id);

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, child_id")
    .in("child_id", childIds);

  if (sessionsError) {
    throw sessionsError;
  }

  const sessionIds = sessions.map((session) => session.id);
  let deletedSessionRecords = 0;

  if (sessionIds.length) {
    const { data: records, error: recordsError } = await supabase
      .from("session_records")
      .select("id, session_id")
      .in("session_id", sessionIds);

    if (recordsError) {
      throw recordsError;
    }

    deletedSessionRecords = records.length;
  }

  if (sessionIds.length) {
    const { error: recordsDeleteError } = await supabase
      .from("session_records")
      .delete()
      .in("session_id", sessionIds);

    if (recordsDeleteError) {
      throw recordsDeleteError;
    }
  }

  if (sessionIds.length) {
    const { error: sessionsDeleteError } = await supabase
      .from("sessions")
      .delete()
      .in("id", sessionIds);

    if (sessionsDeleteError) {
      throw sessionsDeleteError;
    }
  }

  const { error: childrenDeleteError } = await supabase
    .from("children")
    .delete()
    .in("id", childIds);

  if (childrenDeleteError) {
    throw childrenDeleteError;
  }

  console.log(
    JSON.stringify(
      {
        deletedTeacherIds: TARGET_TEACHER_IDS,
        deletedChildren: children.length,
        deletedSessions: sessionIds.length,
        deletedSessionRecords,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
