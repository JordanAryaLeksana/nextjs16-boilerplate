// Demo Data
const products = [
  { id: 1, name: "Parfum A", price: 150000 },
  { id: 2, name: "Parfum B", price: 225000 },
  { id: 3, name: "Parfum C", price: 300000 },
];

// GET Products
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("fail") === "true") {
    return Response.json(
      {
        error: {
          message: "Failed to retrieve products",
          details: {
            reason: "Demo API error",
          },
        },
      },
      { status: 422 },
    );
  }

  return Response.json(products);
}

// POST Product
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    price?: unknown;
  } | null;

  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price <= 0
  ) {
    return Response.json({ message: "Invalid product data" }, { status: 400 });
  }

  const product = {
    id: Math.max(0, ...products.map((item) => item.id)) + 1,
    name: body.name.trim(),
    price: body.price,
  };

  products.push(product);

  return Response.json(product, { status: 201 });
}
