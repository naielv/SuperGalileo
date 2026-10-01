<script>
	import { onMount } from 'svelte';
	import { mdiCoffee } from '@mdi/js';
	import { getActiveDb } from '$lib/db';
	import { DEFAULT_COFFEE_PRICES, runCobroAuto } from '$lib/coffee';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';

	let dbInstance = $state(null);
	let prices = $state(DEFAULT_COFFEE_PRICES);
	let cobrando = $state(false);

	async function loadPrices() {
		if (!dbInstance) return;
		try {
			prices = { ...DEFAULT_COFFEE_PRICES, ...(await dbInstance.get('config:precios_cafe')) };
		} catch (error) {
			if (error.status !== 404) console.error('Error cargando precios:', error);
		}
	}

	async function cobroAuto() {
		if (!dbInstance) {
			toast.error('No hay ninguna base de datos activa.');
			return;
		}

		if (
			!confirm(
				'¿Cobrar automáticamente todas las comandas y deudas a quienes tengan saldo suficiente?'
			)
		) {
			return;
		}

		cobrando = true;
		try {
			const res = await runCobroAuto(dbInstance, prices);

			toast.success(
				`Cobro auto completado: ${res.cobradas} cobradas, ${res.sinSaldo} sin saldo suficiente, ${res.errores} errores. ` +
					`Total cobrado: ${(res.totalCentimos / 100).toFixed(2)} €`
			);
		} catch (e) {
			console.warn('Cobro auto: error', e);
			toast.error('Error durante el cobro automático.');
		} finally {
			cobrando = false;
		}
	}

	onMount(() => {
		try {
			dbInstance = getActiveDb();
			loadPrices();
		} catch (error) {
			toast.error(error.message);
		}
	});
</script>

{#if dbInstance}
	<div class="portal">
		<h1>☕ Cafetería</h1>
		<p class="subtitle">Gestiona las comandas o lanza el cobro automático del monedero.</p>

		<div class="actions">
			<LinkButton href="/coffee_shop/orders" label="Ver pedidos" icon={mdiCoffee} background="green" />
			<button
				type="button"
				class="cobro-auto"
				title="Cobro auto de todas las comandas con saldo suficiente"
				onclick={cobroAuto}
				disabled={cobrando}
			>
				{cobrando ? 'Cobrando…' : '🤖 Cobro auto'}
			</button>
		</div>
	</div>
{:else}
	<p>
		Configura una base de datos activa en
		<a href="/settings/database">Ajustes de Base de Datos</a>.
	</p>
{/if}

<style>
	.portal {
		padding: 15px;
		background-color: wheat;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 520px;
	}

	.portal h1 {
		margin: 0;
	}

	.portal .subtitle {
		margin: 0;
		color: #444;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	button.cobro-auto {
		text-decoration: none;
		background-color: red;
		color: white;
		border: none;
		border-radius: 5px;
		font-size: 18px;
		padding: 8px 12px;
		line-height: normal;
		cursor: pointer;
	}

	button.cobro-auto:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>