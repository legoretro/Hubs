(function(){
  'use strict';

  function clientId() {
    var key = 'mls-safe-sync-client-id';
    try {
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var fresh = 'client_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      localStorage.setItem(key, fresh);
      return fresh;
    } catch(e) {
      return 'client_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    }
  }

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stable(value) {
    return JSON.stringify(value === undefined ? null : value);
  }

  function same(a, b) {
    return stable(a) === stable(b);
  }

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function isIndex(key) {
    return String(Number(key)) === String(key);
  }

  function skipPath(path) {
    var last = path[path.length - 1];
    return last === 'updatedAt' || last === '__updatedAt';
  }

  function diffPaths(base, local, prefix, out) {
    prefix = prefix || [];
    out = out || [];
    if (same(base, local)) return out;
    if (skipPath(prefix)) return out;
    if (Array.isArray(base) && Array.isArray(local)) {
      var len = Math.max(base.length, local.length);
      for (var i = 0; i < len; i++) diffPaths(base[i], local[i], prefix.concat(String(i)), out);
      return out;
    }
    if (isObject(base) && isObject(local)) {
      var keys = {};
      Object.keys(base).forEach(function(k){ keys[k] = true; });
      Object.keys(local).forEach(function(k){ keys[k] = true; });
      Object.keys(keys).forEach(function(k){ diffPaths(base[k], local[k], prefix.concat(k), out); });
      return out;
    }
    out.push(prefix);
    return out;
  }

  function getAt(obj, path) {
    var cur = obj;
    for (var i = 0; i < path.length; i++) {
      if (cur == null) return undefined;
      cur = cur[path[i]];
    }
    return cur;
  }

  function setAt(obj, path, value) {
    if (!path.length) return clone(value);
    var cur = obj;
    for (var i = 0; i < path.length - 1; i++) {
      var key = path[i];
      if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = isIndex(path[i + 1]) ? [] : {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = clone(value);
    return obj;
  }

  function pathLabel(path) {
    return path.length ? path.join('.') : '(whole document)';
  }

  function mergeLocalChanges(base, remote, local, dirty) {
    var merged = clone(remote);
    var conflicts = [];
    dirty.forEach(function(path) {
      if (same(getAt(remote, path), getAt(base, path))) {
        merged = setAt(merged, path, getAt(local, path));
      } else {
        conflicts.push(pathLabel(path));
      }
    });
    return { data: merged, conflicts: conflicts };
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var message = text;
          try {
            var body = JSON.parse(text);
            message = body.message || body.details || body.hint || text;
          } catch(e) {}
          throw new Error(message || ('HTTP ' + response.status));
        });
      }
      return response.text().then(function(text) { return text ? JSON.parse(text) : null; });
    });
  }

  function makeDoc(options) {
    var id = options.id;
    var table = options.table;
    var url = options.url.replace(/\/$/, '');
    var key = options.key;
    var headers = { apikey:key, Authorization:'Bearer ' + key, 'Content-Type':'application/json' };
    var doc = {
      id:id,
      version:0,
      updatedAt:null,
      baseData:clone((options.defaultData && options.defaultData()) || {}),
      saveTimer:null,
      saveInFlight:null,
      blocked:false,
      lastConflict:null,
      channel:null
    };

    function toast(message, isError) {
      if (options.toast) options.toast(message, !!isError);
    }

    function normalize(data) {
      var value = data == null ? ((options.defaultData && options.defaultData()) || {}) : data;
      return options.normalize ? options.normalize(clone(value)) : clone(value);
    }

    function localData() {
      return normalize(options.getLocal ? options.getLocal() : doc.baseData);
    }

    function applyLocal(data, source) {
      if (options.setLocal) options.setLocal(clone(data), { source:source, id:id, version:doc.version });
    }

    function rpcSave(data, expectedVersion, reason) {
      return fetchJson(url + '/rest/v1/rpc/mls_safe_save_doc', {
        method:'POST',
        headers:headers,
        body:JSON.stringify({
          p_id:id,
          p_data:data,
          p_expected_version:expectedVersion,
          p_client_id:window.MLS_SAFE_SYNC_CLIENT_ID,
          p_save_reason:reason || 'auto'
        })
      }).then(function(result) {
        return Array.isArray(result) ? result[0] : result;
      });
    }

    function markSaved(data, result, apply) {
      doc.version = Number(result.version || doc.version || 0);
      doc.updatedAt = result.updated_at || null;
      doc.baseData = normalize(result.data || data);
      doc.blocked = false;
      doc.lastConflict = null;
      if (apply) applyLocal(doc.baseData, 'save');
      toast('Saved to Supabase');
      return true;
    }

    function dirtyAgainstBase(data) {
      return diffPaths(doc.baseData, data).filter(function(path) { return !skipPath(path); });
    }

    function saveAttempt(data, expectedVersion, applyAfterSave, reason) {
      return rpcSave(data, expectedVersion, reason).then(function(result) {
        if (!result) throw new Error('Empty save response');
        if (result.status === 'saved') return markSaved(data, result, applyAfterSave);
        if (result.status !== 'conflict') throw new Error(result.message || 'Unexpected save response');
        var remote = normalize(result.data || {});
        var dirty = dirtyAgainstBase(data);
        var merged = mergeLocalChanges(doc.baseData, remote, data, dirty);
        if (merged.conflicts.length) {
          doc.blocked = true;
          doc.lastConflict = { id:id, paths:merged.conflicts, remote:remote, local:data };
          toast('Conflict: another admin changed the same content. Your edit was not overwritten. Reload or copy your edit before continuing.', true);
          if (options.onConflict) options.onConflict(doc.lastConflict);
          return false;
        }
        doc.version = Number(result.version || doc.version || 0);
        doc.baseData = remote;
        return saveAttempt(merged.data, doc.version, true, reason);
      });
    }

    function loadLegacyWithoutVersion() {
      return fetchJson(url + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + '&select=id,data', {
        headers:{ apikey:key, Authorization:'Bearer ' + key }
      }).then(function(rows) {
        var row = rows && rows[0];
        doc.version = 0;
        doc.updatedAt = null;
        doc.baseData = normalize(row ? row.data : null);
        doc.blocked = false;
        doc.lastConflict = null;
        applyLocal(doc.baseData, 'load');
        toast('Safe sync SQL is not installed yet. Existing data loaded, but safe online saves need the SQL migration.', true);
        return clone(doc.baseData);
      });
    }

    doc.load = function() {
      return fetchJson(url + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + '&select=id,data,version,updated_at,last_client_id', {
        headers:{ apikey:key, Authorization:'Bearer ' + key }
      }).then(function(rows) {
        var row = rows && rows[0];
        doc.version = Number((row && row.version) || 0);
        doc.updatedAt = row && row.updated_at || null;
        doc.baseData = normalize(row ? row.data : null);
        doc.blocked = false;
        doc.lastConflict = null;
        applyLocal(doc.baseData, 'load');
        return clone(doc.baseData);
      }).catch(function(error) {
        if (/version|updated_at|last_client_id/i.test(error.message || '')) return loadLegacyWithoutVersion();
        throw error;
      });
    };

    function saveReason(options) {
      if (typeof options === 'string') return options || 'auto';
      if (options && typeof options === 'object' && options.reason) return options.reason;
      return 'auto';
    }

    doc.saveNow = function(options) {
      var reason = saveReason(options);
      clearTimeout(doc.saveTimer);
      if (doc.blocked) {
        toast('Conflict still needs review. Save blocked so no one loses work.', true);
        return Promise.resolve(false);
      }
      if (doc.saveInFlight) return doc.saveInFlight.then(function(){ return doc.saveNow(reason); });
      var data = localData();
      var dirty = dirtyAgainstBase(data);
      if (!dirty.length) return Promise.resolve(true);
      doc.saveInFlight = saveAttempt(data, doc.version, false, reason).catch(function(error) {
        console.error('Safe Supabase save failed for ' + id + ':', error);
        toast('Supabase save failed: ' + error.message, true);
        return false;
      }).finally(function() {
        doc.saveInFlight = null;
      });
      return doc.saveInFlight;
    };

    doc.scheduleSave = function(delay, reason) {
      clearTimeout(doc.saveTimer);
      doc.saveTimer = setTimeout(function(){ doc.saveNow({ reason:reason || 'auto' }); }, delay || 1600);
    };

    doc.handleRemote = function(row) {
      if (!row || row.id !== id) return;
      var remoteVersion = Number(row.version || 0);
      if (remoteVersion <= doc.version) return;
      if (row.last_client_id && row.last_client_id === window.MLS_SAFE_SYNC_CLIENT_ID) {
        doc.version = remoteVersion;
        doc.updatedAt = row.updated_at || null;
        doc.baseData = normalize(row.data || {});
        doc.blocked = false;
        doc.lastConflict = null;
        return;
      }
      var remote = normalize(row.data || {});
      var local = localData();
      var dirty = dirtyAgainstBase(local);
      if (!dirty.length) {
        doc.version = remoteVersion;
        doc.updatedAt = row.updated_at || null;
        doc.baseData = remote;
        doc.blocked = false;
        doc.lastConflict = null;
        applyLocal(remote, 'remote');
        toast('Updated from another admin');
        return;
      }
      var merged = mergeLocalChanges(doc.baseData, remote, local, dirty);
      if (merged.conflicts.length) {
        doc.blocked = true;
        doc.lastConflict = { id:id, paths:merged.conflicts, remote:remote, local:local };
        toast('Realtime conflict: another admin edited the same content. Your local edit is still on screen but saving is blocked.', true);
        if (options.onConflict) options.onConflict(doc.lastConflict);
        return;
      }
      doc.version = remoteVersion;
      doc.updatedAt = row.updated_at || null;
      doc.baseData = remote;
      doc.blocked = false;
      doc.lastConflict = null;
      applyLocal(merged.data, 'remote-merge');
      toast('Synced another admin; your unsaved edits stayed');
    };

    doc.subscribe = function() {
      if (!window.supabase || !window.supabase.createClient) {
        toast('Realtime unavailable: Supabase JS did not load.', true);
        return null;
      }
      var client = window.MLS_SAFE_SYNC_SUPABASE || window.supabase.createClient(url, key, {
        auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
      });
      window.MLS_SAFE_SYNC_SUPABASE = client;
      doc.channel = client.channel('safe-sync-' + id + '-' + window.MLS_SAFE_SYNC_CLIENT_ID)
        .on('postgres_changes', { event:'*', schema:'public', table:table, filter:'id=eq.' + id }, function(payload) {
          doc.handleRemote(payload.new);
        })
        .subscribe(function(status) {
          if (status === 'CHANNEL_ERROR') toast('Realtime sync connection failed for ' + id, true);
        });
      return doc.channel;
    };

    doc.isBlocked = function() {
      return !!doc.blocked;
    };

    doc.getConflict = function() {
      return doc.lastConflict ? clone(doc.lastConflict) : null;
    };

    return doc;
  }

  function sharedClient(url, key) {
    var cleanedUrl = url.replace(/\/$/, '');
    if (!window.supabase || !window.supabase.createClient) return null;
    window.MLS_SAFE_SYNC_SUPABASE = window.MLS_SAFE_SYNC_SUPABASE || window.supabase.createClient(cleanedUrl, key, {
      auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }
    });
    return window.MLS_SAFE_SYNC_SUPABASE;
  }

  function makePresence(options) {
    var url = options.url.replace(/\/$/, '');
    var key = options.key;
    var hubId = options.hubId || 'hub';
    var hubName = options.hubName || hubId;
    var state = {
      clientId:window.MLS_SAFE_SYNC_CLIENT_ID,
      hubId:hubId,
      hubName:hubName,
      joinedAt:Date.now(),
      isAdmin:false,
      section:'',
      field:'',
      typingUntil:0,
      at:Date.now()
    };
    var client = sharedClient(url, key);
    var channel = null;
    var indicator = null;
    var trackTimer = null;
    var subscribed = false;
    var lastPayload = '';

    function toast(message, isError) {
      if (options.toast) options.toast(message, !!isError);
    }

    function currentSection() {
      if (options.getSection) {
        try { return options.getSection() || state.section || ''; } catch(e) {}
      }
      return state.section || '';
    }

    function describeElement(el) {
      if (!el || !el.closest) return '';
      var labeled = el.closest('[aria-label],[placeholder],[data-section],[data-table],[data-field],[data-action],[data-ui-action],[data-note-key],[data-case-field],[data-result-field],[data-pad-field],[data-object-field],[data-chart-field],[data-species-field],[data-image-field]');
      var parts = [];
      if (labeled) {
        var ds = labeled.dataset || {};
        ['section','table','field','noteKey','caseField','resultField','padField','objectField','chartField','speciesField','imageField','action','uiAction'].forEach(function(keyName) {
          if (ds[keyName]) parts.push(ds[keyName]);
        });
        if (ds.caseIndex) parts.push('case ' + (Number(ds.caseIndex) + 1));
        if (ds.resultIndex) parts.push('result ' + (Number(ds.resultIndex) + 1));
        if (ds.objectIndex) parts.push('object ' + (Number(ds.objectIndex) + 1));
        if (ds.row) parts.push('row ' + ds.row);
        if (ds.col) parts.push('col ' + ds.col);
        if (labeled.getAttribute('aria-label')) parts.push(labeled.getAttribute('aria-label'));
        if (labeled.getAttribute('placeholder')) parts.push(labeled.getAttribute('placeholder'));
      }
      if (!parts.length && el.name) parts.push(el.name);
      if (!parts.length && el.id) parts.push(el.id);
      return parts.join(' / ').slice(0, 90);
    }

    function ensureIndicator() {
      if (indicator) return indicator;
      indicator = document.createElement('div');
      indicator.className = 'safe-sync-presence';
      indicator.setAttribute('aria-live', 'polite');
      indicator.style.cssText = [
        'position:fixed',
        'left:16px',
        'bottom:16px',
        'z-index:2147483000',
        'max-width:360px',
        'padding:10px 12px',
        'border:1px solid rgba(192,23,61,.22)',
        'border-radius:12px',
        'background:rgba(255,255,255,.96)',
        'box-shadow:0 12px 30px rgba(90,20,40,.14)',
        'color:#6b1028',
        'font:700 13px/1.35 Georgia,serif',
        'display:none'
      ].join(';');
      document.body.appendChild(indicator);
      return indicator;
    }

    function flattenPresence() {
      if (!channel || !channel.presenceState) return [];
      var raw = channel.presenceState() || {};
      var byClient = {};
      Object.keys(raw).forEach(function(keyName) {
        (raw[keyName] || []).forEach(function(item) {
          if (!item || item.hubId !== hubId || !item.clientId) return;
          var existing = byClient[item.clientId];
          if (!existing || Number(item.at || 0) >= Number(existing.at || 0)) byClient[item.clientId] = item;
        });
      });
      return Object.keys(byClient).map(function(clientId){ return byClient[clientId]; }).sort(function(a, b) {
        var aj = Number(a.joinedAt || 0);
        var bj = Number(b.joinedAt || 0);
        if (aj !== bj) return aj - bj;
        return String(a.clientId).localeCompare(String(b.clientId));
      }).map(function(item, index) {
        var copy = clone(item);
        copy.adminName = 'Admin ' + (index + 1);
        return copy;
      });
    }

    function render() {
      var box = ensureIndicator();
      var list = flattenPresence();
      var mine = list.filter(function(item){ return item.clientId === state.clientId; })[0];
      var others = list.filter(function(item){ return item.clientId !== state.clientId; });
      var editing = others.filter(function(item){ return !!item.isAdmin; });
      var typing = editing.filter(function(item){ return Number(item.typingUntil || 0) > Date.now(); });
      var online = others.filter(function(item){ return !item.isAdmin; });
      if (!state.isAdmin && !editing.length) {
        box.style.display = 'none';
        return;
      }
      var title = 'You are ' + ((mine && mine.adminName) || 'Admin 1');
      if (typing.length === 1) title = typing[0].adminName + ' is typing';
      else if (typing.length > 1) title = typing.length + ' admins are typing';
      else if (editing.length === 1) title = editing[0].adminName + ' is editing';
      else if (editing.length > 1) title = editing.length + ' admins are editing';
      var lines = [];
      editing.forEach(function(item) {
        var where = item.section || item.hubName || '';
        var field = item.field ? ' · ' + item.field : '';
        var verb = Number(item.typingUntil || 0) > Date.now() ? 'typing in ' : '';
        lines.push(item.adminName + ': ' + verb + where + field);
      });
      online.forEach(function(item) {
        lines.push(item.adminName + ' online');
      });
      box.innerHTML = '<div style="font-size:14px;margin-bottom:3px">' + title + '</div>' +
        (lines.length ? '<div style="font-weight:600;color:#8a6570">' + lines.map(function(line){ return line.replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }).join('<br>') + '</div>' : '');
      box.style.display = 'block';
    }

    function payload() {
      state.section = currentSection();
      if (state.typingUntil && state.typingUntil <= Date.now()) state.typingUntil = 0;
      state.at = Date.now();
      return clone(state);
    }

    function trackNow() {
      if (!channel || !subscribed) return;
      var next = payload();
      var packed = stable(next);
      if (packed === lastPayload) {
        render();
        return;
      }
      lastPayload = packed;
      channel.track(next).then(render).catch(function(error) {
        console.warn('Presence update failed:', error);
      });
    }

    function scheduleTrack(delay) {
      clearTimeout(trackTimer);
      trackTimer = setTimeout(trackNow, delay || 600);
    }

    function markTyping(el) {
      state.field = describeElement(el);
      state.typingUntil = Date.now() + 3600;
      scheduleTrack(120);
      setTimeout(function() {
        if (state.typingUntil && state.typingUntil <= Date.now()) trackNow();
      }, 3800);
    }

    function subscribe() {
      if (!client) {
        toast('Realtime presence unavailable: Supabase JS did not load.', true);
        return null;
      }
      channel = client.channel('safe-presence-' + hubId, { config:{ presence:{ key:state.clientId } } })
        .on('presence', { event:'sync' }, render)
        .on('presence', { event:'join' }, render)
        .on('presence', { event:'leave' }, render)
        .subscribe(function(status) {
          if (status === 'SUBSCRIBED') {
            subscribed = true;
            trackNow();
          }
          if (status === 'CHANNEL_ERROR') toast('Realtime admin presence connection failed.', true);
        });
      return channel;
    }

    document.addEventListener('focusin', function(event) {
      if (!state.isAdmin) return;
      state.field = describeElement(event.target);
      scheduleTrack(250);
    });
    document.addEventListener('input', function(event) {
      if (!state.isAdmin) return;
      markTyping(event.target);
    }, true);
    document.addEventListener('change', function(event) {
      if (!state.isAdmin) return;
      markTyping(event.target);
    }, true);

    subscribe();

    return {
      setAdminMode:function(value) {
        state.isAdmin = !!value;
        if (!state.isAdmin) {
          state.field = '';
          state.typingUntil = 0;
        }
        trackNow();
      },
      setSection:function(section) {
        state.section = section || '';
        scheduleTrack(200);
      },
      setField:function(field) {
        state.field = field || '';
        scheduleTrack(200);
      },
      refresh:trackNow,
      destroy:function() {
        clearTimeout(trackTimer);
        if (channel && client) client.removeChannel(channel);
        if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
      }
    };
  }

  window.MLS_SAFE_SYNC_CLIENT_ID = window.MLS_SAFE_SYNC_CLIENT_ID || clientId();
  window.createSafeSupabaseDoc = makeDoc;
  window.createSafeSupabasePresence = makePresence;
})();
