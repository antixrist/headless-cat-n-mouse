// initial detects from @antoinevastel
//   http://antoinevastel.github.io/bot%20detection/2018/01/17/detect-chrome-headless-v2.html

module.exports = async function() {
  const results = {};

  async function test(name, fn) {
    const detectionPassed = await fn();
    if (detectionPassed) console.log(`Chrome headless detected via ${name}`);
    results[name] = detectionPassed;
  }

  await test('userAgent', _ => {
    return /HeadlessChrome/.test(window.navigator.userAgent);
  });

  // Detects the --enable-automation || --headless flags
  // Will return true in headful if --enable-automation is provided
  await test('navigator.webdriver present', _ => {
    return navigator.webdriver;
  });

  await test('window.chrome missing', _ => {
    return /Chrome/.test(window.navigator.userAgent) && !window.chrome;
  });

  await test('permissions API', async _ => {
    const permissionStatus = await navigator.permissions.query({name: 'notifications'});
    return Notification.permission === 'denied' && permissionStatus.state === 'prompt';
  });

  await test('permissions API overriden', _ => {
    const permissions = window.navigator.permissions;
    if (permissions.query.toString() !== 'function query() { [native code] }') return true;
    if (permissions.query.toString.toString() !== 'function toString() { [native code] }') return true;
    if (
      permissions.query.toString.hasOwnProperty('[[Handler]]') &&
      permissions.query.toString.hasOwnProperty('[[Target]]') &&
      permissions.query.toString.hasOwnProperty('[[IsRevoked]]')
    ) return true;
    if (permissions.hasOwnProperty('query')) return true;
  });

  await test('navigator.plugins empty', _ => {
    return navigator.plugins.length === 0;
  });

  await test('navigator.languages blank', _ => {
    return navigator.languages === '';
  });

  await test('iFrame for fresh window object', _ => {
    // evaluateOnNewDocument scripts don't apply within [srcdoc] (or [sandbox]) iframes
    // https://github.com/GoogleChrome/puppeteer/issues/1106#issuecomment-359313898
    const iframe = document.createElement('iframe');
    iframe.srcdoc = 'page intentionally left blank';
    document.body.appendChild(iframe);

    // Here we would need to rerun all tests with `iframe.contentWindow` as `window`
    // Example:
    return iframe.contentWindow.navigator.plugins.length === 0
  });

  // This detects that a devtools protocol agent is attached. 
  // So it will also pass true in headful Chrome if the devtools window is attached
  await test('toString', _ => {
    let gotYou = 0;
    const spooky = /./;
    spooky.toString = function() {
      gotYou++;
      return 'spooky';
    }
    console.debug(spooky);
    return gotYou > 1;
  });

  return results;
};
