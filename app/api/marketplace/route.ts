import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PRODUCTS } from "@/lib/data/enterprise";

export async function GET() {
  return NextResponse.json({ products: PRODUCTS });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = body.productId;
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    message: `Access request for ${product.name} submitted by ${user.name}. Owner (${product.owner}) will be notified.`,
  });
}
