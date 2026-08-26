import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const singleFile = formData.get("image") as File | null;

    const allFiles: File[] = [];
    if (files && files.length > 0) {
      allFiles.push(...files);
    } else if (singleFile) {
      allFiles.push(singleFile);
    }

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: "No image files provided." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.NEXT_PUBLIC_IMGBB_API_KEY ||
      process.env.IMGBB_API_KEY ||
      "203d60bb9fab7d8774cd2e6e230ff932";

    const uploadedUrls: string[] = [];

    for (const file of allFiles) {
      if (!file.type.startsWith("image/")) continue;

      let directUrl = "";

      // 1. Try uploading to ImgBB via Node.js fetch (No browser CORS / adblocker issues)
      try {
        const imgBbBody = new FormData();
        imgBbBody.append("image", file);

        const imgBbRes = await fetch(
          `https://api.imgbb.com/1/upload?key=${apiKey}`,
          {
            method: "POST",
            body: imgBbBody,
          }
        );

        if (imgBbRes.ok) {
          const json = await imgBbRes.json();
          if (json?.success && json?.data) {
            directUrl =
              json.data.display_url ||
              json.data.url ||
              json.data.image?.url ||
              "";
          }
        }
      } catch (uploadErr) {
        console.error("ImgBB server-side upload error:", uploadErr);
      }

      // 2. If ImgBB failed, fallback to base64 Data URL
      if (!directUrl) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        directUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
      }

      if (directUrl) {
        uploadedUrls.push(directUrl);
      }
    }

    if (uploadedUrls.length > 0) {
      return NextResponse.json({
        success: true,
        urls: uploadedUrls,
        url: uploadedUrls[0],
      });
    }

    return NextResponse.json(
      { success: false, message: "Failed to process image files." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Upload API route error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server upload error" },
      { status: 500 }
    );
  }
}
