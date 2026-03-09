export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Montgomery Command Center API</h1>
      <p>Next.js API backend serving all 4 PRD modules.</p>
      <h2>Modules</h2>
      <ul>
        <li><strong>Sentinel MGM</strong> — <code>/api/sentinel/*</code></li>
        <li><strong>YouthShield</strong> — <code>/api/youthshield/*</code></li>
        <li><strong>Blight-to-Bright</strong> — <code>/api/blight/*</code></li>
        <li><strong>DataCenter Compass</strong> — <code>/api/compass/*</code></li>
        <li><strong>Command Center</strong> — <code>/api/command/*</code></li>
        <li><strong>AI / Chat</strong> — <code>/api/ai/*</code></li>
      </ul>
      <p>
        <a href="/api/health">Health Check</a>
      </p>
    </div>
  );
}
