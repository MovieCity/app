import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// Supabase client (hardcoded)
// -----------------------------
const supabase = createClient(
  "https://eduvaeqergvupajzkrmq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdXZhZXFlcmd2dXBhanprcm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODQ1MjcsImV4cCI6MjA3Mzg2MDUyN30.AiOCFH05u9OnU4KnNUPdO82qak0w57yfLGleCEGJmbY"
);

// -----------------------------
// Auto-cleanup matches older than 12 hours
// -----------------------------
async function cleanupOldMatches() {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("matches")
    .delete()
    .lt("end_time", twelveHoursAgo);

  if (error) {
    console.error("Error cleaning matches:", error.message);
  } else if (data.length > 0) {
    console.log(`Deleted ${data.length} matches older than 12 hours`);
  }
}

// Run cleanup every hour
setInterval(cleanupOldMatches, 60 * 60 * 1000);

// -----------------------------
// Helper: auto-update status
// -----------------------------
function getStatus(match) {
  const now = new Date();
  if (!match.start_time || !match.end_time) return "upcoming";

  const start = new Date(match.start_time);
  const end = new Date(match.end_time);

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  if (now > end) return "finished";
  return match.status || "upcoming";
}

// -----------------------------
// Routes
// -----------------------------

// Get all matches
app.get("/matches", async (req, res) => {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });

  const updated = data.map((m) => ({ ...m, status: getStatus(m) }));
  res.json(updated);
});

// Get single match
app.get("/matches/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json({ ...data, status: getStatus(data) });
});

// Add new match
app.post("/matches", async (req, res) => {
  const {
    name,
    category,
    start_time,
    end_time,
    team1_name,
    team2_name,
    team1_flag,
    team2_flag,
    match_image,
    languages,
    fallback_url,
    tournament,
    stadium,
    broadcasters,
    score,
  } = req.body;

  const { data, error } = await supabase.from("matches").insert([
    {
      name,
      category,
      start_time,
      end_time,
      team1_name,
      team2_name,
      team1_flag,
      team2_flag,
      match_image,
      languages: languages || [],
      fallback_url,
      tournament,
      stadium,
      broadcasters: broadcasters || [],
      score: score || { team1: 0, team2: 0 },
    },
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Update match (score, status, languages, etc.)
app.patch("/matches/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from("matches")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Delete match
app.delete("/matches/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("matches").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// -----------------------------
// Server
// -----------------------------
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
    
