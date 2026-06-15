import { NextResponse } from "next/server";
import { z } from "zod";
import { clientError, serverError } from "@/lib/api-errors";
import {
  deleteChildFromSupabase,
  fetchChildFromSupabase,
  fetchChildrenFromSupabase,
  upsertChildInSupabase,
} from "@/lib/server-storage";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/**
 * Получает ID текущего пользователя из сессии Supabase.
 * Используется для поддержки childId=current.
 */
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
        setAll() {
          // Read-only в API route
        },
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

    // Поддержка childId=current — читает ID текущего пользователя из сессии
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

    // Поддержка action="upsert" для синхронизации из ChildrenStorage
    if (body.action === "upsert" && body.child) {
      const child = await upsertChildInSupabase(body.child);
      return NextResponse.json({ ok: true, child });
    }

    // Поддержка action="delete" для синхронизации из ChildrenStorage
    if (body.action === "delete" && body.childId) {
      await deleteChildFromSupabase(body.childId);
      return NextResponse.json({ ok: true, childId: body.childId });
    }

    // Стандартный payload
    const payload = ChildPayload.parse(body);
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
