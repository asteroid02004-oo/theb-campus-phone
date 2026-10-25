(function () {
  window.campusApiFetch = async function (route, options = {}) {
    if (!['/api/status', '/api/session', '/api/chat'].includes(route)) throw Error('接口不存在。');
    const base = String(window.CAMPUS_DEPLOY?.apiBaseUrl || '').trim().replace(/\/+$/, '');
    let target;
    if (base) {
      try { target = new URL(base); } catch { throw Error('请在 config.js 填写完整的后端网址。'); }
      if (target.origin === 'null' || target.username || target.password || target.pathname !== '/' || target.search || target.hash ||
          !(target.protocol === 'https:' || target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) {
        throw Error('后端网址需要使用 HTTPS，并且不带路径、账号或参数。');
      }
    } else {
      if (location.protocol === 'file:') throw Error('请通过部署网址或本地服务器打开游戏。');
      target = new URL(location.origin);
    }
    const cross = target.origin !== location.origin;
    let response;
    try {
      response = await fetch(target.origin + route, {
        ...options, credentials: cross ? 'omit' : 'same-origin',
        signal: options.signal || AbortSignal.timeout(150000)
      });
    } catch {
      throw Error('聊天后端暂时无法连接，请稍后重试，或检查后端网址与允许访问的域名。');
    }
    if (!(response.headers.get('content-type') || '').includes('application/json')) {
      throw Error('聊天后端正在启动或未正确部署，请稍后重试；GitHub Pages 需要在 config.js 配置独立后端。');
    }
    return response;
  };
})();
