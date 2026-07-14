import { NextResponse } from "next/server";
import { z } from "zod";
import { clientError, serverError } from "@/lib/api-errors";
import {
  acceptStudentConsentInSupabase,
  ensureStudentChildForAuthUserInSupabase,
  fetchChildByUserIdFromSupabase,
  fetchChildFromSupabase,
  fetchChildrenFromSupabase,
  unlinkChildFromTeacherInSupabase,
  upsertChildInSupabase,
} from "@/lib/server-storage";
import { requireTeacherAccess } from "@/lib/server-teacher-access";
import { requireChildAccess, requireServerRole } from "@/lib/server-user-access";

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

async function requireTeacherChildOwnership(childId: string, teacherId: string) {
  const child = await fetchChildFromSupabase(childId);
  if (!child || child.teacherId !== teacherId) {
    return null;
  }

  return child;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get("childId");
    const teacherId = url.searchParams.get("teacherId") || undefined;

    if (childId === "current") {
      const access = await requireServerRole("student");
      if (access.response) {
        return access.response;
      }

      let child = await fetchChildByUserIdFromSupabase(access.context.userId);
      if (!child) {
        child = await ensureStudentChildForAuthUserInSupabase({
          userId: access.context.userId,
          email: access.context.email,
          fullName: access.context.fullName,
        });
      }

      return NextResponse.json({ ok: true, child });
    }

    if (childId) {
      const access = await requireChildAccess(childId);
      if (access.response) {
        return access.response;
      }

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

    if (body.action === "accept-consent") {
      const access = await requireServerRole("student");
      if (access.response) {
        return access.response;
      }

      const child = await ensureStudentChildForAuthUserInSupabase({
        userId: access.context.userId,
        email: access.context.email,
        fullName: access.context.fullName,
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
      });
      const consentTimestamp = new Date().toISOString();
      const updatedChild = await acceptStudentConsentInSupabase({
        childId: child.id,
        userId: access.context.userId,
        consentTimestamp,
      });
      return NextResponse.json({ ok: true, child: updatedChild });
    }

    if (body.action === "upsert" && body.child) {
      const access = await requireTeacherAccess(body.child.teacherId);
      if (access.response) {
        return access.response;
      }

      if (body.child.id && !await requireTeacherChildOwnership(body.child.id, access.teacherId!)) {
        return clientError("Child not found for this teacher", "CHILD_NOT_FOUND");
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

      if (!await requireTeacherChildOwnership(body.childId, access.teacherId!)) {
        return clientError("Child not found for this teacher", "CHILD_NOT_FOUND");
      }

      await unlinkChildFromTeacherInSupabase(body.childId, access.teacherId!);
      return NextResponse.json({ ok: true, childId: body.childId });
    }

    const payload = ChildPayload.parse(body);
    const access = await requireTeacherAccess(payload.teacherId);
    if (access.response) {
      return access.response;
    }

    if (payload.id && !await requireTeacherChildOwnership(payload.id, access.teacherId!)) {
      return clientError("Child not found for this teacher", "CHILD_NOT_FOUND");
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

    const access = await requireTeacherAccess(teacherId);
    if (access.response) {
      return access.response;
    }

    if (!await requireTeacherChildOwnership(childId, access.teacherId!)) {
      return clientError("Child not found for this teacher", "CHILD_NOT_FOUND");
    }

    await unlinkChildFromTeacherInSupabase(childId, access.teacherId!);
    return NextResponse.json({ ok: true, childId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove student from teacher dashboard";
    return serverError(message, "CHILD_UNLINK_ERROR");
  }
}
