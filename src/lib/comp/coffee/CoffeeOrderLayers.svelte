<script>
	const LAYERED_BASE =
		'/static/ico/layered1/';

	let { order = {}, size = 72 } = $props();

	const selectionMap = {
		'ColaCao con leche': 'Selección-ColaCao.png',
		Infusión: 'Selección-Infusion.png',
		'Café con leche': 'Selección-CaféLeche.png',
		'Solo Leche': 'Selección-Leche.png',
		'Solo café (sin leche)': 'Selección-CaféSolo.png'
	};

	const layerDefinitions = [
		['Selección', (value) => selectionMap[value], '☕'],
		['Café', (value) => `Café-${value}.png`, '☕'],
		['Endulzante', (value) => `Azucar-${value}.png`, '✦'],
		['Cafeina', (value) => `Cafeina-${value}.png`, '●'],
		['Leche', (value) => `Leche-${value}.png`, '🥛'],
		['Temperatura', (value) => `Temperatura-${value}.png`, '♨'],
		['Tamaño', (value) => `Tamaño-${value}.png`, '↕']
	];

	let layers = $derived(
		layerDefinitions
			.map(([key, filename, fallback]) => {
				const value = order?.[key];
				if (!value) return null;
				const mappedFilename = filename(value);
				return mappedFilename
					? { key, src: `${LAYERED_BASE}${encodeURI(mappedFilename)}`, fallback }
					: null;
			})
			.filter(Boolean)
	);
</script>

<div
	class="layers"
	style={`width: ${size}px; height: ${size}px;`}
	title={order?.Selección || 'Comanda'}
>
	{#each layers as layer, index}
		<span class="fallback" style={`z-index: ${index + 1};`}>?</span>
		<img
			class="layer"
			style={`z-index: ${index + 10};`}
			src={layer.src}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
		/>
	{/each}
</div>

<style>
	.layers {
		position: relative;
		display: inline-block;
		flex: 0 0 auto;
		overflow: hidden;
		border: 1px dotted #94a3b8;
		border-radius: 4px;
		background: #fff;
	}
	.layer,
	.fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.fallback {
		display: grid;
		place-items: center;
		font-size: 30px;
	}
</style>
