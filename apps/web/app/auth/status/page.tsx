export type AuthMeResponse = {
  authenticated: boolean;
  user: null | {
    id: string;
    name: string;
    email: string;
    provider: 'entra';
    roles: string[];
  };
};

async function getAuthState(): Promise<AuthMeResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const response = await fetch(`${baseUrl}/auth/me`, {
    cache: 'no-store',
    credentials: 'include'
  });

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  return response.json();
}

export default async function AuthStatusPage() {
  const state = await getAuthState();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <main style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 32 }}>
      <h1>Authenticatie status</h1>

      <p>
        API: <code>{baseUrl}</code>
      </p>

      {state.authenticated && state.user ? (
        <div>
          <p>
            <strong>Ingelogd</strong> als {state.user.name} ({state.user.email})
          </p>
          <p>
            <strong>Rollen:</strong> {state.user.roles.length ? state.user.roles.join(', ') : 'geen'}
          </p>
          <p>
            <a href={`${baseUrl}/admin`}>Test admin endpoint</a>
          </p>
          <a href={`${baseUrl}/auth/logout`}>Logout</a>
        </div>
      ) : (
        <div>
          <p>
            <strong>Niet ingelogd</strong>
          </p>
          <a href={`${baseUrl}/auth/login`}>Login met Microsoft Entra ID</a>
        </div>
      )}
    </main>
  );
}
