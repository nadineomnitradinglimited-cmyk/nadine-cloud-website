// Is this copy of the Nadine Cloud server allowed to run background jobs (auto-deploys, payment checks,
// reminders/pausing)? On InMotion: always yes. On the STANDBY server (env NC_STANDBY=1) the jobs stay asleep,
// so clients never get double emails/actions — until the standby takes over, which creates the flag file
// /etc/nc-standby/ACTIVE (or the path in NC_ACTIVE_FLAG). Checked every time, so switching needs no restart.
const fs = require('fs');

function isPrimary() {
  if (process.env.NC_STANDBY !== '1') return true;
  try { return fs.existsSync(process.env.NC_ACTIVE_FLAG || '/etc/nc-standby/ACTIVE'); } catch { return false; }
}

module.exports = { isPrimary };
