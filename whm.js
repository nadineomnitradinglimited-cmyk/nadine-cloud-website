const WHM_HOST = 'https://secure375.servconfig.com:2087';
const WHM_USER = 'nadine14';

const PACKAGES = {
  avara: { QUOTA: 5000, BWLIMIT: 25000, MAXPOP: 5, MAXADDON: 0, MAXSQL: 2 },
  elora: { QUOTA: 10000, BWLIMIT: 75000, MAXPOP: 15, MAXADDON: 0, MAXSQL: 5 },
  veyra: { QUOTA: 20000, BWLIMIT: 150000, MAXPOP: 30, MAXADDON: 2, MAXSQL: 10 },
  zyra: { QUOTA: 40000, BWLIMIT: 300000, MAXPOP: 50, MAXADDON: 4, MAXSQL: 20 },
};

async function whmRequest(pathAndQuery) {
  const token = process.env.WHM_API_TOKEN;
  if (!token) {
    const err = new Error('WHM_NOT_CONFIGURED');
    err.code = 'WHM_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${WHM_HOST}${pathAndQuery}`, {
    headers: { Authorization: `whm ${WHM_USER}:${token}` },
  });
  const body = await res.json().catch(() => null);
  return { httpStatus: res.status, body };
}

async function ensurePackagesExist() {
  const results = {};
  for (const [name, limits] of Object.entries(PACKAGES)) {
    const params = new URLSearchParams({
      'api.version': '1',
      name,
      quota: String(limits.QUOTA),
      bwlimit: String(limits.BWLIMIT),
      maxpop: String(limits.MAXPOP),
      maxsub: 'unlimited',
      maxpark: '0',
      maxaddon: String(limits.MAXADDON),
      maxsql: String(limits.MAXSQL),
      maxftp: 'unlimited',
      hasshell: '0',
      cgi: '1',
      cpmod: 'paper_lantern',
      language: 'en',
    });
    try {
      const { body } = await whmRequest(`/json-api/addpkg?${params.toString()}`);
      results[name] = body && body.metadata ? body.metadata : body;
    } catch (err) {
      results[name] = { error: err.message };
    }
  }
  return results;
}

module.exports = { whmRequest, ensurePackagesExist, PACKAGES };
