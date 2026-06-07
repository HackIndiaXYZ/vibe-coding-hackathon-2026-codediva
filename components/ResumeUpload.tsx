"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ResumeUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!files || files.length === 0) {
      toast.error("Please select at least one PDF");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("resumes", file);
      });

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success(
        `${data.count} resume${data.count !== 1 ? "s" : ""} uploaded successfully!`
      );

      if (data.failed?.length > 0) {
        data.failed.forEach((f: { filename: string; error: string }) => {
          toast.error(`${f.filename}: ${f.error}`);
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 border rounded-2xl mt-10 shadow-sm">
      <h2 className="text-3xl font-bold mb-6">Upload Resumes</h2>

      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={(e) => setFiles(e.target.files)}
        className="block w-full border rounded-lg p-3"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-4 bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}