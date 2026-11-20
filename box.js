(() => {
  const byId = id => document.getElementById(id);
  const talk = byId('talkArea');
  const connect = [...document.querySelectorAll('[data-action="connect"]')];
  const lights = ['#b5fd0c', '#ffd45e', '#ff9e55', '#cdebff', '#fff1e2'];
  const names = ['Ember', 'Crate', 'Patch', 'Pixel', 'Relay', 'Tinker', 'Mica', 'Pip'];
  const eyes = ['Classic', 'Visor', 'Square'];
  const accessories = ['Air vents', 'Antenna', 'Tape seal', 'Corner badge'];
  const catalog = [
    [
      "Ember",
      "FOCUS",
      "Turns a messy brief into the next three steps."
    ],
    [
      "Crate",
      "RECALL",
      "Keeps track of decisions and the details behind them."
    ],
    [
      "Patch",
      "WIT",
      "Finds a small fix when a big rewrite can wait."
    ],
    [
      "Pixel",
      "CURIOSITY",
      "Checks the edge cases hidden in a polished design."
    ],
    [
      "Relay",
      "FOCUS",
      "Writes handoffs the next person can pick up quickly."
    ],
    [
      "Tinker",
      "CURIOSITY",
      "Builds a quick prototype to answer a specific question."
    ],
    [
      "Mica",
      "RECALL",
      "Keeps notes tidy and easy to revisit."
    ],
    [
      "Pip",
      "WIT",
      "Makes long explanations short enough to use."
    ],
    [
      "Beacon",
      "FOCUS",
      "Finds the next step when a project stalls."
    ],
    [
      "Sprocket",
      "CURIOSITY",
      "Follows moving parts until the system makes sense."
    ],
    [
      "Fold",
      "FOCUS",
      "Turns scattered notes into an outline."
    ],
    [
      "Scout",
      "CURIOSITY",
      "Looks for the assumptions a plan depends on."
    ],
    [
      "Spool",
      "RECALL",
      "Picks up the thread from the last conversation."
    ],
    [
      "Latch",
      "FOCUS",
      "Works through one checklist item at a time."
    ],
    [
      "Glint",
      "WIT",
      "Spots the one detail that changes a draft."
    ],
    [
      "Parcel",
      "RECALL",
      "Packs the context others need to take over."
    ],
    [
      "Dot",
      "WIT",
      "Turns a blank page into a first draft."
    ],
    [
      "Volt",
      "CURIOSITY",
      "Tests an unusual idea before ruling it out."
    ]
  ];
  let provider;
  let session;
  const picker = byId('walletPicker');
  const wallets = {
    phantom: ['Phantom', () => window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null)],
    backpack: ['Backpack', () => window.backpack?.solana ?? window.backpack ?? (window.solana?.isBackpack ? window.solana : null)],
    solflare: ['Solflare', () => window.solflare?.solana ?? window.solflare]
  };
  let busy = false;
  let generation = 0;

  function decodeAddress(address) {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return false;
    let n = 0n;
    for (const char of address) n = n * 58n + BigInt(alphabet.indexOf(char));
    return address.match(/^1*/)[0].length + (n ? Math.ceil(n.toString(16).length / 2) : 0) === 32;
  }

  async function companion(address) {
    const data = new TextEncoder().encode('claudebox-avatar-v1:' + address);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    return {
      name: names[hash[0] % names.length] + '-' + [...hash.slice(1, 4)].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase(),
      eye: hash[4] % eyes.length,
      light: lights[hash[5] % lights.length],
      accessory: hash[6] % accessories.length,
      panels: hash.slice(7, 15)
    };
  }

  function draw(box, canvas) {
    const ctx = canvas.getContext('2d');
    function rect(color, x, y, w, h) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    ctx.clearRect(0, 0, 48, 48);
    ctx.fillStyle = '#fbba74';
    ctx.beginPath();
    ctx.moveTo(5, 14);
    ctx.lineTo(11, 5);
    ctx.lineTo(37, 5);
    ctx.lineTo(43, 14);
    ctx.fill();
    rect('#bd7b3f', 5, 14, 38, 29);
    rect('#e49b58', 6, 14, 36, 27);
    box.panels.forEach((value, index) => {
      rect(index % 2 ? '#d48d4c' : '#eea965', 7 + value % 28, 18 + index * 2, 4, 2);
    });
    rect('#77451f', 6, 16, 36, 2);
    rect('#77451f', 32, 15, 10, 4);
    for (let i = 0; i < 3; i++) rect(box.light, 33 + i * 3, 16, 2, 2);
    if (box.eye === 1) {
      rect('#190c03', 13, 23, 22, 7);
      rect(box.light, 15, 25, 18, 2);
    } else {
      for (const x of [14, 28]) {
        const height = box.eye === 0 ? 8 : 6;
        rect('#190c03', x, 23, 6, height);
        rect('#fff1e2', x + 1, 24, 2, 2);
      }
    }
    rect('#77451f', 8, 33, 11, 7);
    rect(box.light, 10, 34, 1, 1);
    rect(box.light, 11, 35, 1, 1);
    rect(box.light, 12, 36, 1, 1);
    rect(box.light, 11, 37, 1, 1);
    rect(box.light, 10, 38, 1, 1);
    rect(box.light, 14, 38, 3, 1);
    if (box.accessory === 0) {
      for (let i = 0; i < 3; i++) rect('#77451f', 35, 35 + i * 2, 5, 1);
    } else if (box.accessory === 1) {
      rect('#77451f', 32, 2, 1, 8);
      rect(box.light, 31, 1, 3, 2);
    } else if (box.accessory === 2) {
      rect('#ffe0a9', 21, 5, 6, 10);
    } else {
      rect('#77451f', 34, 34, 6, 5);
      rect(box.light, 36, 35, 2, 2);
    }
  }


  function renderCatalog() {
    for (const [index, [name, trait, description]] of catalog.entries()) {
      const box = {
        eye: index % eyes.length,
        light: lights[index % lights.length],
        accessory: Math.floor(index / eyes.length) % accessories.length,
        panels: Array.from({length: 8}, (_, panel) => (index * 17 + panel * 11) % 29)
      };
      const card = document.createElement('article');
      card.className = 'species box-profile';
      const art = document.createElement('canvas');
      art.className = 'box-art';
      art.width = art.height = 48;
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', name + ' cardboard robot');
      draw(box, art);

      const info = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'trait';
      label.textContent = trait;
      const title = document.createElement('h3');
      title.textContent = name;
      const bio = document.createElement('p');
      bio.textContent = description;
      const appearance = document.createElement('p');
      appearance.textContent = eyes[box.eye] + ' eyes · ' + accessories[box.accessory];
      info.append(label, title, bio, appearance);
      card.append(art, info);
      byId('boxCatalog').append(card);

      const item = document.createElement('div');
      item.textContent = name + ' · ' + trait;
      byId('boxCatalogIndex').append(item);
      document.querySelectorAll('[data-box-profile="' + name.toLowerCase() + '"]').forEach(canvas => draw(box, canvas));
    }
  }

  renderCatalog();

  async function api(path, data) {
    const response = await fetch('/api/' + path, data === undefined ? {} : {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      throw new Error('ClaudeBox server is unavailable. Start the Node server to use wallet sign-in and chat.');
    }
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error), {status: response.status});
    return result;
  }

  function addMessage(role, content) {
    const log = byId('chatlog');
    const line = document.createElement('p');
    line.className = role === 'assistant' ? 'botline' : 'userline';
    line.textContent = (role === 'assistant' ? talk.dataset.boxName : 'You') + ': ' + content;
    log.append(line);
    log.scrollTop = log.scrollHeight;
    return line;
  }

  async function renderSession(next) {
    const version = ++generation;
    session = next;
    const box = next.address ? await companion(next.address) : null;
    if (version !== generation) return;
    byId('walletStatus').textContent = box ? 'wallet: ' + next.address.slice(0, 4) + '…' + next.address.slice(-4) : 'wallet: —';
    byId('palStatus').textContent = box ? 'box: ' + box.name : 'box: —';
    byId('brainStatus').textContent = next.configured ? 'Claude' : 'offline';
    talk.classList.toggle('empty', !box);
    byId('chatEmpty').hidden = Boolean(box);
    byId('chatActive').hidden = !box;
    byId('walletLogout').hidden = !box;
    if (!box) return;
    talk.dataset.boxName = box.name;
    byId('boxName').textContent = box.name;
    draw(box, byId('chatBox'));
    byId('chatlog').replaceChildren();
    for (const item of next.history) addMessage(item.role, item.content);
    byId('chatInput').disabled = !next.configured;
    byId('chatSend').disabled = !next.configured;
    byId('chatStatus').textContent = next.local ? 'Wallet connected. Claude chat needs the Node service.' : next.configured ? 'Recent messages are kept for this sign-in.' : 'Claude chat needs a server API key.';
  }

  async function signIn(name) {
    if (busy) return;
    const [label, getWallet] = wallets[name];
    const wallet = getWallet();
    const status = byId('walletPickerStatus');
    if (!wallet?.connect) {
      status.textContent = 'Install or open ' + label + ' to connect.';
      return;
    }
    busy = true;
    status.textContent = 'Waiting for ' + label + '…';
    const choices = [...picker.querySelectorAll('[data-wallet]')];
    choices.forEach(button => { button.disabled = true; });
    try {
      const result = await wallet.connect();
      const address = (result?.publicKey ?? wallet.publicKey)?.toString();
      if (!address || !decodeAddress(address)) throw new Error('Wallet did not provide a valid Solana public key.');
      let next = {address, configured: false, local: true, history: []};
      let service;
      try { service = await api('session'); } catch {}
      if (service) {
        if (!wallet.signMessage) throw new Error(label + ' cannot sign messages in this browser.');
        const challenge = await api('challenge', {address});
        const signed = await wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
        const signature = Array.from(signed.signature ?? signed, value => value.toString(16).padStart(2, '0')).join('');
        next = await api('verify', {nonce: challenge.nonce, signature});
      }
      if (wallet.publicKey && wallet.publicKey.toString() !== address) {
        if (service) await api('logout', {});
        throw new Error('Wallet account changed. Connect again.');
      }
      provider = wallet;
      wallet.on?.('accountChanged', signOut);
      wallet.on?.('disconnect', signOut);
      await renderSession(next);
      if (picker.open) picker.close();
      location.hash = 'talk';
    } catch (error) {
      status.textContent = error.message || 'Wallet connection did not complete.';
    } finally {
      busy = false;
      choices.forEach(button => { button.disabled = false; });
    }
  }

  async function signOut() {
    provider?.off?.('accountChanged', signOut);
    provider?.off?.('disconnect', signOut);
    provider = undefined;
    try {
      if (!session?.local) await api('logout', {});
      await renderSession({address: null, configured: session?.configured});
    } catch (error) {
      notify(error.message);
    }
  }

  connect.forEach(button => button.addEventListener('click', () => {
    if (session?.address) { location.hash = 'talk'; return; }
    if (busy || picker.open) return;
    byId('walletPickerStatus').textContent = '';
    picker.showModal();
  }));
  picker.querySelectorAll('[data-wallet]').forEach(button => {
    button.addEventListener('click', () => signIn(button.dataset.wallet));
  });
  byId('walletLogout').addEventListener('click', signOut);
  const initialGeneration = generation;
  api('session').then(next => {
    if (generation === initialGeneration && !busy) return renderSession(next);
  }).catch(() => {});

  async function showPreview(address) {
    const box = await companion(address);
    draw(box, byId('previewBox'));
    byId('previewName').textContent = box.name;
    byId('previewTraits').textContent = eyes[box.eye] + ' eyes · ' + accessories[box.accessory];
    byId('previewResult').hidden = false;
  }

  byId('demoBtn').addEventListener('click', () => showPreview('demo').catch(error => notify(error.message)));
  byId('previewForm').addEventListener('submit', async event => {
    event.preventDefault();
    const address = byId('previewInput').value.trim();
    if (!decodeAddress(address)) { notify('Enter a valid Solana wallet address.'); return; }
    try { await showPreview(address); } catch (error) { notify(error.message); }
  });

  byId('chatForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = byId('chatInput');
    const send = byId('chatSend');
    const status = byId('chatStatus');
    const message = input.value.trim();
    if (!message || send.disabled) return;
    const version = generation;
    const line = addMessage('user', message);
    input.value = '';
    send.disabled = true;
    status.textContent = 'Claude is thinking…';
    try {
      const reply = await api('chat', {message});
      if (version === generation) {
        addMessage('assistant', reply.text);
        status.textContent = 'Recent messages are kept for this sign-in.';
      }
    } catch (error) {
      if (version === generation) {
        line.remove();
        if (!input.value) input.value = message;
        status.textContent = error.message;
        if (error.status === 401) {
          await renderSession({address: null, configured: session?.configured});
          notify(error.message);
        }
      }
    } finally {
      if (version === generation) send.disabled = false;
    }
  });
})();
