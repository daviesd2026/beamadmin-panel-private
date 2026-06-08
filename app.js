// ===========================
//  BeamAdmin - app.js
// ===========================

// Authentication is handled by the BeamAdmin API.

const MAX_ATTEMPTS = 5;
let attempts = 0;

// -------------------------------------------------
//  Element refs
// -------------------------------------------------
const loginScreen   = document.getElementById('login-screen');
const dashboard     = document.getElementById('dashboard');
const loginBtn      = document.getElementById('login-btn');
const errMsg        = document.getElementById('err-msg');
const attemptsTxt   = document.getElementById('attempts-txt');
const usernameInput = document.getElementById('username');
const pwInput       = document.getElementById('password');
const pwToggle      = document.getElementById('pw-toggle');
const eyeIcon       = document.getElementById('eye-icon');
const logoutBtn     = document.getElementById('logout-btn');
const loggedInUser  = document.getElementById('logged-in-user');
const pageTitle     = document.getElementById('page-title');

// -------------------------------------------------
//  Login
// -------------------------------------------------
async function doLogin() {
  if (attempts >= MAX_ATTEMPTS) return;

  const user = usernameInput.value.trim();
  const pass = pwInput.value;

  loginBtn.disabled = true;
  errMsg.textContent = '';

  const loginOk = await apiLoginAndRender(user, pass);
  loginBtn.disabled = false;

  if (loginOk) {
    // Success
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loggedInUser.textContent = user;
    errMsg.textContent = '';
    usernameInput.value = '';
    pwInput.value = '';
    attempts = 0;
  } else {
    // Failure
    attempts++;
    const left = MAX_ATTEMPTS - attempts;

    if (left <= 0) {
      errMsg.textContent = 'Too many failed attempts. Access locked.';
      loginBtn.disabled = true;
      attemptsTxt.textContent = 'Refresh the page to try again.';
    } else {
      errMsg.textContent = 'Incorrect username or password.';
      attemptsTxt.textContent = left + ' attempt' + (left === 1 ? '' : 's') + ' remaining';
    }

    pwInput.value = '';
    pwInput.focus();
  }
}

loginBtn.addEventListener('click', doLogin);

pwInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') doLogin();
});

usernameInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') pwInput.focus();
});

// -------------------------------------------------
//  Show / hide password
// -------------------------------------------------
pwToggle.addEventListener('click', function () {
  const hidden = pwInput.type === 'password';
  pwInput.type = hidden ? 'text' : 'password';
  eyeIcon.className = hidden ? 'ti ti-eye-off' : 'ti ti-eye';
});

// -------------------------------------------------
//  Logout
// -------------------------------------------------
logoutBtn.addEventListener('click', function () {
  sessionStorage.removeItem('beamadminToken');
  localStorage.removeItem('beam_token');
  dashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  errMsg.textContent = '';
  if (attempts < MAX_ATTEMPTS) {
    attemptsTxt.textContent = 'Use your admin login';
  }
  // Reset to dashboard page
  showPage('dashboard');
});

// -------------------------------------------------
//  Navigation
// -------------------------------------------------
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pageDashboard = document.getElementById('page-dashboard');
const pageOther     = document.getElementById('page-other');
const placeholderTitle = document.getElementById('placeholder-title');

const pageLabels = {
  dashboard: 'Dashboard',
  players:   'Players',
  vehicles:  'Vehicles',
  maps:      'Maps',
  mods:      'Mods',
  banlist:   'Ban list',
  settings:  'Settings',
  console:   'Console',
  logs:      'Logs',
  management: 'Management tool',
  troll: 'Troll'
};

function showPage(name) {
  navItems.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.page === name);
  });

  pageTitle.textContent = pageLabels[name] || name;

  if (name === 'dashboard') {
    pageDashboard.classList.remove('hidden');
    pageOther.classList.add('hidden');
  } else {
    pageDashboard.classList.add('hidden');
    pageOther.classList.remove('hidden');
    placeholderTitle.textContent = '"' + pageLabels[name] + '" coming soon';
  }
}

navItems.forEach(function (btn) {
  btn.addEventListener('click', function () {
    showPage(btn.dataset.page);
  });
});

// -------------------------------------------------
//  BeamMP server overview
// -------------------------------------------------
const SERVER_IP = '57.131.50.184';
const SERVERS = [
  {
    id: 'offroad',
    name: 'Str1x3vo Offroad',
    path: '/opt/beammp-offroad',
    port: 30816,
    map: 'Reshjemheia',
    maxPlayers: 16,
    maxCars: 3,
    tags: ['Offroad', 'Freeroam'],
    status: 'online',
    note: 'Public stock offroad server',
    events: ['guest5050912 is now synced', 'Rules sent to guest5050912', 'Client connected']
  },
  {
    id: 'offroad-plus',
    name: 'Str1x3vo Offroad+',
    path: '/opt/beammp-offroad-plus',
    port: 30817,
    map: 'Johnson Valley',
    maxPlayers: 16,
    maxCars: 3,
    tags: ['Offroad', 'Freeroam'],
    status: 'online',
    note: 'Offroad plus with resource pack',
    events: ['Server listing updated', 'All systems started successfully', 'Gatekeeper loaded']
  },
  {
    id: 'vanilla',
    name: 'Str1x3vo Vanilla',
    path: '/opt/beammp-vanilla',
    port: 30814,
    map: 'Italy',
    maxPlayers: 16,
    maxCars: 2,
    tags: ['Freeroam'],
    status: 'online',
    note: 'Public stock freeroam server',
    events: ['Chill broadcast sent', 'Sticky nicks broadcasted', 'Server running']
  },
  {
    id: 'vanilla-plus',
    name: 'Str1x3vo Vanilla+',
    path: '/opt/beammp-vanilla-plus',
    port: 30815,
    map: 'West Coast USA',
    maxPlayers: 16,
    maxCars: 2,
    tags: ['Freeroam'],
    status: 'online',
    note: 'Freeroam plus with Str1x3vo resources',
    events: ['Recent players disconnected', 'Anti-grief warning sent', 'Auto broadcast active']
  },
  {
    id: 'highforce',
    name: 'Str1x3vo Highforce Custom BackRoadDriving UK',
    path: '/opt/beammp-highforce',
    port: 30818,
    map: 'High Force',
    maxPlayers: 16,
    maxCars: 6,
    tags: ['Backroads', 'UK', 'Custom'],
    status: 'online',
    note: 'Custom UK back road driving server',
    events: ['Server listing updated', 'All systems started successfully', 'Gatekeeper loaded']
  },
  {
    id: 'freeroam-old',
    name: 'Str1x3vo Public Freeroam',
    path: '/opt/beammp-server',
    port: 30814,
    map: 'West Coast USA',
    maxPlayers: 16,
    maxCars: 5,
    tags: ['Freeroam'],
    status: 'offline',
    note: 'Stopped; shares port 30814 with Vanilla',
    events: ['No running BeamMP process found', 'Last log activity was older than active servers']
  }
];

function addressFor(server) {
  return SERVER_IP + ':' + server.port;
}

function copyText(text, button) {
  navigator.clipboard.writeText(text).then(function () {
    const old = button.innerHTML;
    button.innerHTML = '<i class="ti ti-check"></i> Copied';
    setTimeout(function () {
      button.innerHTML = old;
    }, 1200);
  });
}

function renderServerDashboard() {
  const online = SERVERS.filter(function (server) { return server.status === 'online'; });
  const slots = SERVERS.reduce(function (sum, server) { return sum + server.maxPlayers; }, 0);

  pageDashboard.innerHTML = [
    '<div class="metrics">',
      '<div class="metric"><div class="metric-label">Servers online</div><div class="metric-value">' + online.length + ' <span class="metric-max">/' + SERVERS.length + '</span></div><div class="metric-sub">BeamMP fleet</div></div>',
      '<div class="metric"><div class="metric-label">Total slots</div><div class="metric-value">' + slots + '</div><div class="metric-sub">Across all configured servers</div></div>',
      '<div class="metric"><div class="metric-label">Public IP</div><div class="metric-value metric-value--sm">' + SERVER_IP + '</div><div class="metric-sub">Use IP:port in BeamMP</div></div>',
      '<div class="metric"><div class="metric-label">Admin path</div><div class="metric-value metric-value--sm">/opt/beamadmin</div><div class="metric-sub">Separate from BeamMP files</div></div>',
    '</div>',
    '<div class="section">',
      '<div class="section-header"><span class="section-title">BeamMP servers</span><button class="act-btn" id="copy-all-addresses"><i class="ti ti-copy"></i> Copy all</button></div>',
      '<div class="server-grid" id="server-grid"></div>',
    '</div>',
    '<div class="two-col">',
      '<div class="section"><div class="section-header"><span class="section-title">Recent events</span></div><div class="card"><div class="log-list" id="fleet-log"></div></div></div>',
      '<div class="section"><div class="section-header"><span class="section-title">Quick connect</span><button class="act-btn" id="copy-online-addresses"><i class="ti ti-copy-check"></i> Copy online</button></div><div class="card"><div class="quick-list" id="quick-list"></div></div></div>',
    '</div>'
  ].join('');

  const grid = document.getElementById('server-grid');
  grid.innerHTML = SERVERS.map(function (server) {
    const statusClass = server.status === 'online' ? 'badge-green' : 'badge-red';
    const tags = server.tags.map(function (tag) {
      return '<span class="server-tag">' + tag + '</span>';
    }).join('');

    return [
      '<article class="server-card">',
        '<div class="server-card-head">',
          '<div><h3>' + server.name + '</h3><p>' + server.note + '</p></div>',
          '<span class="badge ' + statusClass + '">' + server.status + '</span>',
        '</div>',
        '<div class="server-meta">',
          '<span><i class="ti ti-plug-connected"></i>' + addressFor(server) + '</span>',
          '<span><i class="ti ti-map"></i>' + server.map + '</span>',
          '<span><i class="ti ti-users"></i>' + server.maxPlayers + ' slots</span>',
          '<span><i class="ti ti-car"></i>' + server.maxCars + ' cars</span>',
        '</div>',
        '<div class="server-tags">' + tags + '</div>',
        '<div class="server-actions">',
          '<button class="act-btn copy-address" data-address="' + addressFor(server) + '"><i class="ti ti-copy"></i> Copy address</button>',
          '<button class="act-btn copy-path" data-address="' + server.path + '"><i class="ti ti-folder"></i> Copy path</button>',
        '</div>',
      '</article>'
    ].join('');
  }).join('');

  const log = document.getElementById('fleet-log');
  log.innerHTML = SERVERS.flatMap(function (server) {
    return server.events.slice(0, 2).map(function (event) {
      const cls = server.status === 'online' ? 'log-join' : 'log-warn';
      return '<div class="log-line"><span class="log-time">' + server.id + '</span><span class="' + cls + '">' + event + '</span></div>';
    });
  }).join('');

  const quickList = document.getElementById('quick-list');
  quickList.innerHTML = SERVERS.map(function (server) {
    return '<div class="quick-row"><span>' + server.name + '</span><code>' + addressFor(server) + '</code></div>';
  }).join('');

  document.querySelectorAll('.copy-address, .copy-path').forEach(function (button) {
    button.addEventListener('click', function () {
      copyText(button.dataset.address, button);
    });
  });

  document.getElementById('copy-all-addresses').addEventListener('click', function () {
    copyText(SERVERS.map(addressFor).join('\\n'), this);
  });

  document.getElementById('copy-online-addresses').addEventListener('click', function () {
    copyText(online.map(addressFor).join('\\n'), this);
  });

  const playersNav = document.querySelector('.nav-item[data-page="players"]');
  if (playersNav) {
    playersNav.innerHTML = '<i class="ti ti-server"></i> Servers <span class="badge badge-green ml-auto">' + online.length + '</span>';
  }

  const footer = document.querySelector('.status-txt');
  if (footer) footer.textContent = online.length + ' online';
}

const originalShowPage = showPage;
showPage = function (name) {
  if (name === 'players') name = 'dashboard';
  originalShowPage(name);
};

renderServerDashboard();

// -------------------------------------------------
//  Live admin API
// -------------------------------------------------
let apiToken = localStorage.getItem('beam_token') || sessionStorage.getItem('beamadminToken') || '';
let refreshTimer = null;
let pageTimer = null;
const DISCORD_LINK = 'https://discord.gg/52QCEH3svU';

const REASON_TEMPLATES = {
  kick: [
    'Ramming is not accepted on this server. Please rejoin and drive respectfully.',
    'Ignoring staff instructions. Please rejoin when you are ready to follow the rules.',
    'Blocking or disrupting other players. Please rejoin and keep it fair.',
    'AFK or inactive in a way that affects the server. You can rejoin when ready.'
  ],
  ban: [
    'Ramming is not accepted on this server. Appeal here: ' + DISCORD_LINK,
    'Repeated griefing after warnings. Appeal here: ' + DISCORD_LINK,
    'Harassment or abusive behavior toward other players. Appeal here: ' + DISCORD_LINK,
    'Bypassing rules or staff action. Appeal here: ' + DISCORD_LINK
  ]
};

async function apiRequest(path, options) {
  const opts = options || {};
  opts.headers = Object.assign({
    'Content-Type': 'application/json'
  }, opts.headers || {});

  if (apiToken) {
    opts.headers.Authorization = 'Bearer ' + apiToken;
  }

  const response = await fetch(path, opts);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    payload = { error: text || response.statusText || 'Request failed' };
  }
  if (!response.ok) {
    const err = new Error(payload.error || 'Request failed');
    err.status = response.status;
    throw err;
  }
  return payload;
}

async function apiLoginAndRender(username, password) {
  try {
    const result = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: username, password: password })
    });
    apiToken = result.token;
    sessionStorage.setItem('beamadminToken', apiToken);
    localStorage.setItem('beam_token', apiToken);
    await loadLiveServers();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadLiveServers, 5000);
    return true;
  } catch (err) {
    return false;
  }
}

function htmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function chooseReason(action) {
  const templates = REASON_TEMPLATES[action] || [];
  const lines = templates.map(function (text, index) {
    return (index + 1) + '. ' + text;
  });
  lines.push('C. Custom reason');

  const choice = prompt(
    (action === 'ban' ? 'Ban' : 'Kick') + ' reason template:\n\n' + lines.join('\n\n'),
    '1'
  );

  if (choice === null) return null;

  const normalized = choice.trim().toLowerCase();
  if (normalized === 'c' || normalized === 'custom') {
    return prompt(action === 'ban' ? 'Custom ban reason' : 'Custom kick reason', action === 'ban' ? 'Banned by admin. Appeal here: ' + DISCORD_LINK : 'Kicked by admin.');
  }

  const selected = Number(normalized);
  if (Number.isInteger(selected) && selected >= 1 && selected <= templates.length) {
    return templates[selected - 1];
  }

  return choice.trim();
}

async function loadLiveServers() {
  if (!apiToken) return;
  try {
    const payload = await apiRequest('/api/servers');
    renderLiveDashboard(payload.servers || []);
  } catch (err) {
    if (err.status === 401) {
      apiToken = '';
      sessionStorage.removeItem('beamadminToken');
      localStorage.removeItem('beam_token');
      if (refreshTimer) clearInterval(refreshTimer);
      dashboard.classList.add('hidden');
      loginScreen.classList.remove('hidden');
      errMsg.textContent = 'Session expired. Sign in again.';
      return;
    }

    console.warn('BeamAdmin refresh failed:', err);
  }
}

function renderLiveDashboard(servers) {
  const online = servers.filter(function (server) { return server.online; });
  const slots = servers.reduce(function (sum, server) { return sum + Number(server.maxPlayers || 0); }, 0);
  const footer = document.querySelector('.status-txt');
  if (footer) footer.textContent = online.length + ' online';

  pageDashboard.innerHTML = [
    '<div class="metrics">',
      '<div class="metric"><div class="metric-label">Servers online</div><div class="metric-value">' + online.length + ' <span class="metric-max">/' + servers.length + '</span></div><div class="metric-sub">Bridge status</div></div>',
      '<div class="metric"><div class="metric-label">Players online</div><div class="metric-value">' + servers.reduce(function (sum, server) { return sum + Number((server.bridge || {}).playerCount || 0); }, 0) + ' <span class="metric-max">/' + slots + '</span></div><div class="metric-sub">Across all servers</div></div>',
      '<div class="metric"><div class="metric-label">Public IP</div><div class="metric-value metric-value--sm">' + SERVER_IP + '</div><div class="metric-sub">Use IP:port in BeamMP</div></div>',
      '<div class="metric"><div class="metric-label">Admin path</div><div class="metric-value metric-value--sm">/opt/beamadmin</div><div class="metric-sub">API + static UI</div></div>',
    '</div>',
    '<div class="section">',
      '<div class="section-header"><span class="section-title">BeamMP servers</span><button class="act-btn" id="copy-all-addresses"><i class="ti ti-copy"></i> Copy all</button></div>',
      '<div class="server-grid" id="server-grid"></div>',
    '</div>',
    '<div class="section">',
      '<div class="section-header"><span class="section-title">Live players</span><button class="act-btn" id="refresh-live"><i class="ti ti-refresh"></i> Refresh</button></div>',
      '<div class="card"><table class="player-table"><thead><tr><th>Server</th><th>Player</th><th>Server ID</th><th>BeamMP ID</th><th>IP</th><th>Actions</th></tr></thead><tbody id="live-player-rows"></tbody></table></div>',
    '</div>'
  ].join('');

  const grid = document.getElementById('server-grid');
  grid.innerHTML = servers.map(function (server) {
    const statusClass = server.online ? 'badge-green' : 'badge-red';
    const statusText = server.online ? 'online' : 'offline';
    const tags = (server.tags || []).map(function (tag) {
      return '<span class="server-tag">' + htmlEscape(tag) + '</span>';
    }).join('');
    return [
      '<article class="server-card">',
        '<div class="server-card-head">',
          '<div><h3>' + htmlEscape(server.name) + '</h3><p>' + htmlEscape(server.note) + '</p></div>',
          '<span class="badge ' + statusClass + '">' + statusText + '</span>',
        '</div>',
        '<div class="server-meta">',
          '<span><i class="ti ti-plug-connected"></i>' + htmlEscape(server.address) + '</span>',
          '<span><i class="ti ti-map"></i>' + htmlEscape(server.map) + '</span>',
          '<span><i class="ti ti-users"></i>' + Number((server.bridge || {}).playerCount || 0) + ' / ' + Number(server.maxPlayers || 0) + '</span>',
          '<span><i class="ti ti-car"></i>' + Number(server.maxCars || 0) + ' cars</span>',
        '</div>',
        '<div class="server-tags">' + tags + '</div>',
        '<div class="server-actions">',
          '<button class="act-btn copy-address" data-address="' + htmlEscape(server.address) + '"><i class="ti ti-copy"></i> Copy address</button>',
          '<button class="act-btn copy-path" data-address="' + htmlEscape(server.path) + '"><i class="ti ti-folder"></i> Copy path</button>',
          '<button class="act-btn start-lights" data-server="' + htmlEscape(server.id) + '" data-name="' + htmlEscape(server.name) + '"><i class="ti ti-traffic-lights"></i> Start lights</button>',
          '<button class="act-btn danger restart-server" data-server="' + htmlEscape(server.id) + '" data-name="' + htmlEscape(server.name) + '"><i class="ti ti-refresh"></i> Restart</button>',
        '</div>',
      '</article>'
    ].join('');
  }).join('');

  const rows = [];
  servers.forEach(function (server) {
    const rawPlayers = (server.bridge || {}).players;
    const players = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
    players.forEach(function (player) {
      rows.push([
        '<tr>',
          '<td>' + htmlEscape(server.name) + '</td>',
          '<td><div class="player-name"><div class="avatar av-a">' + htmlEscape((player.name || '?').slice(0, 2).toUpperCase()) + '</div>' + htmlEscape(player.name) + '</div></td>',
          '<td><code>' + htmlEscape(player.serverPlayerId || player.id || '') + '</code></td>',
          '<td>' + htmlEscape(player.beammp || 'Guest / no BeamMP ID') + '</td>',
          '<td>' + htmlEscape(player.ip || '') + '</td>',
          '<td><div class="row-actions">',
            '<button class="act-btn player-fling" data-server="' + htmlEscape(server.id) + '" data-id="' + htmlEscape(player.id) + '" data-name="' + htmlEscape(player.name) + '" data-strength="70"><i class="ti ti-arrow-big-up-lines"></i> Fling</button>',
            '<button class="act-btn player-kick" data-server="' + htmlEscape(server.id) + '" data-id="' + htmlEscape(player.id) + '" data-name="' + htmlEscape(player.name) + '"><i class="ti ti-logout"></i> Kick</button>',
            player.ip ? '<button class="act-btn danger player-ban" data-server="' + htmlEscape(server.id) + '" data-id="' + htmlEscape(player.id) + '" data-name="' + htmlEscape(player.name) + '" data-account="" data-ip="' + htmlEscape(player.ip || '') + '"><i class="ti ti-ban"></i> Ban IP</button>' : '<button class="act-btn danger" disabled title="Player has no IP address reported by the bridge"><i class="ti ti-ban"></i> No IP</button>',
          '</div></td>',
        '</tr>'
      ].join(''));
    });
  });
  document.getElementById('live-player-rows').innerHTML = rows.length ? rows.join('') : '<tr><td colspan="6">No players reported by the bridge yet.</td></tr>';

  document.querySelectorAll('.copy-address, .copy-path').forEach(function (button) {
    button.addEventListener('click', function () { copyText(button.dataset.address, button); });
  });
  document.querySelectorAll('.start-lights').forEach(function (button) {
    button.addEventListener('click', async function () {
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="ti ti-loader-2"></i> Starting';
      try {
        await apiRequest('/api/servers/' + button.dataset.server + '/startlights', { method: 'POST', body: JSON.stringify({}) });
        button.innerHTML = '<i class="ti ti-check"></i> Lights queued';
      } catch (err) {
        alert(err.message);
        button.innerHTML = original;
      } finally {
        setTimeout(function () {
          button.disabled = false;
          button.innerHTML = original;
        }, 3000);
      }
    });
  });
  document.querySelectorAll('.restart-server').forEach(function (button) {
    button.addEventListener('click', async function () {
      const serverName = button.dataset.name || 'this server';
      if (!confirm('Restart ' + serverName + '? Connected players will be disconnected.')) return;
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="ti ti-loader-2"></i> Restarting';
      try {
        await apiRequest('/api/servers/' + button.dataset.server + '/restart', { method: 'POST', body: JSON.stringify({}) });
        button.innerHTML = '<i class="ti ti-check"></i> Restarted';
        setTimeout(loadLiveServers, 2500);
      } catch (err) {
        alert(err.message);
        button.innerHTML = original;
      } finally {
        setTimeout(function () {
          button.disabled = false;
          button.innerHTML = original;
        }, 3000);
      }
    });
  });
  const copyAllButton = document.getElementById('copy-all-addresses');
  if (copyAllButton) {
    copyAllButton.addEventListener('click', function () {
      copyText(servers.map(function (server) { return server.address; }).join('\\n'), this);
    });
  }

  const refreshButton = document.getElementById('refresh-live');
  if (refreshButton) {
    refreshButton.addEventListener('click', loadLiveServers);
  }

  document.querySelectorAll('.player-fling').forEach(function (button) {
    button.addEventListener('click', async function () {
      await queueFling(button);
    });
  });

  document.querySelectorAll('.player-kick, .player-ban').forEach(function (button) {
    button.addEventListener('click', async function () {
      const action = button.classList.contains('player-ban') ? 'ban' : 'kick';
      const reason = chooseReason(action);
      if (reason === null || reason.trim() === '') return;
      button.disabled = true;
      try {
        await apiRequest('/api/servers/' + button.dataset.server + '/' + action, {
          method: 'POST',
          body: JSON.stringify({ playerId: button.dataset.id, playerName: button.dataset.name, accountId: action === 'ban' ? "" : (button.dataset.account || ""), ip: button.dataset.ip || "", reason: reason })
        });
        button.innerHTML = '<i class="ti ti-check"></i> Queued';
        setTimeout(loadLiveServers, 2500);
      } catch (err) {
        alert(err.message);
      } finally {
        setTimeout(function () { button.disabled = false; }, 1200);
      }
    });
  });

  const playersNav = document.querySelector('.nav-item[data-page="players"]');
  if (playersNav) {
    playersNav.innerHTML = '<i class="ti ti-server"></i> Servers <span class="badge badge-green ml-auto">' + online.length + '</span>';
  }
}

attemptsTxt.textContent = 'Use your admin login';

// -------------------------------------------------
//  Managed pages
// -------------------------------------------------
const AVAILABLE_MAPS = ['Italy', 'West Coast USA', 'Reshjemheia', 'Johnson Valley', 'High Force', 'GridMap', 'Small Island', 'Industrial Site', 'East Coast USA'];

function setActiveNav(name) {
  navItems.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.page === name);
  });
  pageTitle.textContent = pageLabels[name] || name;
}

function clearPageTimer() {
  if (pageTimer) clearInterval(pageTimer);
  pageTimer = null;
}

function showManagedPage(name) {
  clearPageTimer();
  setActiveNav(name);
  if (name === 'dashboard' || name === 'players') {
    pageDashboard.classList.remove('hidden');
    pageOther.classList.add('hidden');
    loadLiveServers();
    return;
  }
  pageDashboard.classList.add('hidden');
  pageOther.classList.remove('hidden');
  const renderers = {
    vehicles: renderVehiclesPage,
    maps: renderMapsPage,
    mods: renderModsPage,
    banlist: renderBanListPage,
    settings: renderSettingsPage,
    troll: renderTrollPage,
    console: renderConsolePage,
    logs: renderLogsPage,
    management: renderManagementToolPage
  };
  if (renderers[name]) {
    renderers[name]();
  } else {
    pageOther.innerHTML = '<div class="placeholder-page"><p>Page unavailable</p></div>';
  }
}

showPage = showManagedPage;

function renderLoading(label) {
  pageOther.innerHTML = '<div class="page-state"><div class="spinner"></div><p>' + htmlEscape(label || 'Loading') + '</p></div>';
}

function renderError(message, retry) {
  pageOther.innerHTML = '<div class="error-banner"><strong>Request failed</strong><span>' + htmlEscape(message) + '</span><button class="act-btn danger" id="retry-page"><i class="ti ti-refresh"></i> Retry</button></div>';
  document.getElementById('retry-page').addEventListener('click', retry);
}

async function getServers() {
  const payload = await apiRequest('/api/servers');
  return payload.servers || [];
}

async function getServerStatus(serverId) {
  return apiRequest('/api/servers/' + serverId + '/status');
}

function serverOptions(servers, selectedId) {
  return servers.map(function (server) {
    return '<option value="' + htmlEscape(server.id) + '"' + (server.id === selectedId ? ' selected' : '') + '>' + htmlEscape(server.name) + '</option>';
  }).join('');
}

function mapOptions(current) {
  return AVAILABLE_MAPS.map(function (name) {
    return '<option value="' + htmlEscape(name) + '"' + (name === current ? ' selected' : '') + '>' + htmlEscape(name) + '</option>';
  }).join('');
}

const TROLL_ACTIONS = [
  { id: 'fling', label: 'Fling', icon: 'ti-arrow-big-up-lines', strength: 70 },
  { id: 'launch', label: 'Launch', icon: 'ti-rocket', danger: true, strength: 130 },
  { id: 'nudge', label: 'Nudge', icon: 'ti-arrows-random', strength: 35 },
  { id: 'spin', label: 'Spin', icon: 'ti-refresh', strength: 80 },
  { id: 'flip', label: 'Flip', icon: 'ti-flip-vertical', strength: 90 },
  { id: 'freeze', label: 'Freeze', icon: 'ti-lock', duration: 8 },
  { id: 'unfreeze', label: 'Unfreeze', icon: 'ti-lock-open' },
  { id: 'killengine', label: 'Kill engine', icon: 'ti-engine' },
  { id: 'poptires', label: 'Pop tires', icon: 'ti-circle-off' },
  { id: 'repair', label: 'Repair', icon: 'ti-tool' },
  { id: 'reset', label: 'Reset', icon: 'ti-restore' },
  { id: 'blackout', label: 'Blackout', icon: 'ti-bulb-off', duration: 10 },
  { id: 'honk', label: 'Honk', icon: 'ti-volume', duration: 6 },
  { id: 'smoke', label: 'Smoke', icon: 'ti-cloud', duration: 8 }
];

async function queueTrollAction(button) {
  const original = button.innerHTML;
  const action = button.dataset.trollAction || 'fling';
  button.disabled = true;
  button.innerHTML = '<i class="ti ti-loader-2"></i> Queuing';
  try {
    await apiRequest('/api/servers/' + button.dataset.server + '/' + action, {
      method: 'POST',
      body: JSON.stringify({
        playerId: button.dataset.id,
        playerName: button.dataset.name,
        strength: button.dataset.strength || '70',
        duration: button.dataset.duration || ''
      })
    });
    button.innerHTML = '<i class="ti ti-check"></i> Queued';
    setTimeout(loadLiveServers, 2500);
  } catch (err) {
    alert(err.message);
    button.innerHTML = original;
  } finally {
    setTimeout(function () {
      button.disabled = false;
      button.innerHTML = original;
    }, 1400);
  }
}

async function queueFling(button) {
  button.dataset.trollAction = 'fling';
  await queueTrollAction(button);
}

function trollButtonsFor(player, server) {
  return TROLL_ACTIONS.map(function (action) {
    return [
      '<button class="act-btn troll-action' + (action.danger ? ' danger' : '') + '"',
        ' data-server="' + htmlEscape(server.id) + '"',
        ' data-id="' + htmlEscape(player.id) + '"',
        ' data-name="' + htmlEscape(player.name) + '"',
        ' data-troll-action="' + htmlEscape(action.id) + '"',
        ' data-strength="' + htmlEscape(action.strength || '') + '"',
        ' data-duration="' + htmlEscape(action.duration || '') + '">',
        '<i class="ti ' + htmlEscape(action.icon) + '"></i> ' + htmlEscape(action.label),
      '</button>'
    ].join('');
  }).join('');
}

async function renderTrollPage() {
  renderLoading('Loading troll tools');
  try {
    const servers = await getServers();
    const rows = [];
    servers.forEach(function (server) {
      const rawPlayers = (server.bridge || {}).players;
      const players = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers || {});
      players.forEach(function (player) {
        rows.push({ server: server, player: player });
      });
    });
    pageOther.innerHTML = [
      '<div class="section troll-page"><div class="section-header"><span class="section-title">Troll tools</span><button class="act-btn" id="refresh-troll"><i class="ti ti-refresh"></i> Refresh</button></div>',
      rows.length ? '<div class="troll-grid">' + rows.map(function (row) {
        return [
          '<article class="troll-card">',
            '<div class="troll-card-head">',
              '<div class="player-name"><div class="avatar av-a">' + htmlEscape((row.player.name || '?').slice(0, 2).toUpperCase()) + '</div><div><strong>' + htmlEscape(row.player.name) + '</strong><span>' + htmlEscape(row.server.name) + '</span></div></div>',
              '<code>' + htmlEscape(row.player.beammp || 'Guest') + '</code>',
            '</div>',
            '<div class="troll-actions">' + trollButtonsFor(row.player, row.server) + '</div>',
          '</article>'
        ].join('');
      }).join('') + '</div>' : '<div class="card page-state"><p>No players reported by the bridge yet.</p></div>',
      '</div>'
    ].join('');
    document.getElementById('refresh-troll').addEventListener('click', renderTrollPage);
    document.querySelectorAll('.troll-action').forEach(function (button) {
      button.addEventListener('click', async function () {
        await queueTrollAction(button);
        setTimeout(renderTrollPage, 1800);
      });
    });
  } catch (err) {
    renderError(err.message, renderTrollPage);
  }
}

async function renderVehiclesPage() {
  renderLoading('Loading vehicles');
  try {
    const servers = await getServers();
    const rows = [];
    servers.forEach(function (server) {
      const players = Array.isArray((server.bridge || {}).players) ? server.bridge.players : Object.values((server.bridge || {}).players || {});
      players.forEach(function (player) {
        const vehicles = Array.isArray(player.vehicles) ? player.vehicles : Object.values(player.vehicles || {});
        vehicles.forEach(function (vehicle) {
          rows.push({ server: server, player: player, vehicle: vehicle });
        });
      });
    });
    pageOther.innerHTML = [
      '<div class="section"><div class="section-header"><span class="section-title">Spawned vehicles</span><button class="act-btn" id="refresh-vehicles"><i class="ti ti-refresh"></i> Refresh</button></div>',
      '<div class="card"><table class="player-table"><thead><tr><th>Player</th><th>Vehicle model</th><th>Server</th><th>Colour</th><th>Actions</th></tr></thead><tbody>',
      rows.length ? rows.map(function (row) {
        return '<tr><td>' + htmlEscape(row.player.name) + '</td><td>' + htmlEscape(row.vehicle.model || row.vehicle.name || row.vehicle.id || 'Unknown') + '</td><td>' + htmlEscape(row.server.name) + '</td><td>' + htmlEscape(row.vehicle.colour || row.vehicle.color || '-') + '</td><td><button class="act-btn danger delete-vehicle" data-server="' + htmlEscape(row.server.id) + '" data-player="' + htmlEscape(row.player.id) + '" data-vehicle="' + htmlEscape(row.vehicle.vehicleId || row.vehicle.id || '') + '"><i class="ti ti-trash"></i> Delete vehicle</button></td></tr>';
      }).join('') : '<tr><td colspan="5">No spawned vehicles reported by the bridge.</td></tr>',
      '</tbody></table></div></div>'
    ].join('');
    document.getElementById('refresh-vehicles').addEventListener('click', renderVehiclesPage);
    document.querySelectorAll('.delete-vehicle').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        try {
          await apiRequest('/api/servers/' + btn.dataset.server + '/deletevehicle', { method: 'POST', body: JSON.stringify({ playerId: btn.dataset.player, vehicleId: btn.dataset.vehicle }) });
          btn.innerHTML = '<i class="ti ti-check"></i> Queued';
        } catch (err) {
          alert(err.message);
        } finally {
          setTimeout(renderVehiclesPage, 1500);
        }
      });
    });
  } catch (err) {
    renderError(err.message, renderVehiclesPage);
  }
}

async function renderMapsPage() {
  renderLoading('Loading maps');
  try {
    const servers = await getServers();
    pageOther.innerHTML = '<div class="server-grid">' + servers.map(function (server) {
      const currentMap = (server.bridge || {}).map || server.map || 'Unknown';
      return [
        '<article class="server-card">',
        '<div class="server-card-head"><div><h3>' + htmlEscape(server.name) + '</h3><p>' + Number((server.bridge || {}).playerCount || 0) + ' players online</p></div><span class="badge ' + (server.online ? 'badge-green' : 'badge-red') + '">' + (server.online ? 'online' : 'offline') + '</span></div>',
        '<div class="field compact-field"><label>Current map</label><select class="map-select" data-server="' + htmlEscape(server.id) + '">' + mapOptions(currentMap) + '</select></div>',
        '<button class="act-btn save-map" data-server="' + htmlEscape(server.id) + '"><i class="ti ti-map-2"></i> Change map</button>',
        '</article>'
      ].join('');
    }).join('') + '</div>';
    document.querySelectorAll('.save-map').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const select = document.querySelector('.map-select[data-server="' + btn.dataset.server + '"]');
        btn.disabled = true;
        try {
          await apiRequest('/api/servers/' + btn.dataset.server + '/changemap', { method: 'POST', body: JSON.stringify({ map: select.value }) });
          btn.innerHTML = '<i class="ti ti-check"></i> Queued';
        } catch (err) {
          alert(err.message);
        } finally {
          setTimeout(function () { btn.disabled = false; btn.innerHTML = '<i class="ti ti-map-2"></i> Change map'; }, 1200);
        }
      });
    });
  } catch (err) {
    renderError(err.message, renderMapsPage);
  }
}

async function renderBanListPage() {
  renderLoading('Loading ban list');
  try {
    const servers = await getServers();
    const banPayloads = await Promise.all(servers.map(function (server) {
      return apiRequest('/api/servers/' + server.id + '/bans').catch(function () { return { bans: [] }; });
    }));
    const bans = banPayloads.flatMap(function (payload) { return payload.bans || []; });
    pageOther.innerHTML = [
      '<div class="section"><div class="section-header"><span class="section-title">Banned players</span><button class="act-btn" id="refresh-bans"><i class="ti ti-refresh"></i> Refresh</button></div>',
      '<div class="card"><table class="player-table"><thead><tr><th>Ban type</th><th>BeamMP ID</th><th>IP</th><th>Reason</th><th>Banned on</th><th>Server</th><th>Actions</th></tr></thead><tbody>',
      bans.length ? bans.map(function (ban) {
        return '<tr><td>' + htmlEscape(ban.playerName) + '</td><td>' + htmlEscape(ban.beammpId || '-') + '</td><td>' + htmlEscape(ban.ip || '-') + '</td><td>' + htmlEscape(ban.reason || '-') + '</td><td>' + htmlEscape(ban.bannedOn || '-') + '</td><td>' + htmlEscape(ban.serverName) + '</td><td><button class="act-btn unban-player" data-server="' + htmlEscape(ban.serverId) + '" data-player="' + htmlEscape(ban.playerId || ban.playerName) + '"><i class="ti ti-shield-check"></i> Unban</button></td></tr>';
      }).join('') : '<tr><td colspan="7">No players are currently banned</td></tr>',
      '</tbody></table></div></div>'
    ].join('');
    document.getElementById('refresh-bans').addEventListener('click', renderBanListPage);
    document.querySelectorAll('.unban-player').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        await apiRequest('/api/servers/' + btn.dataset.server + '/ban/' + encodeURIComponent(btn.dataset.player), { method: 'DELETE' });
        renderBanListPage();
      });
    });
  } catch (err) {
    renderError(err.message, renderBanListPage);
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + ' MB';
  if (value >= 1024) return (value / 1024).toFixed(1) + ' KB';
  return value + ' B';
}

async function renderModsPage() {
  renderLoading('Loading mods');
  try {
    const payload = await apiRequest('/api/mods');
    const mods = payload.mods || [];
    pageOther.innerHTML = [
      '<div class="section">',
        '<div class="section-header"><span class="section-title">Vanilla+ mods</span><button class="act-btn" id="refresh-mods"><i class="ti ti-refresh"></i> Refresh</button></div>',
        '<div class="mod-drop-info">',
          '<div><strong>Drop folder</strong><code>' + htmlEscape(payload.sourceDir) + '</code></div>',
          '<div><strong>Install target</strong><code>' + htmlEscape(payload.targetDir) + '</code></div>',
          '<p>Add `.zip` files to the drop folder, refresh this page, tick the mods to install, then apply them to ' + htmlEscape(payload.targetServerName) + '.</p>',
        '</div>',
        '<div class="card"><table class="player-table"><thead><tr><th style="width:46px"></th><th>Mod zip</th><th>Size</th><th>Status</th><th>Target</th></tr></thead><tbody>',
        mods.length ? mods.map(function (mod) {
          return '<tr><td><input class="mod-check" type="checkbox" value="' + htmlEscape(mod.name) + '"' + (mod.installed ? ' checked' : '') + '></td><td>' + htmlEscape(mod.name) + '</td><td>' + htmlEscape(formatBytes(mod.size)) + '</td><td><span class="badge ' + (mod.installed ? 'badge-green' : 'badge-gray') + '">' + (mod.installed ? 'installed' : 'available') + '</span></td><td>' + htmlEscape(mod.targetPath) + '</td></tr>';
        }).join('') : '<tr><td colspan="5">No `.zip` mods found in the drop folder yet.</td></tr>',
        '</tbody></table></div>',
        '<div class="mod-actions"><button class="act-btn" id="apply-mods"><i class="ti ti-package-import"></i> Apply selected to Vanilla+</button><span id="mod-result"></span></div>',
      '</div>'
    ].join('');

    document.getElementById('refresh-mods').addEventListener('click', renderModsPage);
    document.getElementById('apply-mods').addEventListener('click', async function () {
      const selected = Array.from(document.querySelectorAll('.mod-check:checked')).map(function (input) { return input.value; });
      const result = document.getElementById('mod-result');
      if (!selected.length) {
        result.textContent = 'Select at least one mod zip.';
        return;
      }
      result.textContent = 'Copying...';
      try {
        const response = await apiRequest('/api/mods/apply', { method: 'POST', body: JSON.stringify({ mods: selected }) });
        result.textContent = 'Copied ' + (response.copied || []).length + ' mod(s) to Vanilla+. Restart Vanilla+ if players need a clean reload.';
        setTimeout(renderModsPage, 1200);
      } catch (err) {
        result.textContent = err.message;
      }
    });
  } catch (err) {
    renderError(err.message, renderModsPage);
  }
}

async function renderSettingsPage() {
  renderLoading('Loading settings');
  try {
    const servers = await getServers();
    const settings = await Promise.all(servers.map(function (server) {
      return apiRequest('/api/servers/' + server.id + '/settings').then(function (payload) {
        return { server: server, settings: payload.settings || {} };
      });
    }));
    pageOther.innerHTML = [
      '<div class="settings-grid">',
      settings.map(function (item) {
        const s = item.settings;
        return '<form class="server-card settings-form" data-server="' + htmlEscape(item.server.id) + '"><h3>' + htmlEscape(item.server.name) + '</h3><div class="field"><label>Server name</label><input name="name" value="' + htmlEscape(s.name || item.server.name) + '"></div><div class="field"><label>Max players</label><input name="maxPlayers" type="number" min="1" max="128" value="' + htmlEscape(s.maxPlayers || item.server.maxPlayers || 16) + '"></div><div class="field"><label>Password</label><input name="password" value="' + htmlEscape(s.password || '') + '"></div><label class="toggle-row"><input name="private" type="checkbox"' + (s.private ? ' checked' : '') + '> Private server</label><button class="act-btn" type="submit"><i class="ti ti-device-floppy"></i> Save</button></form>';
      }).join(''),
      '</div>',
      '<form class="card admin-settings" id="password-form"><div class="section-header"><span class="section-title">Admin panel password</span></div><div class="form-grid"><div class="field"><label>Old password</label><input type="password" name="oldPassword"></div><div class="field"><label>New password</label><input type="password" name="newPassword"></div><div class="field"><label>Confirm</label><input type="password" name="confirmPassword"></div></div><button class="act-btn" type="submit"><i class="ti ti-key"></i> Change password</button></form>'
    ].join('');
    document.querySelectorAll('.settings-form').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const data = new FormData(form);
        await apiRequest('/api/servers/' + form.dataset.server + '/settings', { method: 'POST', body: JSON.stringify({ name: data.get('name'), maxPlayers: data.get('maxPlayers'), password: data.get('password'), private: data.get('private') === 'on' }) });
        alert('Settings saved. Restart the BeamMP server for config-only changes to take effect.');
      });
    });
    document.getElementById('password-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      if (data.get('newPassword') !== data.get('confirmPassword')) {
        alert('New passwords do not match.');
        return;
      }
      await apiRequest('/api/auth/changepassword', { method: 'POST', body: JSON.stringify({ username: loggedInUser.textContent || 'admin', oldPassword: data.get('oldPassword'), newPassword: data.get('newPassword') }) });
      alert('Password changed.');
      event.currentTarget.reset();
    });
  } catch (err) {
    renderError(err.message, renderSettingsPage);
  }
}

async function renderConsolePage() {
  renderLoading('Loading console');
  try {
    const servers = await getServers();
    const selected = servers[0] ? servers[0].id : '';
    pageOther.innerHTML = '<div class="section console-shell"><div class="section-header"><span class="section-title">Server console</span><div class="toolbar"><select id="console-server">' + serverOptions(servers, selected) + '</select><button class="act-btn" id="refresh-console"><i class="ti ti-refresh"></i> Refresh</button></div></div><div class="console-output" id="console-output"></div><div class="console-input"><input id="console-command" placeholder="Type command"><button class="act-btn" id="send-console"><i class="ti ti-send"></i> Send</button></div></div>';
    async function loadConsole() {
      const id = document.getElementById('console-server').value;
      const payload = await apiRequest('/api/servers/' + id + '/consolelog');
      const out = document.getElementById('console-output');
      out.innerHTML = (payload.lines || []).map(function (line) { return '<div>' + htmlEscape(line) + '</div>'; }).join('');
      out.scrollTop = out.scrollHeight;
    }
    document.getElementById('console-server').addEventListener('change', loadConsole);
    document.getElementById('refresh-console').addEventListener('click', loadConsole);
    document.getElementById('send-console').addEventListener('click', async function () {
      const id = document.getElementById('console-server').value;
      const input = document.getElementById('console-command');
      if (!input.value.trim()) return;
      await apiRequest('/api/servers/' + id + '/console', { method: 'POST', body: JSON.stringify({ command: input.value.trim() }) });
      input.value = '';
      setTimeout(loadConsole, 1500);
    });
    await loadConsole();
  } catch (err) {
    renderError(err.message, renderConsolePage);
  }
}


async function renderManagementToolPage() {
  renderLoading('Loading management tool');
  try {
    const payload = await apiRequest('/api/management-tool');
    const exe = payload.executable || {};
    pageOther.innerHTML = [
      '<div class="section">',
        '<div class="section-header"><span class="section-title">BeamMP Server Management Tool</span><button class="act-btn" id="refresh-management-tool"><i class="ti ti-refresh"></i> Refresh</button></div>',
        '<div class="tool-grid">',
          '<article class="tool-card"><div class="tool-icon"><i class="ti ti-brand-windows"></i></div><h3>Windows app</h3><p>' + htmlEscape(payload.type || 'Windows desktop application') + '</p><a class="act-btn" href="' + htmlEscape(payload.downloadUrl || '#') + '"><i class="ti ti-download"></i> Download EXE</a></article>',
          '<article class="tool-card"><div class="tool-icon"><i class="ti ti-folder-code"></i></div><h3>Source folder</h3><p><code>' + htmlEscape(payload.sourceDir || '') + '</code></p><button class="act-btn copy-tool-path" data-path="' + htmlEscape(payload.sourceDir || '') + '"><i class="ti ti-copy"></i> Copy path</button></article>',
          '<article class="tool-card"><div class="tool-icon"><i class="ti ti-archive"></i></div><h3>Backup folder</h3><p><code>' + htmlEscape(payload.backupDir || '') + '</code></p><button class="act-btn copy-tool-path" data-path="' + htmlEscape(payload.backupDir || '') + '"><i class="ti ti-copy"></i> Copy path</button></article>',
        '</div>',
        '<div class="card tool-details"><table class="player-table"><tbody>',
          '<tr><th>Executable</th><td>' + htmlEscape(exe.name || 'Not found') + '</td></tr>',
          '<tr><th>Size</th><td>' + htmlEscape(formatBytes(exe.size || 0)) + '</td></tr>',
          '<tr><th>Path</th><td><code>' + htmlEscape(exe.path || '') + '</code></td></tr>',
          '<tr><th>Alex server folder</th><td><code>' + htmlEscape(payload.serverDir || '') + '</code></td></tr>',
        '</tbody></table></div>',
      '</div>'
    ].join('');
    document.getElementById('refresh-management-tool').addEventListener('click', renderManagementToolPage);
    document.querySelectorAll('.copy-tool-path').forEach(function (button) {
      button.addEventListener('click', function () { copyText(button.dataset.path, button); });
    });
  } catch (err) {
    renderError(err.message, renderManagementToolPage);
  }
}

async function renderLogsPage() {
  renderLoading('Loading logs');
  try {
    const servers = await getServers();
    const tabs = [{ id: 'all', name: 'All servers' }].concat(servers);
    pageOther.innerHTML = '<div class="section"><div class="section-header"><div class="tabs" id="log-tabs">' + tabs.map(function (tab, index) { return '<button class="tab-btn' + (index === 0 ? ' active' : '') + '" data-server="' + htmlEscape(tab.id) + '">' + htmlEscape(tab.name) + '</button>'; }).join('') + '</div><button class="act-btn" id="download-log"><i class="ti ti-download"></i> Download log</button></div><div class="log-feed" id="log-feed"></div></div>';
    let current = 'all';
    async function loadLogs() {
      const selectedServers = current === 'all' ? servers : servers.filter(function (server) { return server.id === current; });
      const payloads = await Promise.all(selectedServers.map(function (server) {
        return apiRequest('/api/servers/' + server.id + '/log').then(function (payload) { return { server: server, lines: payload.lines || [] }; }).catch(function () { return { server: server, lines: [] }; });
      }));
      const lines = payloads.flatMap(function (payload) {
        return payload.lines.map(function (line) { return { server: payload.server.name, line: line }; });
      }).slice(-500);
      document.getElementById('log-feed').innerHTML = lines.map(function (entry) {
        const text = entry.line.toLowerCase();
        const cls = text.includes('joined') || text.includes('connected') ? 'log-green' : text.includes('left') || text.includes('kicked') || text.includes('banned') || text.includes('terminated') ? 'log-red' : text.includes('warn') || text.includes('ping') ? 'log-yellow' : 'log-white';
        return '<div class="log-feed-line ' + cls + '"><span>' + htmlEscape(entry.server) + '</span>' + htmlEscape(entry.line) + '</div>';
      }).join('');
    }
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        current = btn.dataset.server;
        loadLogs();
      });
    });
    document.getElementById('download-log').addEventListener('click', function () {
      const text = Array.from(document.querySelectorAll('.log-feed-line')).map(function (line) { return line.textContent; }).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'beamadmin-' + current + '-log.txt';
      link.click();
      URL.revokeObjectURL(link.href);
    });
    await loadLogs();
    pageTimer = setInterval(loadLogs, 5000);
  } catch (err) {
    renderError(err.message, renderLogsPage);
  }
}
