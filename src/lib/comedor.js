export const COMEDOR_PREFIX = 'comedor:';

export const COURSES = ['Primero', 'Segundo', 'Postre'];

export function docId(fecha, tipo) {
	return `${COMEDOR_PREFIX}${fecha},${tipo}`;
}

/** Valor de pictograma normalizado: { text, arasaacId } */
export function normalizePicto(value) {
	if (value && typeof value === 'object') {
		return { text: String(value.text || ''), arasaacId: String(value.arasaacId || '') };
	}
	return { text: String(value || ''), arasaacId: '' };
}

export function todayISO() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
		d.getDate()
	).padStart(2, '0')}`;
}

/** Elimina menús con antigüedad >= 30 días. */
export async function cleanupOldMenus(db) {
	const ageMs = 30 * 86400000;
	const result = await db.allDocs({
		startkey: COMEDOR_PREFIX,
		endkey: `${COMEDOR_PREFIX}\uffff`,
		include_docs: true
	});
	const rows = result.rows.filter((r) => r.doc);
	for (const row of rows) {
		const fecha = row.doc?.data?.Fecha;
		if (!fecha) continue;
		const t = new Date(`${fecha}T00:00:00`).getTime();
		if (Number.isNaN(t)) continue;
		if (Date.now() - t >= ageMs) {
			await db.remove({ _id: row.doc._id, _rev: row.doc._rev }).catch(() => {});
		}
	}
}