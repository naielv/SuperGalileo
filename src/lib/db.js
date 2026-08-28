import { browser } from '$app/environment';
import PouchDB from 'pouchdb';
import CryptoJS from 'crypto-js';

const localDbCache = new Map();
const localRawDbCache = new Map();
const liveSyncCache = new Map();

function ensureBrowser() {
	if (!browser) {
		throw new Error('PouchDB only runs in the browser context.');
	}
}

function trim(value) {
	return (value ?? '').toString().trim();
}

export function safeRandomString(length = 8) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const chars_nonNumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	let result = '';
	result += chars_nonNumeric.charAt(Math.floor(Math.random() * chars_nonNumeric.length));
	for (let i = 0; i < (length-1); i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Symmetric encryption/decryption using CryptoJS AES compatible with TS_encrypt/TS_decrypt
export function encryptValue(value, key) {
	if (value === null || value === undefined) return value;
	if (!key) return value;

	let strValue = typeof value === 'string' ? value : JSON.stringify(value);
	if (strValue.startsWith('RSA{') && strValue.endsWith('}')) {
		return strValue; // Already encrypted
	}

	try {
		const encrypted = CryptoJS.AES.encrypt(strValue, key).toString();
		return `RSA{${encrypted}}`;
	} catch (e) {
		console.error('TS_encrypt: encryption failed', e);
		return value;
	}
}

export function decryptValue(value, key) {
	if (typeof value !== 'string' || !value.startsWith('RSA{') || !value.endsWith('}')) {
		return value;
	}
	if (!key) {
		return value;
	}

	try {
		const data = value.slice(4, -1);
		const words = CryptoJS.AES.decrypt(data, key);
		let decryptedUtf8 = null;
		try {
			decryptedUtf8 = words.toString(CryptoJS.enc.Utf8);
		} catch (utfErr) {
			try {
				decryptedUtf8 = words.toString(CryptoJS.enc.Latin1);
			} catch (latinErr) {
				console.warn('TS_decrypt: failed to decode decrypted bytes', utfErr, latinErr);
				return value;
			}
		}

		try {
			return JSON.parse(decryptedUtf8);
		} catch (pe) {
			return decryptedUtf8;
		}
	} catch (e) {
		console.error('TS_decrypt: invalid encrypted payload', e);
		return value;
	}
}

function encryptDoc(doc, key) {
	if (!key || !doc) return doc;
	// Skip internal PouchDB documents (_local/checkpoints, _design/views)
	if (doc._id && (doc._id.startsWith('_local/') || doc._id.startsWith('_design/'))) {
		return doc;
	}
	const encrypted = { ...doc };
    for (const field in encrypted) {
        if (field !== '_id' && field !== '_rev') {
            encrypted[field] = encryptValue(encrypted[field], key);
        }
    }
	return encrypted;
}

function decryptDoc(doc, key) {
	if (!key || !doc) return doc;
	// Skip internal PouchDB documents
	if (doc._id && (doc._id.startsWith('_local/') || doc._id.startsWith('_design/'))) {
		return doc;
	}
	const decrypted = { ...doc };
	decrypted._encrypted = true; // Mark the document as decrypted
    for (const field in decrypted) {
        if (field !== '_id' && field !== '_rev') {
            decrypted[field] = decryptValue(decrypted[field], key);
        }
    }
	return decrypted;
}

function getEncryptionKeyForDb(dbName) {
	if (!browser) return '';
	try {
		const raw = localStorage.getItem('pouchdb_connections_v1');
		const databases = raw ? JSON.parse(raw) : [];
		const dbConfig = databases.find((d) => d.localDatabase === dbName);
		return dbConfig?.encryptionKey || '';
	} catch {
		return '';
	}
}

function wrapPouchDBWithEncryption(db, keyOrDbName, options = {}) {
	const { skipChanges = false } = options;
	const getKey = () => {
		if (!keyOrDbName) return '';
		if (
			typeof keyOrDbName === 'string' &&
			!keyOrDbName.startsWith('RSA{') &&
			keyOrDbName.length < 100
		) {
			return getEncryptionKeyForDb(keyOrDbName);
		}
		return keyOrDbName;
	};

	const originalGet = db.get.bind(db);
	db.get = async function (id, ...args) {
		const key = getKey();
		const doc = await originalGet(id, ...args);
		return decryptDoc(doc, key);
	};

	const originalPut = db.put.bind(db);
	db.put = async function (doc, ...args) {
		const key = getKey();
		const encrypted = encryptDoc(doc, key);
		return originalPut(encrypted, ...args);
	};

	const originalPost = db.post.bind(db);
	db.post = async function (doc, ...args) {
		const key = getKey();
		const encrypted = encryptDoc(doc, key);
		return originalPost(encrypted, ...args);
	};

	const originalBulkDocs = db.bulkDocs.bind(db);
	db.bulkDocs = async function (docs, ...args) {
		const key = getKey();
		let encryptedDocs = docs;
		if (Array.isArray(docs)) {
			encryptedDocs = docs.map((d) => encryptDoc(d, key));
		} else if (docs && Array.isArray(docs.docs)) {
			encryptedDocs = {
				...docs,
				docs: docs.docs.map((d) => encryptDoc(d, key))
			};
		}
		return originalBulkDocs(encryptedDocs, ...args);
	};

	const originalAllDocs = db.allDocs.bind(db);
	db.allDocs = async function (...args) {
		const key = getKey();
		const result = await originalAllDocs(...args);
		if (result && result.rows) {
			result.rows.forEach((row) => {
				if (row.doc) {
					row.doc = decryptDoc(row.doc, key);
				}
			});
		}
		return result;
	};

	// Only wrap changes feed for local databases, not remote ones used in replication
	if (!skipChanges) {
		const originalChanges = db.changes.bind(db);
		db.changes = function (...args) {
			const changesFeed = originalChanges(...args);
			const originalOn = changesFeed.on.bind(changesFeed);
			changesFeed.on = function (event, listener) {
				if (event === 'change') {
					return originalOn(event, function (change) {
						const key = getKey();
						if (change && change.doc) {
							change.doc = decryptDoc(change.doc, key);
						}
						listener(change);
					});
				}
				return originalOn(event, listener);
			};
			return changesFeed;
		};
	}

	return db;
}

function normalizeServerUrl(serverUrl) {
	const cleaned = trim(serverUrl).replace(/\/+$/, '');
	if (!cleaned) {
		throw new Error('Server URL is required.');
	}
	if (!/^https?:\/\//i.test(cleaned)) {
		throw new Error('Server URL must start with http:// or https://');
	}
	return cleaned;
}

function buildRemoteUrl({ serverUrl, remoteDatabase, username, password }) {
	const server = normalizeServerUrl(serverUrl);
	const dbName = trim(remoteDatabase);
	if (!dbName) {
		throw new Error('Remote database name is required.');
	}

	const url = new URL(`${server}/${encodeURIComponent(dbName)}`);
	if (trim(username)) {
		url.username = trim(username);
		url.password = trim(password);
	}

	return url.toString();
}

export function getLocalDb(localDatabase) {
	ensureBrowser();
	const dbName = trim(localDatabase);
	if (!dbName) {
		throw new Error('Local database name is required.');
	}

	if (!localDbCache.has(dbName)) {
		const db = new PouchDB(dbName);
		const wrapped = wrapPouchDBWithEncryption(db, dbName);
		localDbCache.set(dbName, wrapped);
	}

	return localDbCache.get(dbName);
}

export function getLocalRawDb(localDatabase) {
	ensureBrowser();
	const dbName = trim(localDatabase);
	if (!dbName) {
		throw new Error('Local database name is required.');
	}

	if (!localRawDbCache.has(dbName)) {
		localRawDbCache.set(
			dbName,
			new PouchDB(dbName, {
				auto_compaction: true, // Enable auto-compaction to reduce database size
				revs_limit: 5, // Limit the number of document revisions to keep, reducing database size
				size: 50 // Set a size request for the database (in MB) so that Safari requests permission now, not later.
			})
		);
	}

	return localRawDbCache.get(dbName);
}

export function getRemoteDb(config) {
	ensureBrowser();
	const remoteUrl = buildRemoteUrl(config);
	const db = new PouchDB(remoteUrl, {
		skip_setup: true
	});
	const key = config.encryptionKey || '';
	// return wrapPouchDBWithEncryption(db, key, { skipChanges: true });
	return db;
}

export async function testLocalDb(localDatabase) {
	const db = getLocalDb(localDatabase);
	const info = await db.info();
	return {
		ok: true,
		name: info.db_name,
		docCount: info.doc_count,
		updateSeq: info.update_seq
	};
}

export async function compactLocalDb(localDatabase) {
	const db = getLocalDb(localDatabase);
	return db.compact();
}

export async function testRemoteDb(config) {
	const remote = getRemoteDb(config);
	const info = await remote.info();
	return {
		ok: true,
		name: info.db_name,
		docCount: info.doc_count,
		updateSeq: info.update_seq
	};
}

async function cleanCorruptedCheckpoints(db) {
	try {
		const result = await db.allDocs({
			startkey: '_local/',
			endkey: '_local/\ufff0',
			include_docs: true
		});
		for (const row of result.rows) {
			if (row.doc && typeof row.doc.history === 'string') {
				// Corrupted checkpoint — remove and let PouchDB recreate it
				await db.remove(row.doc);
			}
		}
	} catch (e) {
		// Ignore errors during cleanup
	}
}

export async function syncOnce(config) {
	const local = getLocalRawDb(config.localDatabase);
	const remote = getRemoteDb(config);

	// Clean corrupted checkpoints that were encrypted by a previous wrapper version
	await cleanCorruptedCheckpoints(local);

	return new Promise((resolve, reject) => {
		local
			.sync(remote)
			.on('complete', (info) => {
				resolve({
					ok: true,
					push: info.push,
					pull: info.pull
				});
			})
			.on('error', (err) => {
				reject(err);
			});
	});
}

export function startLiveSync(config, callbacks = {}) {
	const local = getLocalRawDb(config.localDatabase);
	const remote = getRemoteDb(config);

	// Clean corrupted checkpoints that were encrypted by a previous wrapper version
	cleanCorruptedCheckpoints(local);

	const sync = local
		.sync(remote, {
			live: true,
			retry: true,
			heartbeat: 10000
		})
		.on('change', (event) => callbacks.onChange?.(event))
		.on('paused', (event) => callbacks.onPaused?.(event))
		.on('active', () => callbacks.onActive?.())
		.on('denied', (event) => callbacks.onDenied?.(event))
		.on('complete', (event) => callbacks.onComplete?.(event))
		.on('error', (event) => callbacks.onError?.(event));

	liveSyncCache.set(config.id, sync);
	return sync;
}

export function stopLiveSync(configId) {
	const sync = liveSyncCache.get(configId);
	if (!sync) {
		return false;
	}
	sync.cancel();
	liveSyncCache.delete(configId);
	return true;
}

export function stopAllLiveSync() {
	for (const [configId, sync] of liveSyncCache.entries()) {
		sync.cancel();
		liveSyncCache.delete(configId);
	}
}

export function getActiveDbConfig() {
	ensureBrowser();
	try {
		const raw = localStorage.getItem('pouchdb_connections_v1');
		const databases = raw ? JSON.parse(raw) : [];
		const activeId = localStorage.getItem('active_database_id');

		let activeDb = null;
		if (activeId) {
			activeDb = databases.find((d) => d.id === activeId);
		}
		if (!activeDb && databases.length > 0) {
			activeDb = databases[0];
			localStorage.setItem('active_database_id', activeDb.id);
		}
		return activeDb;
	} catch {
		return null;
	}
}

export function getActiveDb() {
	ensureBrowser();
	const config = getActiveDbConfig();
	if (!config) return null;
	return getLocalDb(config.localDatabase);
}
