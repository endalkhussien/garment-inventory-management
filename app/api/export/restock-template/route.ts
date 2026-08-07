import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { logFailure, logSuccess } from "@/lib/activity-log";
import { buildRestockTemplateWorkbook } from "@/lib/export/restock-template";
import { isAdminRole, isShopRole } from "@/lib/rbac-shared";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role?.name;
  if (!isAdminRole(role) && !isShopRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { buffer, filename } = await buildRestockTemplateWorkbook();
    await logSuccess({
      action: "EXPORT",
      entityType: "Stock",
      title: "Restock template downloaded",
      message: filename,
      userId: session.user.id,
      branchId: session.user.branch?.id,
      href: "/shops/restock",
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
  } catch (error) {
    console.error("restock-template", error);
    await logFailure({
      action: "EXPORT",
      entityType: "Stock",
      title: "Restock template failed",
      message: "Could not build restock template.",
      error: error instanceof Error ? error.message : undefined,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Could not build restock template." },
      { status: 500 },
    );
  }
}
