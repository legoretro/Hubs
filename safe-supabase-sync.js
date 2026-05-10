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

    function rpcSave(data, expectedVersion) {
      return fetchJson(url + '/rest/v1/rpc/mls_safe_save_doc', {
        method:'POST',
        headers:headers,
        body:JSON.stringify({
          p_id:id,
          p_data:data,
          p_expected_version:expectedVersion,
          p_client_id:window.MLS_SAFE_SYNC_CLIENT_ID
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
      if (apply) applyLocal(doc.baseData, 'save');
      toast('Saved to Supabase');
      return true;
    }

    function dirtyAgainstBase(data) {
      return diffPaths(doc.baseData, data).filter(function(path) { return !skipPath(path); });
    }

    function saveAttempt(data, expectedVersion, applyAfterSave) {
      return rpcSave(data, expectedVersion).then(function(result) {
        if (!result) throw new Error('Empty save response');
        if (result.status === 'saved') return markSaved(data, result, applyAfterSave);
        if (result.status !== 'conflict') throw new Error(result.message || 'Unexpected save response');
        var remote = normalize(result.data || {});
        var dirty = dirtyAgainstBase(data);
        var merged = mergeLocalChanges(doc.baseData, remote, data, dirty);
        if (merged.conflicts.length) {
          doc.blocked = true;
          toast('Conflict: another admin changed the same content. Your edit was not overwritten. Reload or copy your edit before continuing.', true);
          if (options.onConflict) options.onConflict({ id:id, paths:merged.conflicts, remote:remote, local:data });
          return false;
        }
        doc.version = Number(result.version || doc.version || 0);
        doc.baseData = remote;
        return saveAttempt(merged.data, doc.version, true);
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
        applyLocal(doc.baseData, 'load');
        return clone(doc.baseData);
      }).catch(function(error) {
        if (/version|updated_at|last_client_id/i.test(error.message || '')) return loadLegacyWithoutVersion();
        throw error;
      });
    };

    doc.saveNow = function() {
      clearTimeout(doc.saveTimer);
      if (doc.blocked) {
        toast('Conflict still needs review. Save blocked so no one loses work.', true);
        return Promise.resolve(false);
      }
      if (doc.saveInFlight) return doc.saveInFlight.then(function(){ return doc.saveNow(); });
      var data = localData();
      var dirty = dirtyAgainstBase(data);
      if (!dirty.length) return Promise.resolve(true);
      doc.saveInFlight = saveAttempt(data, doc.version, false).catch(function(error) {
        console.error('Safe Supabase save failed for ' + id + ':', error);
        toast('Supabase save failed: ' + error.message, true);
        return false;
      }).finally(function() {
        doc.saveInFlight = null;
      });
      return doc.saveInFlight;
    };

    doc.scheduleSave = function(delay) {
      clearTimeout(doc.saveTimer);
      doc.saveTimer = setTimeout(function(){ doc.saveNow(); }, delay || 700);
    };

    doc.handleRemote = function(row) {
      if (!row || row.id !== id) return;
      var remoteVersion = Number(row.version || 0);
      if (remoteVersion <= doc.version) return;
      if (row.last_client_id && row.last_client_id === window.MLS_SAFE_SYNC_CLIENT_ID) {
        doc.version = remoteVersion;
        doc.updatedAt = row.updated_at || null;
        doc.baseData = normalize(row.data || {});
        return;
      }
      var remote = normalize(row.data || {});
      var local = localData();
      var dirty = dirtyAgainstBase(local);
      if (!dirty.length) {
        doc.version = remoteVersion;
        doc.updatedAt = row.updated_at || null;
        doc.baseData = remote;
        applyLocal(remote, 'remote');
        toast('Updated from another admin');
        return;
      }
      var merged = mergeLocalChanges(doc.baseData, remote, local, dirty);
      if (merged.conflicts.length) {
        doc.blocked = true;
        toast('Realtime conflict: another admin edited the same content. Your local edit is still on screen but saving is blocked.', true);
        if (options.onConflict) options.onConflict({ id:id, paths:merged.conflicts, remote:remote, local:local });
        return;
      }
      doc.version = remoteVersion;
      doc.updatedAt = row.updated_at || null;
      doc.baseData = remote;
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

    return doc;
  }

  window.MLS_SAFE_SYNC_CLIENT_ID = window.MLS_SAFE_SYNC_CLIENT_ID || clientId();
  window.createSafeSupabaseDoc = makeDoc;
})();
