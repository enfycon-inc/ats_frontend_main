import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fileToSend: Blob | null = null;
    let fileName = "resume.txt";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ status: "error", message: "No file uploaded in the request." }, { status: 400 });
      }
      fileToSend = file;
      fileName = file.name;
    } else {
      // If it is a JSON request with pasted text
      const body = await request.json();
      const text = body.text || "";
      if (!text.trim()) {
        return NextResponse.json({ status: "error", message: "Empty resume text pasted." }, { status: 400 });
      }
      // Create a Blob from the pasted text to upload as a text file
      fileToSend = new Blob([text], { type: "text/plain" });
      fileName = "pasted_resume.txt";
    }

    // Prepare multipart form data for FastAPI
    const apiFormData = new FormData();
    apiFormData.append("file", fileToSend, fileName);

    console.log(`[API PROXY] Uploading file '${fileName}' to FastAPI extractor...`);

    const extractResponse = await fetch("http://api:8000/api/v1/extract", {
      method: "POST",
      body: apiFormData,
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      throw new Error(`FastAPI parser returned status ${extractResponse.status}: ${errorText}`);
    }

    const extractData = await extractResponse.json();
    console.log("[API PROXY] FastAPI response:", extractData);

    // Case 1: Duplicate Hash found - returns immediate parsed JSON
    if (extractData.status === "completed") {
      console.log("[API PROXY] Exact duplicate hash found. Returning completed candidate data.");
      return NextResponse.json(extractData);
    }

    // Case 2: New resume accepted and processing in the background
    if (extractData.status === "accepted") {
      const taskId = extractData.task_id;
      console.log(`[API PROXY] Task queued. Task ID: ${taskId}. Starting server-side status polling...`);

      // Server-side polling loop (poll every 1.5s, max 15 iterations = 22.5s timeout)
      const maxRetries = 15;
      const pollInterval = 1500; // 1.5 seconds

      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const statusResponse = await fetch(`http://api:8000/api/v1/status/${taskId}`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          next: { revalidate: 0 },
        });

        if (!statusResponse.ok) {
          console.error(`[API PROXY] Failed to fetch task status for ${taskId}`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`[API PROXY] Polling iteration ${i + 1}/${maxRetries} - Task Status: ${statusData.status}`);

        if (statusData.status === "SUCCESS") {
          const taskResult = statusData.result;
          if (taskResult.status === "completed") {
            return NextResponse.json(taskResult);
          } else if (taskResult.status === "failed") {
            throw new Error(`Celery parser task failed internally: ${taskResult.error}`);
          }
        } else if (statusData.status === "FAILURE") {
          throw new Error(`Celery background task execution failed for taskId: ${taskId}`);
        }
      }

      // Timeout fallback: Return the accepted state and let the client UI know it is taking longer
      return NextResponse.json({
        status: "processing",
        task_id: taskId,
        message: "Resume is taking longer than expected to parse. It will save automatically in the background.",
      });
    }

    throw new Error(`Unexpected status returned from parser: ${extractData.status}`);
  } catch (error: any) {
    console.error("[API PROXY] Parsing failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to parse candidate resume profile.",
        error: error.message || error,
      },
      { status: 500 }
    );
  }
}
