'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient'; // Ensure this exists, which based on previous searches it should

export default function AdminPoolPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      setMessage('Please provide a file and a title.');
      return;
    }

    setIsUploading(true);
    setMessage('Requesting upload URL...');

    try {
      // 1. Get Presigned URL
      const res = await fetch('/api/admin/upload-pool-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      const { url, publicUrl, error } = await res.json();

      if (error) {
        throw new Error(error);
      }

      setMessage('Uploading file to storage...');

      // 2. Upload file to R2
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to Cloudflare R2.');
      }

      setMessage('Saving to database...');

      // 3. Save to Supabase daily_drop_pool via secure backend route
      const insertRes = await fetch('/api/admin/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          stem_url: publicUrl,
        }),
      });

      const insertData = await insertRes.json();

      if (!insertRes.ok || insertData.error) {
        throw new Error(insertData.error || 'Failed to save to database.');
      }

      setMessage('Success! Sound added to the unused pool.');
      setFile(null);
      setTitle('');
    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Admin: Add to Daily Drop Pool
        </h1>
        <p className="text-zinc-400 mb-8">
          Upload stems or zip files here. They will be stored in the unused pool. Every night at midnight, the system will automatically pick one random unused sound and activate it.
        </p>

        <form onSubmit={handleUpload} className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Drop Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Midnight Synth Loop"
              disabled={isUploading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Stem / Zip File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              disabled={isUploading}
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || !file || !title}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
          >
            {isUploading ? 'Processing...' : 'Upload to Pool'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-lg border ${message.includes('Error') ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-green-900/20 border-green-800 text-green-200'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
