export const COFFEE_PREFIX = 'supercafe:';

export const ORDER_STATES = ['Pedido', 'En preparación', 'Listo', 'Entregado', 'Deuda'];

export const DEFAULT_COFFEE_PRICES = {
	servicio_base: 10,
	leche_pequena: 15,
	leche_grande: 25,
	cafe: 25,
	colacao: 25
};

function option(value, ...icons) {
	return {
		value,
		icons: icons.map((icon) => `${icon}`)
	};
}

export const ORDER_OPTIONS = {
	Selección: {
		icon: '/static/ico/preferences.png',
		options: [
			option('Solo Leche', '/static/ico/milk.png'),
			option('Solo café (sin leche)', '/static/ico/coffee_bean.png'),
			option('Café con leche', '/static/ico/coffee_bean.png', '/static/ico/milk.png'),
			option('ColaCao con leche', '/static/ico/colacao.jpg', '/static/ico/milk.png'),
			option('Leche con cereales', '/static/ico/cereales.png', '/static/ico/milk.png'),
			option('Infusión', '/static/ico/tea_bag.png')
		]
	},
	Tamaño: {
		icon: '/static/ico/sizes.png',
		options: [
			option('Grande', '/static/ico/keyboard_key_g.png'),
			option('Pequeño', '/static/ico/keyboard_key_p.png')
		]
	},
	Temperatura: {
		icon: '/static/ico/thermometer2.png',
		options: [
			option(
				'Caliente',
				'/static/ico/arrow_up_red.png',
				'/static/ico/fire.png'
			),
			option('Templado', '/static/ico/thermometer2.png', '/static/ico/arrow_left_green.png'),
			option(
				'Frio',
				'/static/ico/arrow_down_blue.png',
				'/static/ico/snowflake.png'
			)
		]
	},
	Leche: {
		icon: '/static/ico/milk.png',
		options: [
			option('de Vaca', '/static/ico/cow.png', '/static/ico/add.png'),
			option('Sin lactosa', '/static/ico/cow.png', '/static/ico/delete.png'),
			option('Vegetal', '/static/ico/milk.png', '/static/ico/wheat.png'),
			option('Almendras', '/static/ico/milk.png', '/static/ico/almond.svg'),
			option('Agua', '/static/ico/water_tap.png')
		]
	},
	Cafeina: {
		icon: '/static/ico/coffee_bean.png',
		options: [
			option('Con', '/static/ico/coffee_bean.png', '/static/ico/add.png'),
			option('Sin', '/static/ico/coffee_bean.png', '/static/ico/delete.png')
		]
	},
	Endulzante: {
		icon: '/static/ico/lollipop.png',
		options: [
			option('Az. Blanco', '/static/ico/azucar-blanco.jpg'),
			option('Az. Moreno', '/static/ico/azucar-moreno.png'),
			option('Sacarina', '/static/ico/sacarina.jpg'),
			option('Stevia (Pastillas)', '/static/ico/stevia.jpg'),
			option('Stevia (Gotas)', '/static/ico/stevia-gotas.webp'),
			option('Sin', '/static/ico/delete.png')
		]
	},
	Receta: {
		icon: '/static/ico/cookies.png',
		options: [option('Si', '/static/ico/add.png'), option('No', '/static/ico/delete.png')]
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
