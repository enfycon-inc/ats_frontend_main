import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const keywords = searchParams.get("keywords") || "";
    const topK = searchParams.get("top_k") || "10";
    const threshold = searchParams.get("threshold") || "0.2";

    const fastapiUrl = new URL("http://api:8000/api/v1/search");
    if (query) fastapiUrl.searchParams.set("query", query);
    if (keywords) fastapiUrl.searchParams.set("keywords", keywords);
    fastapiUrl.searchParams.set("top_k", topK);
    fastapiUrl.searchParams.set("threshold", threshold);

    console.log(`[API PROXY] Querying FastAPI Search: ${fastapiUrl.toString()}`);

    const response = await fetch(fastapiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 0 }, // Disable Next.js fetch caching to guarantee real-time results
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FastAPI responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API PROXY] Candidate search failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch search results from parser engine.",
        error: error.message || error,
      },
      { status: 500 }
    );
  }
}
