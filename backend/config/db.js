const dns = require('dns');
const mongoose = require('mongoose');

let isConnected = false;

// Helps Atlas SRV lookups on some Windows / Node setups
dns.setDefaultResultOrder('ipv4first');
if (process.env.MONGODB_DNS_SERVER) {
  dns.setServers([process.env.MONGODB_DNS_SERVER]);
} else if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

const maskUri = (uri) => (uri.includes('@') ? uri.replace(/\/\/.*@/, '//***@') : uri);

const buildStandardUri = async (srvUri) => {
  const match = srvUri.match(/^mongodb\+srv:\/\/([^/]+)(\/[^?]*)?(\?.*)?$/);
  if (!match) throw new Error('Invalid MONGODB_URI format');

  const [, credsAndHost, dbPath = '/ludocash', query = ''] = match;
  const atIdx = credsAndHost.lastIndexOf('@');
  const host = credsAndHost.slice(atIdx + 1);
  const creds = credsAndHost.slice(0, atIdx);

  const records = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  if (!records.length) throw new Error('No MongoDB SRV records found');

  const hosts = records.map((r) => `${r.name}:${r.port}`).join(',');
  const params = new URLSearchParams(query.replace(/^\?/, ''));
  params.set('ssl', 'true');
  params.set('authSource', 'admin');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  return `mongodb://${creds}@${hosts}${dbPath}?${params.toString()}`;
};

const connectDB = async () => {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ludocash';
  mongoose.set('strictQuery', true);

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const options = { serverSelectionTimeoutMS: 15000 };

  try {
    await mongoose.connect(uri, options);
  } catch (firstErr) {
    if (!uri.startsWith('mongodb+srv://')) throw firstErr;

    console.warn('SRV connect failed, trying standard URI...', firstErr.message);
    const standardUri = await buildStandardUri(uri);
    await mongoose.connect(standardUri, options);
    uri = standardUri;
  }

  isConnected = true;
  console.log('MongoDB connected:', maskUri(uri));
};

const isDbConnected = () => isConnected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
