(() => {
  const state = {
    config: null,
    client: null,
    account: null,
    developmentRole: 'EventRisk.Admin'
  };

  async function initialize() {
    let response;
    try {
      response = await fetch('/api/public-config', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
    } catch (error) {
      throw new Error('De EventRisk-server is niet bereikbaar. Publiceer deze toepassing niet via GitHub Pages; gebruik de Azure Web App uit de uitrolhandleiding.');
    }
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      const preview = (await response.text()).trim().slice(0, 80);
      const looksLikeHtml = /^<!doctype|^<html/i.test(preview);
      if (looksLikeHtml) {
        throw new Error('De interface is geopend zonder werkende EventRisk-API. GitHub Pages is alleen statische hosting. Rol de volledige Node.js-app uit naar Azure App Service en open daarna de Azure-URL.');
      }
      throw new Error(`De EventRisk-configuratie kon niet worden geladen (HTTP ${response.status}).`);
    }
    state.config = await response.json();
    if (state.config.authMode === 'development') return state.config;
    if (!window.msal?.PublicClientApplication) {
      throw new Error('De Microsoft-authenticatiebibliotheek kon niet worden geladen. Controleer de internetverbinding of host MSAL lokaal.');
    }
    state.client = new window.msal.PublicClientApplication({
      auth: {
        clientId: state.config.entra.clientId,
        authority: state.config.entra.authority,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: false
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
      system: { allowNativeBroker: false }
    });
    await state.client.initialize();
    const redirectResult = await state.client.handleRedirectPromise();
    state.account = redirectResult?.account || state.client.getAllAccounts()[0] || null;
    if (state.account) state.client.setActiveAccount(state.account);
    return state.config;
  }

  async function login() {
    if (state.config.authMode === 'development') return true;
    const result = await state.client.loginPopup({
      scopes: ['openid', 'profile', 'email', state.config.entra.apiScope],
      prompt: 'select_account'
    });
    state.account = result.account;
    state.client.setActiveAccount(state.account);
    return true;
  }

  async function token() {
    if (state.config.authMode === 'development') return null;
    const account = state.account || state.client.getActiveAccount() || state.client.getAllAccounts()[0];
    if (!account) throw new Error('U bent niet aangemeld.');
    try {
      const result = await state.client.acquireTokenSilent({ account, scopes: [state.config.entra.apiScope] });
      return result.accessToken;
    } catch (error) {
      if (error instanceof window.msal.InteractionRequiredAuthError || error.errorCode === 'interaction_required') {
        const result = await state.client.acquireTokenPopup({ account, scopes: [state.config.entra.apiScope] });
        return result.accessToken;
      }
      throw error;
    }
  }

  async function headers(extra = {}) {
    if (state.config.authMode === 'development') {
      return { ...extra, 'X-Dev-Role': state.developmentRole };
    }
    return { ...extra, Authorization: `Bearer ${await token()}` };
  }

  async function logout() {
    if (state.config.authMode === 'development') {
      window.location.reload();
      return;
    }
    const account = state.account || state.client.getActiveAccount();
    await state.client.logoutPopup({ account, postLogoutRedirectUri: window.location.origin });
    window.location.reload();
  }

  function isAuthenticated() {
    return state.config?.authMode === 'development' || Boolean(state.account);
  }

  function setDevelopmentRole(role) { state.developmentRole = role; }

  window.EventRiskAuth = { initialize, login, logout, headers, isAuthenticated, setDevelopmentRole, state };
})();
