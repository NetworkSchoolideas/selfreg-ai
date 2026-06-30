import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientError, serverError } from "@/lib/api-errors";
import {
  deleteChildFromSupabase,
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

async function getCurrentUserId(): Promise<string | null> {
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
    return data?.user?.id ?? null;
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
      const userId = await getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ ok: true, child: null });
      }

      const child = await fetchChildFromSupabase(userId);
      return NextResponse.json({ ok: true, child });
    }

    if (childId) {
      const child = await fetchChildFromSupabase(childId);
      return NextResponse.json({ ok: true, child });
    }

    if (!teacherId) {
      return NextResponse.json({
        ok: true,
        children: [],
      });
    }

    const access = await requireTeacherAccess(teacherId);
    if (access.response) {
      return access.response;
    }

    const children = await fetchChildrenFromSupabase(teacherId);
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
      if (body.child.teacherId) {
        const access = await requireTeacherAccess(body.child.teacherId);
        if (access.response) {
          return access.response;
        }
      }

      const child = await upsertChildInSupabase(body.child);
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
    if (payload.teacherId) {
      const access = await requireTeacherAccess(payload.teacherId);
      if (access.response) {
        return access.response;
      }
    }

    const child = await upsertChildInSupabase(payload);
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
