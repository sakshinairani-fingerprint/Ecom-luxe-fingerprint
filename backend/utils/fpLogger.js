// ANSI colour helpers
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  white:  '\x1b[37m',
};

function flag(value, dangerValue = true, goodValue = false) {
  if (value === dangerValue) return `${c.red}${c.bold}${value}${c.reset}`;
  if (value === goodValue || value === false || value === 'good')
    return `${c.green}${value}${c.reset}`;
  if (value === null || value === undefined) return `${c.dim}—${c.reset}`;
  return `${c.yellow}${value}${c.reset}`;
}

function score(value) {
  if (value === null || value === undefined) return `${c.dim}—${c.reset}`;
  if (value >= 50) return `${c.red}${c.bold}${value}${c.reset}`;
  if (value >= 20) return `${c.yellow}${value}${c.reset}`;
  return `${c.green}${value}${c.reset}`;
}

function outcome(label, blocked) {
  return blocked
    ? `  ${c.red}${c.bold}● BLOCKED${c.reset}  ${c.dim}${label}${c.reset}`
    : `  ${c.green}${c.bold}● ALLOWED${c.reset}  ${c.dim}${label}${c.reset}`;
}

/**
 * Print a formatted Fingerprint signal block to the terminal.
 *
 * @param {string} route   - e.g. 'SIGNUP', 'LOGIN', 'COUPON', 'ORDER'
 * @param {object} fpEvent - the raw event object from getEvent()
 * @param {string} result  - short description of what happened next, e.g. 'allowed' or 'bot blocked'
 * @param {boolean} blocked
 */
export function logFpEvent(route, fpEvent, result = '', blocked = false) {
  const width = 62;
  const title = ` Fingerprint · ${route} `;
  const dashes = '─'.repeat(Math.max(0, width - title.length - 2));

  const visitorId = fpEvent?.identification?.visitor_id ?? null;
  const eventId   = fpEvent?.event_id ?? fpEvent?.identification?.request_id ?? null;
  const browser   = [
    fpEvent?.browser_details?.browser_name,
    fpEvent?.browser_details?.browser_version,
  ].filter(Boolean).join(' ') || null;
  const os        = fpEvent?.browser_details?.os_name ?? null;
  const ip        = fpEvent?.ip_address ?? null;

  const row = (label, value) => {
    const padded = label.padEnd(14);
    return `│  ${c.dim}${padded}${c.reset}${value}`;
  };

  console.log(`\n${c.cyan}┌─${title}${dashes}${c.reset}`);
  console.log(row('Visitor ID', visitorId ? `${c.white}${visitorId}${c.reset}` : `${c.dim}—${c.reset}`));
  console.log(row('Event ID',   eventId   ? `${c.dim}${eventId}${c.reset}`    : `${c.dim}—${c.reset}`));
  console.log(row('Bot',        flag(fpEvent?.bot, 'bad', 'good')));
  console.log(row('Incognito',  flag(fpEvent?.incognito, true, false)));
  console.log(row('VPN',        flag(fpEvent?.vpn, true, false)));
  console.log(row('Proxy',      flag(fpEvent?.proxy, true, false)));
  console.log(row('Suspect',    score(fpEvent?.suspect_score)));
  console.log(row('Browser',    browser ? `${c.dim}${browser}${c.reset}` : `${c.dim}—${c.reset}`));
  console.log(row('OS',         os      ? `${c.dim}${os}${c.reset}`      : `${c.dim}—${c.reset}`));
  console.log(row('IP',         ip      ? `${c.dim}${ip}${c.reset}`      : `${c.dim}—${c.reset}`));
  console.log(`${c.cyan}└${'─'.repeat(width)}${c.reset}`);
  console.log(outcome(result, blocked));
  console.log();
}

export function logFpError(route, message) {
  console.log(`\n${c.red}┌─ Fingerprint · ${route} ─ ERROR ${'─'.repeat(20)}${c.reset}`);
  console.log(`│  ${c.red}${message}${c.reset}`);
  console.log(`${c.red}└${'─'.repeat(62)}${c.reset}\n`);
}
