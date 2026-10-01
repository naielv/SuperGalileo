import { safeRandomString } from './db';

export const PAGOS_PREFIX = 'pagos:';

export const TRANSACTION_TYPES = ['Ingreso', 'Gasto', 'Transferencia'];
export const PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Otro'];

export function formatMoney(amount) {
	return (parseFloat(amount || 0)).toLocaleString('es-ES', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2
	});
}

export function formatDateTime(iso) {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString('es-ES');
}

export function typeMeta(tipo) {
	switch (tipo) {
		case 'Ingreso':
			return { icon: '💵', color: '#2ed573' };
		case 'Gasto':
			return { icon: '💸', color: '#ff4757' };
		case 'Transferencia':
			return { icon: '🔄', color: '#667eea' };
		default:
			return { icon: '•', color: '#888' };
	}
}

export function estadoMeta(estado) {
	return estado === 'Completado' ? { color: '#2ed573' } : { color: '#ffa502' };
}

/**
 * Variación que una operación produce sobre el saldo del monedero ORIGEN.
 * Un Gasto en Efectivo no toca el monedero (delta 0).
 */
export function sourceDelta(tipo, metodo, monto) {
	const m = parseFloat(monto || 0);
	if (tipo === 'Ingreso') return m;
	if (tipo === 'Gasto') return metodo === 'Efectivo' ? 0 : -m;
	if (tipo === 'Transferencia') return -m;
	return 0;
}

/** ¿Hay que exigir saldo suficiente? (gasto/transferencia con tarjeta) */
export function needsBalanceCheck(tipo, metodo) {
	return (tipo === 'Gasto' || tipo === 'Transferencia') && metodo === 'Tarjeta';
}

function stripPrefix(id) {
	return String(id || '').replace(/^personas:/, '');
}

/**
 * Ejecuta una transacción completa sobre el monedero: valida, actualiza los
 * saldos (origen y, si hay, destino) y guarda el documento en `pagos:`.
 * Esquema de campos compatible con TeleSec.
 */
export async function performTransaction(db, { tipo, metodo, monto, persona, personaDestino, notas }) {
	const montoEur = parseFloat(monto);
	if (!tipo || !metodo || Number.isNaN(montoEur) || montoEur <= 0) {
		return { ok: false, error: 'Datos de transacción inválidos.' };
	}
	if (tipo === 'Ingreso' && metodo !== 'Efectivo') {
		return { ok: false, error: 'Los ingresos solo pueden realizarse en efectivo.' };
	}

	const personaId = stripPrefix(persona);
	if (!personaId) return { ok: false, error: 'Selecciona un monedero.' };

	let destinoId = null;
	if (tipo === 'Transferencia') {
		destinoId = stripPrefix(personaDestino);
		if (!destinoId) return { ok: false, error: 'Selecciona el monedero destino.' };
		if (destinoId === personaId) return { ok: false, error: 'No puedes transferir al mismo monedero.' };
	}

	let personaDoc, destinoDoc;
	try {
		personaDoc = await db.get(`personas:${personaId}`);
		if (tipo === 'Transferencia') destinoDoc = await db.get(`personas:${destinoId}`);
	} catch {
		return { ok: false, error: 'Monedero no encontrado.' };
	}

	const balance = parseFloat(personaDoc.data?.Monedero_Balance || 0);
	if (needsBalanceCheck(tipo, metodo) && balance < montoEur) {
		return { ok: false, error: `Saldo insuficiente. Disponible: ${formatMoney(balance)}` };
	}

	const delta = sourceDelta(tipo, metodo, montoEur);
	const ticketId = safeRandomString(16);

	try {
		// Solo escribimos el saldo del origen si la operación lo modifica
		// (un Gasto en Efectivo no toca el monedero).
		if (delta !== 0) {
			const nuevoSaldo = parseFloat((balance + delta).toFixed(2));
			await db.put({
				_id: personaDoc._id,
				_rev: personaDoc._rev,
				data: { ...personaDoc.data, Monedero_Balance: nuevoSaldo }
			});
		}

		if (destinoDoc) {
			const balanceDestino = parseFloat(destinoDoc.data?.Monedero_Balance || 0);
			await db.put({
				_id: destinoDoc._id,
				_rev: destinoDoc._rev,
				data: {
					...destinoDoc.data,
					Monedero_Balance: parseFloat((balanceDestino + montoEur).toFixed(2))
				}
			});
		}

		const tx = {
			Ticket: ticketId,
			Fecha: new Date().toISOString(),
			Tipo: tipo,
			Monto: montoEur,
			Persona: personaId,
			Metodo: metodo,
			Notas: notas || '',
			Estado: 'Completado'
		};
		if (tipo === 'Transferencia') tx.PersonaDestino = destinoId;

		await db.put({ _id: `${PAGOS_PREFIX}${ticketId}`, data: tx });
		return { ok: true, transactionId: ticketId };
	} catch (e) {
		console.warn('performTransaction error', e);
		return { ok: false, error: 'Error al guardar la transacción.' };
	}
}

/**
 * Revierte una transacción: deshace los cambios de saldo (operación contraria
 * en origen y, si fue una transferencia, también en el destino) y borra el punto.
 */
export async function revertTransaction(db, transactionId) {
	const fullId = transactionId.startsWith(PAGOS_PREFIX)
		? transactionId
		: `${PAGOS_PREFIX}${transactionId}`;

	let doc;
	try {
		doc = await db.get(fullId);
	} catch {
		return { ok: false, error: 'Transacción no encontrada.' };
	}

	const data = doc.data || doc;
	const tipo = data.Tipo;
	const monto = parseFloat(data.Monto || 0);
	const reverseDelta = -sourceDelta(tipo, data.Metodo, monto);

	try {
		const personaId = stripPrefix(data.Persona);

		if (reverseDelta !== 0) {
			const p = await db.get(`personas:${personaId}`);
			const nuevo = parseFloat((parseFloat(p.data?.Monedero_Balance || 0) + reverseDelta).toFixed(2));
			await db.put({ _id: p._id, _rev: p._rev, data: { ...p.data, Monedero_Balance: nuevo } });
		}

		if (tipo === 'Transferencia' && data.PersonaDestino) {
			const d = await db.get(`personas:${stripPrefix(data.PersonaDestino)}`);
			const nuevo = parseFloat((parseFloat(d.data?.Monedero_Balance || 0) - monto).toFixed(2));
			await db.put({ _id: d._id, _rev: d._rev, data: { ...d.data, Monedero_Balance: nuevo } });
		}

		await db.remove({ _id: doc._id, _rev: doc._rev });
		return { ok: true };
	} catch (e) {
		console.warn('revertTransaction error', e);
		return { ok: false, error: 'Error al revertir la transacción.' };
	}
}

/** Carga el ledger (transacciones) y las personas con su saldo actual. */
export async function fetchLedger(db) {
	const [txResult, peopleResult] = await Promise.all([
		db.allDocs({ startkey: PAGOS_PREFIX, endkey: `${PAGOS_PREFIX}\uffff`, include_docs: true }),
		db.allDocs({ startkey: 'personas:', endkey: 'personas:\uffff', include_docs: true })
	]);

	const transactions = txResult.rows.map((r) => r.doc).filter(Boolean);
	const people = new Map();
	for (const row of peopleResult.rows) {
		if (row.doc) people.set(row.doc._id, row.doc.data || row.doc);
	}
	return { transactions, people };
}

export function personName(people, personaId, fallback = '') {
	const p = people.get(`personas:${personaId}`);
	return p?.Nombre || fallback || personaId;
}

export function walletTotals(people) {
	let total = 0;
	for (const data of people.values()) total += parseFloat(data?.Monedero_Balance || 0);
	return total;
}