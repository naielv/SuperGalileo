<script>
	import { onMount } from 'svelte';
	import { getActiveDb } from '$lib/db';
	import { mdiCog, mdiCoffee, mdiDelete, mdiPlus, mdiMonitor, mdiPencil } from '@mdi/js';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import DataTable from '$lib/comp/DataTable.svelte';
	import DataListRow from '$lib/comp/DataListRow.svelte';
	import {
		COFFEE_PREFIX,
		DEFAULT_COFFEE_PRICES,
		ORDER_STATES,
		calculateOrderPrice,
		parseOrder
	} from '$lib/coffee';
	import { getLocale } from '$lib/paraglide/runtime';
	import genericAvatar from '$lib/assets/user_generic.png';
	import { m } from '$lib/paraglide/messages';

	let dbInstance = $state(null);
	let people = $state({});
	let prices = $state(DEFAULT_COFFEE_PRICES);
	let feedback = $state({ type: 'info', message: '' });

	const columns = [
		{ label: 'Fecha', key: 'Fecha', sortable: true },
		{ label: 'Persona', key: 'Persona', sortable: true },
		{ label: 'Comanda' },
		{ label: 'Estado', key: 'Estado', sortable: true },
		{ label: 'Total', align: 'right' },
		{ label: 'Acciones' }
	];
	const searchFields = ['Persona', 'Comanda'];
	const filterFields = ['Fecha', 'Estado'];
	const sortByFields = [
		{ label: 'Fecha', key: 'Fecha' },
		{ label: 'Persona', key: 'Persona' },
		{ label: 'Estado', key: 'Estado' }
	];

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	// DataTable carga las comandas; aquí cargamos personas y precios para cada fila.
	async function loadPeopleAndPrices() {
		if (!dbInstance) return;
		try {
			const peopleResult = await dbInstance.allDocs({
				startkey: 'personas:',
				endkey: 'personas:\uffff',
				include_docs: true
			});
			people = Object.fromEntries(
				peopleResult.rows.map((row) => {
					const data = row.doc?.data || row.doc || {};
					return [row.doc._id.replace(/^personas:/, ''), data];
				})
			);

			try {
				const priceDoc = await dbInstance.get('config:precios_cafe');
				prices = { ...DEFAULT_COFFEE_PRICES, ...priceDoc };
			} catch (error) {
				if (error.status !== 404) throw error;
			}
		} catch (error) {
			setFeedback(`Error al cargar datos: ${error.message}`, 'error');
		}
	}

	async function updateState(order, state) {
		try {
			const { _id, _rev, ...data } = order;
			await dbInstance.put({
				_id,
				_rev,
				data: { ...data, Estado: state }
			});
		} catch (error) {
			setFeedback(`Error al actualizar el estado: ${error.message}`, 'error');
		}
	}

	async function deleteOrder(order) {
		if (!confirm(`¿Eliminar la comanda de ${personName(order)}?`)) return;
		try {
			await dbInstance.remove({ _id: order._id, _rev: order._rev });
		} catch (error) {
			setFeedback(`Error al eliminar la comanda: ${error.message}`, 'error');
		}
	}

	function personName(order) {
		return people[order.Persona]?.Nombre || order.Persona || 'Persona desconocida';
	}

	function orderSummary(order) {
		const parsed = parseOrder(order.Comanda);
		return [parsed.Selección].filter(Boolean).join(', ') || 'Sin detalle';
	}

	function formatDate(dateString) {
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

	onMount(() => {
		try {
			dbInstance = getActiveDb();
			if (!dbInstance) setFeedback('No hay ninguna base de datos activa.', 'warning');
			else loadPeopleAndPrices();
		} catch (error) {
			setFeedback(error.message, 'error');
		}

		const handleDbChange = () => {
			dbInstance = getActiveDb();
			loadPeopleAndPrices();
		};
		window.addEventListener('database-changed', handleDbChange);
		window.addEventListener('database-updated', handleDbChange);
		return () => {
			window.removeEventListener('database-changed', handleDbChange);
			window.removeEventListener('database-updated', handleDbChange);
		};
	});
</script>

{#if feedback.message}<p class="status-banner {feedback.type}">{feedback.message}</p>{/if}
{#if dbInstance}
<div class="flex-header">
	<h1>{m.coffee_shop()}</h1>
	<div class="top-actions">
		<LinkButton href="/settings/app" icon={mdiCog} label={m.coffee_prices()} />
		<LinkButton href="/coffee_shop/_kitchen" icon={mdiMonitor} label={m.coffee_kds()} />
		<LinkButton
			href="/coffee_shop/_new"
			icon={mdiPlus}
			label={m.new_coffee_order()}
			background="darkolivegreen"
		/>
	</div>
</div>

	<DataTable
		{dbInstance}
		startkey={COFFEE_PREFIX}
		endkey={`${COFFEE_PREFIX}\uffff`}
		groupByFields={[{ label: m.status(), key: 'Estado' }]}
		{columns}
		{searchFields}
		{filterFields}
		{sortByFields}
	>
		{#snippet rowSnippet(order)}
			<DataListRow>
				{#snippet icon()}
					{#await dbInstance.get( order.Persona.startsWith('personas:') ? order.Persona : `personas:${order.Persona}`, { attachments: true } ) then persona}
						{#if persona._attachments && persona._attachments.foto && persona._attachments.foto.data}
							<img
								src={'data:' +
									persona._attachments.foto.content_type +
									';base64,' +
									persona._attachments.foto.data}
								alt={persona.data.Nombre || 'Desconocido'}
								width="70"
							/>
						{:else}
							<img src={genericAvatar} alt={persona.data.Nombre || 'Desconocido'} width="70" />
						{/if}
					{:catch error}
						<SvgIcon path={mdiPencil} type="mdi" size="70px" />
					{/await}
					<b>{personName(order)}</b>
				{/snippet}
				{#snippet content()}
					<div class="dl-field" role="cell">
						<small>{m.date()}</small>
						{formatDate(order.Fecha) || '-'}
					</div>
					<div class="dl-field" role="cell">
						<small>{m.coffee_order()}</small>
						<span>{orderSummary(order)}</span>
					</div>
					<div class="dl-field" role="cell">
						<small>{m.price()}</small>
						{(calculateOrderPrice(parseOrder(order.Comanda), prices) / 100).toFixed(2)} €
					</div>
				{/snippet}
				{#snippet actions()}
					<a
						class="button mini-btn"
						href={`/coffee_shop/${encodeURIComponent(order._id.replace(COFFEE_PREFIX, ''))}`}
						aria-label={m.edit()}
					>
						<SvgIcon path={mdiPencil} type="mdi" size="1.75em" />
					</a>
					<button
						class="button danger mini-btn"
						onclick={() => deleteOrder(order)}
						aria-label={m.delete()}
					>
						<SvgIcon path={mdiDelete} type="mdi" size="1.75em" />
					</button>
				{/snippet}
			</DataListRow>
		{/snippet}
	</DataTable>
{:else}
	<div class="no-db-warning">
		Configura una base de datos activa en
		<a href="/settings/database"> Ajustes de Base de Datos </a>.
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	:global(tr.debt) {
		background: #f5d3ff;
	}
	:global(tr.ready) {
		background: #fff0a8;
	}
	:global(td.actions) {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.status-banner,
	.no-db-warning {
		padding: 12px;
		border-radius: 5px;
		margin-bottom: 15px;
	}
	.status-banner.warning,
	.no-db-warning {
		background: #fff4cc;
		color: #5b4200;
	}
	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}
</style>
