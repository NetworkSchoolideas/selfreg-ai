import { z } from "zod";
import { createErrorResponse, serverError } from "@/lib/api-errors";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

const E2ESetupUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["teacher", "student"]),
  fullName: z.string().min(1).optional(),
  school: z.string().min(1).optional(),
  teacherCode: z.string().min(2).optional(),
});

const E2ESetupPayloadSchema = z.object({
  users: z.array(E2ESetupUserSchema).min(1),
});

type E2ESetupUser = z.infer<typeof E2ESetupUserSchema>;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ChildInsert = Database["public"]["Tables"]["children"]["Insert"];
type ChildUpdate = Database["public"]["Tables"]["children"]["Update"];

function isE2ESetupEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.SELFREG_E2E_ENABLED === "1";
}

function buildAvatarUrl(fullName?: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=0f766e&color=fff`;
}

function resolveTeacherCode(user: E2ESetupUser) {
  if (user.role !== "teacher") {
    return null;
  }

  if (user.teacherCode) {
    return user.teacherCode.trim().toUpperCase();
  }

  const seed = user.email.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6).padStart(6, "0");
  return `T${seed}`;
}

function buildUserMetadata(user: E2ESetupUser) {
  const teacherCode = resolveTeacherCode(user);

  return {
    full_name: user.fullName || user.email.split("@")[0],
    avatar_url: buildAvatarUrl(user.fullName || user.email),
    preferred_role: user.role,
    ...(user.school ? { school: user.school } : {}),
    ...(teacherCode ? { teacher_code: teacherCode } : {}),
  };
}

async function findUserByEmail(supabaseAdmin: any, email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user: { email?: string | null }) => (user.email || "").toLowerCase() === email.toLowerCase()) || null;
}

async function ensureUser(supabaseAdmin: any, user: E2ESetupUser) {
  const metadata = buildUserMetadata(user);
  const existingUser = await findUserByEmail(supabaseAdmin, user.email);

  let authUserId: string;

  if (existingUser) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user) {
      throw new Error(error?.message || "Failed to update e2e auth user");
    }

    authUserId = data.user.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user) {
      const racedUser = await findUserByEmail(supabaseAdmin, user.email);
      if (!racedUser) {
        throw new Error(error?.message || "Failed to create e2e auth user");
      }

      const racedUpdate = await supabaseAdmin.auth.admin.updateUserById(racedUser.id, {
        password: user.password,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (racedUpdate.error || !racedUpdate.data.user) {
        throw new Error(racedUpdate.error?.message || "Failed to recover raced e2e auth user");
      }

      authUserId = racedUpdate.data.user.id;
    } else {
      authUserId = data.user.id;
    }
  }

  const profile: ProfileInsert = {
    id: authUserId,
    email: user.email,
    full_name: metadata.full_name,
    avatar_url: metadata.avatar_url,
    role: user.role,
    metadata: {
      ...(user.school ? { school: user.school } : {}),
      ...(metadata.teacher_code ? { teacher_code: metadata.teacher_code } : {}),
    },
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profile, { onConflict: "id" });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    id: authUserId,
    email: user.email,
    role: user.role,
    teacherCode: metadata.teacher_code || null,
  };
}

async function ensureStudentChild(supabaseAdmin: any, user: E2ESetupUser, authUserId: string) {
  if (user.role !== "student") {
    return null;
  }

  const { data: existingChild, error: lookupError } = await supabaseAdmin
    .from("children")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const timestamp = new Date().toISOString();
  const realData = {
    fio: user.fullName || user.email.split("@")[0],
    klass: "",
  };

  if (existingChild?.id) {
    const patch: ChildUpdate = {
      name: realData.fio,
      class: "",
      updated_at: timestamp,
      metadata: { realData },
    };

    const { error: updateError } = await supabaseAdmin
      .from("children")
      .update(patch)
      .eq("id", existingChild.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return existingChild.id as string;
  }

  const insert: ChildInsert = {
    name: realData.fio,
    class: "",
    user_id: authUserId,
    teacher_id: null,
    consent_given: false,
    consent_timestamp: null,
    metadata: { realData },
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { data: createdChild, error: createError } = await supabaseAdmin
    .from("children")
    .insert(insert)
    .select("id")
    .single();

  if (createError || !createdChild) {
    throw new Error(createError?.message || "Failed to create e2e student child");
  }

  return (createdChild as { id: string }).id;
}

export async function POST(request: Request) {
  try {
    if (!isE2ESetupEnabled()) {
      return createErrorResponse("Not found", 404, "E2E_SETUP_DISABLED");
    }

    const expectedSecret = process.env.SELFREG_E2E_SECRET;
    const providedSecret = request.headers.get("x-e2e-secret");

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return createErrorResponse("E2E setup secret is invalid", 401, "E2E_SETUP_UNAUTHORIZED");
    }

    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const payload = E2ESetupPayloadSchema.parse(await request.json());
    const supabaseAdmin: any = getSupabaseAdmin();
    const users = [];

    for (const user of payload.users) {
      const ensuredUser = await ensureUser(supabaseAdmin, user);
      const childId = await ensureStudentChild(supabaseAdmin, user, ensuredUser.id);
      users.push({
        ...ensuredUser,
        childId,
      });
    }

    return Response.json({
      ok: true,
      users,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid e2e setup payload", 400, "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "E2E setup failed";
    return serverError(message, "E2E_SETUP_ERROR");
  }
}
