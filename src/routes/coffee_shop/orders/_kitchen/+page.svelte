<script>
	import { onMount } from 'svelte';
	import { getActiveDb } from '$lib/db';
	import { mdiArrowLeft, mdiCoffee, mdiDelete, mdiPencil } from '@mdi/js';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import CoffeeOrderLayers from '$lib/comp/coffee/CoffeeOrderLayers.svelte';
	import { COFFEE_PREFIX, ORDER_STATES, parseOrder } from '$lib/coffee';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte5-toaster';

	let dbInstance = $state(null);
	let orders = $state([]);
	let people = $state({});
	let loading = $state(true);
	let changesFeed = $state(null);

	function personFor(order) {
		return people[order.Persona] || {};
	}

	function personName(order) {
		return personFor(order).Nombre || order.Persona || 'Persona desconocida';
	}

	function orderDetails(order) {
		return parseOrder(order.Comanda);
	}

	function normalizeOrder(doc) {
		return {
			...(doc.data || doc),
			_id: doc._id,
			_rev: doc._rev
		};
	}

	function isCoffeeOrder(id) {
		return id?.startsWith(COFFEE_PREFIX);
	}

	function sortOrders(items) {
		return items.sort((a, b) => String(b.Fecha || '').localeCompare(String(a.Fecha || '')));
	}

	async function loadData() {
		if (!dbInstance) return;
		loading = true;
		try {
			const [orderResult, peopleResult] = await Promise.all([
				dbInstance.allDocs({
					startkey: COFFEE_PREFIX,
					endkey: `${COFFEE_PREFIX}\uffff`,
					include_docs: true
				}),
				dbInstance.allDocs({
					startkey: 'personas:',
					endkey: 'personas:\uffff',
					include_docs: true
				})
			]);

			people = Object.fromEntries(
				peopleResult.rows.map((row) => {
					const data = row.doc?.data || row.doc || {};
					return [row.doc._id.replace(/^personas:/, ''), data];
				})
			);
			orders = sortOrders(
				orderResult.rows
					.map((row) => normalizeOrder(row.doc))
					.filter((order) => isCoffeeOrder(order._id))
			);
		} catch (error) {
			toast.error(`Error al cargar la pantalla de cocina: ${error.message}`);
		} finally {
			loading = false;
		}
	}

	function stopChangesFeed() {
		if (!changesFeed) return;
		try {
			changesFeed.cancel();
		} catch {}
		changesFeed = null;
	}

	function startChangesFeed() {
		stopChangesFeed();
		if (!dbInstance) return;

		changesFeed = dbInstance
			.changes({ since: 'now', live: true, retry: true, include_docs: true })
			.on('change', (change) => {
				if (isCoffeeOrder(change.id)) {
					if (change.deleted) {
						orders = orders.filter((order) => order._id !== change.id);
					} else if (change.doc) {
						const normalized = normalizeOrder(change.doc);
						const index = orders.findIndex((order) => order._id === normalized._id);
						orders = sortOrders(
							index === -1
								? [...orders, normalized]
								: orders.map((order, itemIndex) => (itemIndex === index ? normalized : order))
						);
					}
				} else if (change.id?.startsWith('personas:')) {
					loadData();
				}
			})
			.on('error', (error) => {
				toast.error(`Error en la actualización realtime: ${error.message}`);
			});
	}

	async function updateState(order, state) {
		try {
			const { _id, _rev, ...data } = order;
			await dbInstance.put({ _id, _rev, data: { ...data, Estado: state } });
		} catch (error) {
			toast.error(`Error al actualizar la comanda: ${error.message}`);
		}
	}

	async function deleteOrder(order) {
		if (!confirm(`¿Eliminar la comanda de ${personName(order)}?`)) return;
		try {
			await dbInstance.remove({ _id: order._id, _rev: order._rev });
		} catch (error) {
			toast.error(`Error al eliminar la comanda: ${error.message}`);
		}
	}

	onMount(() => {
		const initialize = async () => {
			try {
				dbInstance = getActiveDb();
				if (!dbInstance) toast.warning('No hay ninguna base de datos activa.');
				else {
					await loadData();
					startChangesFeed();
				}
			} catch (error) {
				toast.error(error.message);
				loading = false;
			}
		};
		initialize();

		const handleDbChange = () => {
			stopChangesFeed();
			dbInstance = getActiveDb();
			if (dbInstance) {
				loadData().then(startChangesFeed);
			}
		};
		window.addEventListener('database-changed', handleDbChange);
		window.addEventListener('database-updated', handleDbChange);
		return () => {
			stopChangesFeed();
			window.removeEventListener('database-changed', handleDbChange);
			window.removeEventListener('database-updated', handleDbChange);
		};
	});
</script>

<svelte:head><title>Cocina | Cafetería</title></svelte:head>

<main>
	{#if !dbInstance}
		<div class="empty-state">
			Configura una base de datos activa en <a href="/settings/database">Ajustes de Base de Datos</a
			>.
		</div>
	{:else if loading}
		<p class="empty-state">Cargando comandas...</p>
	{:else if orders.length === 0}
		<p class="empty-state">No hay comandas.</p>
	{:else}
		<section class="kitchen-grid" aria-label="Comandas de cocina">
			{#each orders as order}
				{@const details = orderDetails(order)}
				{@const person = personFor(order)}
				<details
					class="order-card status-{(order.Estado || 'Pedido').toLowerCase().replaceAll(' ', '-')}"
				>
					<summary>
						<CoffeeOrderLayers order={details} size={168} />
						<span class="summary-copy">
							<strong>{personName(order)}</strong>
							<span>{person.Region || 'Sin aula'}</span>
							<span>{order.Fecha || 'Sin fecha'} · {order.Estado || 'Pedido'}</span>
						</span>
					</summary>

					<div class="order-content">
						<div class="detail-heading">
							<span class="state-pill">{order.Estado || 'Pedido'}</span>
						</div>
						<dl>
							{#each Object.entries(details) as [key, value]}
								<dt>{key}</dt>
								<dd>{value}</dd>
							{/each}
							{#if order.Notas}<dt>Notas</dt>
								<dd>{order.Notas}</dd>{/if}
						</dl>
						<div class="card-actions">
							<label
								><span>Estado</span><select
									value={order.Estado || 'Pedido'}
									onchange={(event) => updateState(order, event.currentTarget.value)}
									>{#each ORDER_STATES as state}<option value={state}>{state}</option
										>{/each}</select
								></label
							>
						</div>
                        <div class="action-links">
                            <a
                                class="icon-button"
                                href={`/coffee_shop/orders/${encodeURIComponent(order._id.replace(COFFEE_PREFIX, ''))}`}
                                aria-label={m.edit()}
                                title={m.edit()}><SvgIcon path={mdiPencil} type="mdi" size="1.1em" /></a
                            >
                            <button
                                class="icon-button danger"
                                type="button"
                                onclick={() => deleteOrder(order)}
                                aria-label={m.delete()}
                                title={m.delete()}
                                ><SvgIcon path={mdiDelete} type="mdi" size="1.1em" /></button
                            >
                        </div>
					</div>
				</details>
			{/each}
		</section>
	{/if}
</main>

<style>
	.kitchen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 16px;
		align-items: start;
	}
	.order-card {
		overflow: hidden;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 4px 14px #0f172a18;
	}
	.order-card summary {
		display: grid;
		grid-template-rows: 168px minmax(0, 1fr) auto;
        justify-items: center;
		align-items: center;
		gap: 12px;
		padding: 12px;
		cursor: pointer;
		list-style: none;
	}
	.order-card summary::-webkit-details-marker {
		display: none;
	}
	.summary-copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 5px;
	}
	.summary-copy strong {
		font-size: 1.2rem;
		overflow-wrap: anywhere;
	}
	.summary-copy span {
		color: #334155;
		overflow-wrap: anywhere;
	}
	.summary-copy span:last-child {
		font-size: 0.85rem;
		font-weight: 600;
	}
	.summary-chevron {
		align-self: start;
		font-size: 24px;
		line-height: 1;
	}
	.order-content {
		padding: 0 16px 16px;
		border-top: 1px solid #0002;
	}
	.detail-heading {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 12px;
		padding-top: 14px;
	}
	.detail-heading h2 {
		margin: 2px 0 12px;
		font-size: 1.15rem;
	}
	.eyebrow {
		color: #475569;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.state-pill {
		padding: 5px 8px;
		border: 1px solid #0003;
		border-radius: 999px;
		background: #ffffffaa;
		font-size: 0.78rem;
		font-weight: 700;
		white-space: nowrap;
	}
	dl {
		display: flex;
        flex-direction: column;
		gap: 6px 12px;
		margin: 0;
	}
	dt {
		color: #475569;
		font-size: 0.82rem;
		font-weight: 700;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
        margin-left: 15px;
	}
	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 12px;
		margin-top: 18px;
	}
	.card-actions label {
		display: grid;
		gap: 4px;
		margin: 0;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 700;
	}
	.card-actions select {
		min-width: 145px;
		width: auto;
	}
	.action-links {
		display: flex;
		gap: 6px;
	}
	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid #94a3b8;
		border-radius: 4px;
		background: #fff;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
        padding: 0;
	}
	.icon-button:hover {
		background: #e0ecff;
	}
	.icon-button.danger {
		color: #9f1a1a;
	}
	.status-Pedido {
		background: #fff;
	}
	.status-en-preparación {
		background: #ffd8d8;
	}
	.status-listo {
		background: #ffe88a;
	}
	.status-entregado {
		background: #c9f4d0;
	}
	.status-deuda {
		background: #f0d5fa;
	}
	.status-banner,
	.empty-state {
		padding: 12px;
		border-radius: 5px;
		margin-bottom: 15px;
	}
	.status-banner.warning,
	.empty-state {
		background: #fff4cc;
		color: #5b4200;
	}
	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}
	@media (max-width: 620px) {
		.order-card summary {
			grid-template-rows: 120px minmax(0, 1fr) auto;
		}
		.order-card summary :global(.layers) {
			width: 120px !important;
			height: 120px !important;
		}
	}
    main{
        max-width: none;
    }
</style>
