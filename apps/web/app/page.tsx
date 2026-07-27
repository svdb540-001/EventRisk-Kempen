export default function HomePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <main style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 32 }}>
      <h1>EventRisk Kempen</h1>
      <p>Scaffold actief. Update 2 bevat auth flow placeholders en sessiebeheer.</p>
      <ul>
        <li>Frontend: Next.js</li>
        <li>Backend: NestJS</li>
        <li>Integraties: Eaglebe + Flowlab (2-way sync)</li>
      </ul>

      <p>
        <a href="/auth/status">Ga naar authenticatie status</a>
      </p>

      <p>
        Backend auth endpoints:
        <br />
        <a href={`${apiUrl}/auth/me`}>{apiUrl}/auth/me</a>
      </p>
    </main>
  );
}
