import { NextResponse } from "next/server";

import { fetchPhotoStream } from "@/lib/googlePlaces";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoNameParam = searchParams.get("photoName");

  if (!photoNameParam) {
    return NextResponse.json(
      { error: "Missing required query parameter 'photoName'." },
      { status: 400 },
    );
  }

  const maxWidthPx = searchParams.get("maxWidthPx");
  const maxHeightPx = searchParams.get("maxHeightPx");

  try {
    const response = await fetchPhotoStream(photoNameParam, {
      maxWidthPx: maxWidthPx ? Number.parseInt(maxWidthPx, 10) : undefined,
      maxHeightPx: maxHeightPx ? Number.parseInt(maxHeightPx, 10) : undefined,
    });

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load place photo.";
    console.error(`Unable to proxy Google Places photo "${photoNameParam}"`, error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

