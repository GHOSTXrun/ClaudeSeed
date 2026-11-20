(() => {
  const byId = id => document.getElementById(id);
  const talk = byId('talkArea');
  const connect = [...document.querySelectorAll('[data-action="connect"]')];
  const lights = ['#b5fd0c', '#ffd45e', '#ff9e55', '#cdebff', '#fff1e2'];
  const names = ['Ember', 'Crate', 'Patch', 'Pixel', 'Relay', 'Tinker', 'Mica', 'Pip'];
  const eyes = ['Classic', 'Visor', 'Square'];
  const accessories = ['Air vents', 'Antenna', 'Tape seal', 'Corner badge'];
  let provider;
  let session;
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
    byId('chatStatus').textContent = next.configured ? 'Recent messages are kept for this sign-in.' : 'Claude chat needs a server API key.';
  }

  async function signIn() {
    if (busy) return;
    if (session?.address) { location.hash = 'talk'; return; }
    busy = true;
    connect.forEach(button => { button.disabled = true; });
    try {
      const wallet = window.phantom?.solana ?? window.solflare;
      if (!wallet?.connect || !wallet?.signMessage) throw new Error('Open ClaudeBox with Phantom or Solflare installed.');
      const result = await wallet.connect();
      const address = (result?.publicKey ?? wallet.publicKey)?.toString();
      if (!address) throw new Error('Wallet did not provide a public key.');
      const challenge = await api('challenge', {address});
      const signed = await wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
      const signature = Array.from(signed.signature ?? signed, value => value.toString(16).padStart(2, '0')).join('');
      const next = await api('verify', {nonce: challenge.nonce, signature});
      provider = wallet;
      wallet.off?.('accountChanged', signOut);
      wallet.off?.('disconnect', signOut);
      wallet.on?.('accountChanged', signOut);
      wallet.on?.('disconnect', signOut);
      if (wallet.publicKey?.toString() !== address) { await signOut(); return; }
      await renderSession(next);
      location.hash = 'talk';
    } catch (error) {
      notify(error.message || 'Wallet sign-in did not complete.');
    } finally {
      busy = false;
      connect.forEach(button => { button.disabled = false; });
    }
  }

  async function signOut() {
    provider?.off?.('accountChanged', signOut);
    provider?.off?.('disconnect', signOut);
    provider = undefined;
    try {
      await api('logout', {});
      await renderSession({address: null, configured: session?.configured});
    } catch (error) {
      notify(error.message);
    }
  }

  connect.forEach(button => button.addEventListener('click', signIn));
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
