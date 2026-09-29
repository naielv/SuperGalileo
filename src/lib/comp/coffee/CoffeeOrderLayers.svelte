<script>
	const LAYERED_BASE = '/static/ico/layered1/';

	let { order = {}, size = 72 } = $props();

	const layerDefinitions = {
		Selección: {
			'ColaCao con leche': 'Selección-ColaCao.png',
			'Infusión': 'Selección-Infusion.png',
			'Café con leche': 'Selección-CaféLeche.png',
			'Solo Leche': 'Selección-Leche.png',
			'Solo café (sin leche)': 'Selección-CaféSolo.png'
		},

		Endulzante: {
			'Az. Blanco': 'Azucar-Az. Blanco.png',
			'Az. Moreno': 'Azucar-Az. Moreno.png',
			'Edulcorante': 'Azucar-Edulcorante.png',
			'Sacarina': 'Azucar-Sacarina.png',
			'Stevia (Gotas)': 'Azucar-Stevia (Gotas).png',
			'Stevia (Pastillas)': 'Azucar-Stevia (Pastillas).png',
			'Sin': 'Azucar-Sin.png',
		},

		Cafeina: {
			'Con': 'Cafeina-Con.png',
			'Sin': 'Cafeina-Sin.png',
		},

		Leche: {
			'Agua': 'Leche-Agua.png',
			'de Vaca': 'Leche-de Vaca.png',
			'Sin lactosa': 'Leche-Sin lactosa.png',
			'Vegetal': 'Leche-Vegetal.png',
		},

		Temperatura: {
			'Caliente': 'Temperatura-Caliente.png',
			'Templado': 'Temperatura-Templado.png',
			'Frío': 'Temperatura-Frío.png',
		},

		Tamaño: {
			'Pequeño': 'Tamaño-Pequeño.png',
			'Grande': 'Tamaño-Grande.png',
		}
	};

	const getLayerSrc = (key) => {
		const value = order?.[key];
		const filename = layerDefinitions[key]?.[value];

		return filename
			? `${LAYERED_BASE}${encodeURI(filename)}`
			: null;
	};

	let seleccionSrc = $derived(getLayerSrc('Selección'));
	let endulzanteSrc = $derived(getLayerSrc('Endulzante'));
	let cafeinaSrc = $derived(getLayerSrc('Cafeina'));
	let lecheSrc = $derived(getLayerSrc('Leche'));
	let temperaturaSrc = $derived(getLayerSrc('Temperatura'));
	let tamanoSrc = $derived(getLayerSrc('Tamaño'));
</script>

<div
	class="layers"
	style={`width: ${size}px; height: ${size}px;`}
	title={order?.Selección || 'Comanda'}
>
	{#if seleccionSrc}
		<img
			class="layer"
			style="z-index: 10;"
			src={seleccionSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}

	{#if endulzanteSrc}
		<img
			class="layer"
			style="z-index: 12;"
			src={endulzanteSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}

	{#if cafeinaSrc && ["Solo café (sin leche)", "Café con leche"].includes(order?.Selección)}
		<img
			class="layer"
			style="z-index: 13;"
			src={cafeinaSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}

	{#if lecheSrc}
		<img
			class="layer"
			style="z-index: 14;"
			src={lecheSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}

	{#if temperaturaSrc}
		<img
			class="layer"
			style="z-index: 15;"
			src={temperaturaSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}

	{#if tamanoSrc}
		<img
			class="layer"
			style="z-index: 16;"
			src={tamanoSrc}
			alt=""
			onerror={(event) => (event.currentTarget.style.display = 'none')}
			onload={(event) => (event.currentTarget.style.display = '')}
		/>
	{/if}
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

	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
