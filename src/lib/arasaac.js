// Cliente ligero de la API pública de ARASAAC (mantiene la conexión que tenía
// TeleSec): búsqueda de pictogramas y construcción de la URL de la imagen.

export function pictogramUrl(id) {
	return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
}

function normalize(item) {
	// La API puede devolver ids sueltos (string/number) u objetos con keywords.
	if (typeof item === 'string' || typeof item === 'number') {
		return { id: String(item), label: '' };
	}
	const id = item._id || item.id;
	const keywords = Array.isArray(item.keywords) ? item.keywords : [];
	const first = keywords[0];
	const label = (first && (first.keyword || first.name)) || item.keyword || item.name || '';
	return { id: id ? String(id) : '', label };
}

/**
 * Busca pictogramas en ARASAAC (idioma es). Devuelve [{ id, label }].
 * Requiere mínimo 2 caracteres.
 */
export async function searchArasaac(term) {
	const trimmed = String(term || '').trim();
	if (trimmed.length < 2) return [];

	const res = await fetch(
		`https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(trimmed)}`,
		{ mode: 'cors' }
	);
	if (!res.ok) throw new Error(`ARASAAC ${res.status}`);
	const items = await res.json();
	return (Array.isArray(items) ? items : [])
		.map(normalize)
		.filter((item) => item.id);
}