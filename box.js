(() => {
  const byId = id => document.getElementById(id);
  const talk = byId('talkArea');
  const connect = [...document.querySelectorAll('[data-action="connect"]')];
  const lights = ['#ff982f', '#ffc36d', '#ff6b55', '#55e6f4', '#fff2d9'];
  const names = ['Ember', 'Crate', 'Patch', 'Pixel', 'Relay', 'Tinker', 'Mica', 'Pip'];
  const eyes = ['Classic', 'Narrow', 'Square'];
  const accessories = ['Spark', 'Signal', 'Pixel seam', 'Corner chip'];
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
      markings: hash.slice(7, 15)
    };
  }

  function draw(box, canvas) {
    const ctx = canvas.getContext('2d');
    function rect(color, x, y, width, height) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }

    const cyan = '#00cbe5';
    const orange = '#ff780e';
    const red = '#f31d29';
    const bone = '#fff2d9';
    const shade = '#efba75';
    const ink = '#08080c';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The stepped silhouette follows the logo, with cyan on the left and warm pixels on the right.
    const bands = [
      [4, 4, 14], [8, 4, 10], [12, 4, 6], [16, 16, 3],
      [32, 4, 6], [36, 3, 10], [39, 4, 12]
    ];
    for (const [y, height, left] of bands) {
      rect(cyan, left, y, 24 - left, height);
      rect(y < 12 ? orange : red, 24, y, 24 - left, height);
    }

    rect(bone, 16, 6, 16, 5);
    rect(bone, 12, 10, 24, 5);
    rect(bone, 8, 14, 32, 5);
    rect(bone, 5, 18, 38, 13);
    rect(bone, 8, 30, 32, 5);
    rect(bone, 12, 34, 24, 3);

    for (const x of [14, 22, 30]) {
      rect(shade, x, 36, 5, 5);
      rect(bone, x, 35, 5, 4);
    }
    for (const x of [19, 27]) rect(ink, x, 38, 3, 5);

    rect(shade, 8, 31, 2, 4);
    rect(shade, 36, 31, 4, 4);
    rect('#a9edf3', 6, 19, 2, 9);
    rect('#a9edf3', 9, 15, 2, 3);
    rect(cyan, 10, 29, 2, 2);
    rect('#079ebf', 12, 31, 2, 2);
    rect(orange, 36, 29, 2, 2);
    rect(orange, 34, 31, 2, 2);

    const eyeHeight = [8, 6, 9][box.eye];
    for (const x of [10, 29]) {
      rect(ink, x, 20, 9, eyeHeight);
      rect('#ffffff', x + 2, 22, 2, 2);
    }
    rect(ink, 22, 29, 4, 4);

    const marks = [
      [[28, 8, 2, 4], [30, 10, 2, 3], [32, 12, 2, 2]],
      [[28, 8, 2, 4], [30, 8, 3, 2], [31, 11, 2, 2]],
      [[29, 8, 2, 3], [31, 10, 2, 3], [33, 12, 2, 2]],
      [[29, 8, 3, 3], [32, 10, 3, 3]]
    ];
    for (const [x, y, width, height] of marks[box.accessory]) {
      rect(box.light, x, y, width, height);
    }
    rect(shade, 13 + box.markings[0] % 7, 10 + box.markings[1] % 5, 1, 1);
  }

  function renderCatalog() {
    for (const [index, [name, trait, description]] of catalog.entries()) {
      const box = {
        eye: index % eyes.length,
        light: lights[index % lights.length],
        accessory: Math.floor(index / eyes.length) % accessories.length,
        markings: Array.from({length: 8}, (_, panel) => (index * 17 + panel * 11) % 29)
      };
      const card = document.createElement('article');
      card.className = 'species box-profile';
      const art = document.createElement('canvas');
      art.className = 'box-art';
      art.width = art.height = 48;
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', name + ' pixel skull');
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
      throw new Error('SKULOS server is unavailable. Start the Node server to use wallet sign-in and chat.');
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
    byId('palStatus').textContent = box ? 'pal: ' + box.name : 'pal: —';
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
