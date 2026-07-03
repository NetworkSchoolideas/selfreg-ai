import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientError, serverError } from "@/lib/api-errors";
import {
  ensureStudentChildForAuthUserInSupabase,
  deleteChildFromSupabase,
  fetchChildByUserIdFromSupabase,
  fetchChildFromSupabase,
  fetchChildrenFromSupabase,
  upsertChildInSupabase,
} from "@/lib/server-storage";
import { requireTeacherAccess } from "@/lib/server-teacher-access";

const ChildPayload = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  className: z.string().optional(),
  teacherId: z.string().optional(),
  consentGiven: z.boolean().optional(),
  consentTimestamp: z.string().optional(),
  realData: z
    .object({
      fio: z.string().min(1),
      klass: z.string().min(1),
    })
    .optional(),
});

async function getCurrentUserContext(): Promise<{
  id: string;
  email: string;
  fullName?: string | null;
  role?: "teacher" | "student" | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      return null;
    }

    const metadataRole = user.user_metadata?.preferred_role;

    return {
      id: user.id,
      email: user.email || "",
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
      role: metadataRole === "teacher" || metadataRole === "student" ? metadataRole : null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get("childId");
    const teacherId = url.searchParams.get("teacherId") || undefined;

    if (childId === "current") {
      const currentUser = await getCurrentUserContext();
      if (!currentUser) {
        return NextResponse.json({ ok: true, child: null });
      }

      let child = await fetchChildByUserIdFromSupabase(currentUser.id);
      if (!child && currentUser.role === "student") {
        child = await ensureStudentChildForAuthUserInSupabase({
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
        });
      }

      return NextResponse.json({ ok: true, child });
    }

    if (childId) {
      const child = await fetchChildFromSupabase(childId);
      return NextResponse.json({ ok: true, child });
    }

    const access = await requireTeacherAccess(teacherId);
    if (access.response) {
      return access.response;
    }

    const children = await fetchChildrenFromSupabase(access.teacherId!);
    return NextResponse.json({ ok: true, children });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load children";
    return serverError(message, "CHILDREN_LOAD_ERROR");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "upsert" && body.child) {
      const access = await requireTeacherAccess(body.child.teacherId);
      if (access.response) {
        return access.response;
      }

      const child = await upsertChildInSupabase({
        ...body.child,
        teacherId: body.child.teacherId || access.teacherId,
      });
      return NextResponse.json({ ok: true, child });
    }

    if (body.action === "delete" && body.childId) {
      const access = await requireTeacherAccess(body.teacherId);
      if (access.response) {
        return access.response;
      }

      await deleteChildFromSupabase(body.childId);
      return NextResponse.json({ ok: true, childId: body.childId });
    }

    const payload = ChildPayload.parse(body);
    const access = await requireTeacherAccess(payload.teacherId);
    if (access.response) {
      return access.response;
    }

    const child = await upsertChildInSupabase({
      ...payload,
      teacherId: payload.teacherId || access.teacherId,
    });
    return NextResponse.json({ ok: true, child });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid child payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Failed to save child";
    return serverError(message, "CHILD_SAVE_ERROR");
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get("childId");
    const teacherId = url.searchParams.get("teacherId");

    if (!childId) {
      return clientError("childId is required", "VALIDATION_ERROR");
    }

    if (!teacherId) {
      return clientError("teacherId is required", "VALIDATION_ERROR");
    }

    const access = await requireTeacherAccess(teacherId);
    if (access.response) {
      return access.response;
    }

    const child = await fetchChildFromSupabase(childId);
    if (!child || child.teacherId !== teacherId) {
      return clientError("Child not found for this teacher", "CHILD_NOT_FOUND");
    }

    await deleteChildFromSupabase(childId);
    return NextResponse.json({ ok: true, childId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete child";
    return serverError(message, "CHILD_DELETE_ERROR");
  }
}
