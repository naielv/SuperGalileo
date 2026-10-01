import { m } from './paraglide/messages';
import { safeRandomString } from './db';

export const COFFEE_PREFIX = 'supercafe:';

export const ORDER_STATES = ['Pedido', 'En preparación', 'Listo', 'Entregado', 'Deuda'];

export const ORDER_STATES_MAP = {
	Pedido: 'black',
	'En preparación': 'red',
	Listo: 'orange',
	Entregado: 'green',
	Deuda: 'purple'
};
export const DEFAULT_COFFEE_PRICES = {
	servicio_base: 10,
	leche_pequena: 15,
	leche_grande: 25,
	cafe: 25,
	colacao: 25
};

function option(value, label, ...icons) {
	return {
		value,
		label: label,
		icons: icons.map((icon) => `${icon}`)
	};
}

export const ORDER_OPTIONS = {
	[m.selection()]: {
		icon: '/static/ico/preferences.png',
		options: [
			option('Solo Leche', m.coffee_only_milk(), '/static/ico/milk.png'),
			option('Solo café (sin leche)', m.coffee_only(), '/static/ico/coffee_bean.png'),
			option(
				'Café con leche',
				m.coffee_with_milk(),
				'/static/ico/coffee_bean.png',
				'/static/ico/milk.png'
			),
			option(
				'ColaCao con leche',
				m.colacao_with_milk(),
				'/static/ico/colacao.jpg',
				'/static/ico/milk.png'
			),
			option(
				'Leche con cereales',
				m.coffee_milk_with_cereal(),
				'/static/ico/cereales.png',
				'/static/ico/milk.png'
			),
			option('Infusión', m.infusion(), '/static/ico/tea_bag.png')
		]
	},
	[m.size()]: {
		icon: '/static/ico/sizes.png',
		options: [
			option('Grande', m.big(), '/static/ico/keyboard_key_g.png'),
			option('Pequeño', m.small(), '/static/ico/keyboard_key_p.png')
		]
	},
	[m.temperature()]: {
		icon: '/static/ico/thermometer2.png',
		options: [
			option('Caliente', m.hot(), '/static/ico/arrow_up_red.png', '/static/ico/fire.png'),
			option(
				'Templado',
				m.middletemp(),
				'/static/ico/thermometer2.png',
				'/static/ico/arrow_left_green.png'
			),
			option('Frio', m.cold(), '/static/ico/arrow_down_blue.png', '/static/ico/snowflake.png')
		]
	},
	[m.milk()]: {
		icon: '/static/ico/milk.png',
		options: [
			option('de Vaca', m.cowmilk(), '/static/ico/cow.png', '/static/ico/add.png'),
			option('Sin lactosa', m.lactosefree(), '/static/ico/cow.png', '/static/ico/delete.png'),
			option('Vegetal', m.vegetal(), '/static/ico/milk.png', '/static/ico/wheat.png'),
			option('Almendras', m.almonds(), '/static/ico/milk.png', '/static/ico/almond.svg'),
			option('Agua', m.water(), '/static/ico/water_tap.png')
		]
	},
	[m.caffeine()]: {
		icon: '/static/ico/coffee_bean.png',
		options: [
			option('Con', m.with(), '/static/ico/coffee_bean.png', '/static/ico/add.png'),
			option('Sin', m.without(), '/static/ico/coffee_bean.png', '/static/ico/delete.png')
		]
	},
	[m.sweetner()]: {
		icon: '/static/ico/lollipop.png',
		options: [
			option('Az. Blanco', m.white_sugar(), '/static/ico/azucar-blanco.jpg'),
			option('Az. Moreno', m.brown_sugar(), '/static/ico/azucar-moreno.png'),
			option('Sacarina', m.saccharin(), '/static/ico/sacarina.jpg'),
			option('Stevia (Pastillas)', m.stevia_pill(), '/static/ico/stevia.jpg'),
			option('Stevia (Gotas)', m.stevia_droplet(), '/static/ico/stevia-gotas.webp'),
			option('Sin', m.without(), '/static/ico/delete.png')
		]
	},
	[m.recipe()]: {
		icon: '/static/ico/cookies.png',
		options: [
			option('Si', m.with(), '/static/ico/add.png'),
			option('No', m.without(), '/static/ico/delete.png')
		]
	}
};

export function parseOrder(value) {
	if (!value) return {};
	let parsed = value;
	try {
		parsed = typeof value === 'object' ? value : JSON.parse(value);
	} catch {
		return {};
	}
	return {
		...parsed,
		Selección:
			{ 'Café solo': 'Solo café (sin leche)', ColaCao: 'ColaCao con leche' }[parsed.Selección] ||
			parsed.Selección,
		Temperatura: parsed.Temperatura === 'Frío' ? 'Frio' : parsed.Temperatura,
		Endulzante: parsed.Endulzante === 'Ninguno' ? 'Sin' : parsed.Endulzante,
		Receta: parsed.Receta === 'Sí' ? 'Si' : parsed.Receta
	};
}

export function normalizePrices(value) {
	const source = value && typeof value === 'object' ? value : {};
	return Object.fromEntries(
		Object.entries(DEFAULT_COFFEE_PRICES).map(([key, fallback]) => {
			const parsed = Number.parseInt(source[key], 10);
			return [key, Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback];
		})
	);
}

export function calculateOrderPrice(order, prices) {
	const normalized = normalizePrices(prices);
	const selected = order?.Selección || '';
	let total = normalized.servicio_base;

	if (selected === 'ColaCao con leche') total += normalized.colacao;
	if (selected === 'Solo café (sin leche)' || selected === 'Café con leche')
		total += normalized.cafe;
	if (selected === 'Café con leche' || selected === 'ColaCao con leche') {
		total += order.Tamaño === 'Grande' ? normalized.leche_grande : normalized.leche_pequena;
	}

	return total;
}

export function personIdFromValue(value) {
	return String(value || '').replace(/^personas:/, '');
}

export function orderSummary(order) {
	const parsed = parseOrder(order.Comanda);
	return [parsed.Selección].filter(Boolean).join(', ') || 'Sin detalle';
}

export function formatDate(dateString) {
	if (!dateString) return '';
	const date = new Date(dateString);
	const now = new Date();

	// Si es el año actual, definimos manualmente solo mes y día
	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleString(getLocale(), {
			month: 'short', // Equivalente al estilo 'medium' (ej: "26 may" o "May 26")
			day: 'numeric'
		});
	}

	// Si es un año diferente, usamos el estilo mediano estándar (incluye el año)
	return date.toLocaleString(getLocale(), {
		dateStyle: 'medium'
	});
}

export function getOrderPrice(prices, record) {
	return (calculateOrderPrice(parseOrder(record.data?.Comanda), prices) / 100).toLocaleString("es-ES", {
		style: 'currency',
		currency: 'EUR'
	});
}

/**
 * Cobro auto de SuperCafé (portado de TeleSec).
 *
 * Recorre las comandas 'Entregado' o 'Deuda' y, por cada una, descuenta el
 * importe del saldo del monedero de la persona. Si el saldo no llega, la
 * comanda queda/pasa a 'Deuda'. Al cobrar se registra una transacción en
 * `pagos:` (esquema compatible con TeleSec) y se borra la comanda.
 *
 * @param {object} db  Instancia PouchDB ya envuelta (con encriptación) de SG.
 * @param {object} prices  Precios normalizados del café (en céntimos).
 * @returns {Promise<{cobradas:number, sinSaldo:number, errores:number, totalCentimos:number}>}
 */
export async function runCobroAuto(db, prices) {
	let cobradas = 0;
	let sinSaldo = 0;
	let errores = 0;
	let totalCentimos = 0;

	const result = await db.allDocs({
		startkey: COFFEE_PREFIX,
		endkey: `${COFFEE_PREFIX}\uffff`,
		include_docs: true
	});
	const records = result.rows.map((row) => row.doc).filter(Boolean);

	for (const rec of records) {
		const personId = rec.data?.Persona;
		if (!personId) {
			errores++;
			continue;
		}

		let comanda, person;
		try {
			// Leer versiones actuales para evitar conflictos de _rev y usar saldo fresco
			[comanda, person] = await Promise.all([db.get(rec._id), db.get(`personas:${personId}`)]);
		} catch (e) {
			console.warn('Cobro auto: no se pudo leer', rec._id, e);
			errores++;
			continue;
		}

		const data = comanda.data || comanda;
		const estado = data.Estado;
		if (estado !== 'Entregado' && estado !== 'Deuda') continue; // cambió mientras tanto

		const precioEur = calculateOrderPrice(parseOrder(data.Comanda), prices) / 100;
		const balance = parseFloat(person.data?.Monedero_Balance || 0);

		if (balance < precioEur) {
			// Sin saldo suficiente: marcar como deuda si no lo estaba ya
			if (estado !== 'Deuda') {
				try {
					await db.put({
						_id: comanda._id,
						_rev: comanda._rev,
						data: { ...data, Estado: 'Deuda' }
					});
				} catch (e) {
					console.warn('Cobro auto: error marcando deuda', comanda._id, e);
					errores++;
					continue;
				}
			}
			sinSaldo++;
			continue;
		}

		// Saldo suficiente: cobrar
		try {
			const nuevoSaldo = parseFloat((balance - precioEur).toFixed(2));

			await db.put({
				_id: person._id,
				_rev: person._rev,
				data: { ...person.data, Monedero_Balance: nuevoSaldo }
			});

			const ticketId = safeRandomString(16);
			await db.put({
				_id: `pagos:${ticketId}`,
				data: {
					Ticket: ticketId,
					Fecha: new Date().toISOString(),
					Tipo: 'Gasto',
					Monto: precioEur,
					Persona: personId,
					Metodo: 'Tarjeta',
					Notas: 'Cobro auto - ' + orderSummary(data),
					Estado: 'Completado',
					Origen: 'SuperCafé',
					OrigenID: comanda._id
				}
			});

			await db.remove({ _id: comanda._id, _rev: comanda._rev });

			totalCentimos += Math.round(precioEur * 100);
			cobradas++;
		} catch (e) {
			console.warn('Cobro auto: error al cobrar', comanda._id, e);
			errores++;
		}
	}

	return { cobradas, sinSaldo, errores, totalCentimos };
}