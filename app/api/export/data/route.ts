import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { buildDataExport } from "@/lib/export/data-export";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac-shared";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role?.name;
  if (!isAdminRole(role) && !isShopRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));
  if (searchParams.get("from") && !from) {
    return NextResponse.json(
      { error: "Invalid from date (use YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (searchParams.get("to") && !to) {
    return NextResponse.json(
      { error: "Invalid to date (use YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (from && to && from > to) {
    return NextResponse.json(
      { error: "From date must be on or before to date" },
      { status: 400 },
    );
  }

  let branchId: string | null = null;
  let scopeLabel = "All shops";
  const isAdmin = isAdminRole(role);

  if (isShopRole(role)) {
    branchId = session.user.branch?.id ?? null;
    if (!branchId) {
      return NextResponse.json(
        { error: "Shop account has no branch assigned" },
        { status: 400 },
      );
    }
    scopeLabel = `Shop only — ${session.user.branch?.name ?? branchId}`;
  } else {
    const requested = searchParams.get("branchId");
    if (requested && requested !== "all") {
      const branch = await prisma.branch.findUnique({
        where: { id: requested },
        select: { id: true, name: true, code: true, isShop: true },
      });
      if (!branch) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
      branchId = branch.id;
      scopeLabel = `Shop — ${branch.name} (${branch.code})`;
    }
  }

  const exportedBy =
    session.user.name ||
    session.user.username ||
    session.user.email ||
    session.user.id;

  try {
    const { buffer, filename } = await buildDataExport({
      branchId,
      salesFrom: from,
      salesTo: to,
      isAdmin,
      exportedBy: String(exportedBy),
      scopeLabel,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export/data]", err);
    return NextResponse.json(
      { error: "Failed to build export" },
      { status: 500 },
    );
  }
}
