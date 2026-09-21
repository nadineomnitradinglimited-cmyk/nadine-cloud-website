// Picks the domain registrar behind checkout. Name.com is the default (Nadine Cloud's registrar).
// The old Namecheap code is kept only as an unused fallback: set DOMAIN_REGISTRAR=namecheap to bring it back.
const which = (process.env.DOMAIN_REGISTRAR || 'namecom').toLowerCase() === 'namecheap' ? 'namecheap' : 'namecom';
const impl = which === 'namecom' ? require('./namecom') : require('./namecheap');

module.exports = { ...impl, registrarName: which };
